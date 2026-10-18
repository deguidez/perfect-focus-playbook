import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import JSZip from "jszip";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { analyzePhoto } from "@/server/analyze.functions";
import { CATEGORIES, classify, type Category, type CullSettings, type PhotoResult } from "@/lib/culling";
import { parseXmp } from "@/lib/xmp";
import { fsSupported, isJpg, listJpgs, pickDir, prepareImage, renderOutput, writeToDir, type DirHandle } from "@/lib/images";

export const Route = createFileRoute("/_authenticated/albums/$albumId")({
  head: () => ({
    meta: [
      { title: "Álbum — FocoAI" },
      { name: "description", content: "Seleção de fotos com IA." },
      { property: "og:title", content: "Álbum — FocoAI" },
      { property: "og:description", content: "Seleção de fotos com IA." },
    ],
  }),
  component: AlbumPage,
});

const CONCURRENCY = 4;
const POLL_MS = 4000;

type Album = CullSettings & { id: string; name: string; preset_name: string | null; preset_xmp: string | null };
type Item = {
  name: string;
  file: File;
  thumb?: string | undefined;
  status: "pending" | "analyzing" | "done" | "error";
  result?: (PhotoResult & { notes?: string | null }) | undefined;
  error?: string | undefined;
  exported?: Category | undefined;
};

function AlbumPage() {
  const { albumId } = Route.useParams();
  const analyze = useServerFn(analyzePhoto);
  const [album, setAlbum] = useState<Album | null>(null);
  const [items, setItems] = useState<Record<string, Item>>({});
  const [filter, setFilter] = useState<Category | "all">("all");
  const [inDir, setInDir] = useState<DirHandle | null>(null);
  const [outDir, setOutDir] = useState<DirHandle | null>(null);
  const [autoExport, setAutoExport] = useState(true);
  const [paused, setPaused] = useState<string | null>(null);
  const [exporting, setExporting] = useState<{ done: number; total: number } | null>(null);

  const known = useRef<Map<string, PhotoResult & { notes?: string | null }>>(new Map());
  const queue = useRef<string[]>([]);
  const running = useRef(0);
  const inFlight = useRef<Set<string>>(new Set());
  const itemsRef = useRef(items);
  itemsRef.current = items;
  const pausedRef = useRef(paused);
  pausedRef.current = paused;

  // ---- load album + previous results ----
  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.from("albums").select("*").eq("id", albumId).single();
      if (error) { toast.error("Álbum não encontrado"); return; }
      setAlbum(data as Album);
      const { data: rows } = await supabase.from("photo_results").select("*").eq("album_id", albumId);
      for (const r of rows ?? []) known.current.set(r.file_name, r);
    })();
  }, [albumId]);

  const settings: CullSettings | null = album;
  const preset = useMemo(() => (album?.preset_xmp ? parseXmp(album.preset_xmp) : null), [album?.preset_xmp]);

  const update = (name: string, patch: Partial<Item>) =>
    setItems((prev) => (prev[name] ? { ...prev, [name]: { ...prev[name], ...patch } } : prev));

  async function saveAlbum(patch: Partial<Album>) {
    setAlbum((a) => (a ? { ...a, ...patch } : a));
    const { error } = await supabase.from("albums").update(patch).eq("id", albumId);
    if (error) toast.error(error.message);
  }

  // ---- analysis queue ----
  const pump = useCallback(() => {
    while (running.current < CONCURRENCY && queue.current.length && !pausedRef.current) {
      const name = queue.current.shift()!;
      const item = itemsRef.current[name];
      if (!item) continue;
      running.current++;
      update(name, { status: "analyzing" });
      (async () => {
        try {
          const prepared = await prepareImage(item.file, true);
          update(name, { thumb: prepared.thumb });
          let attempt = 0;
          for (;;) {
            try {
              const r = await analyze({ data: { albumId, fileName: name, image: prepared.analysis! } });
              known.current.set(name, r);
              update(name, { status: "done", result: r });
              break;
            } catch (err) {
              const msg = err instanceof Error ? err.message : String(err);
              if ((msg.startsWith("AI_429") || /AI_5\d\d/.test(msg)) && attempt < 3) {
                attempt++;
                await new Promise((r) => setTimeout(r, 1500 * 2 ** attempt + Math.random() * 500));
                continue;
              }
              if (msg.startsWith("AI_402") || msg.startsWith("AI_403")) {
                setPaused(msg.startsWith("AI_402") ? "Créditos de IA esgotados. Adicione créditos e clique em continuar." : "Acesso à IA bloqueado no workspace.");
                queue.current.unshift(name);
                update(name, { status: "pending" });
                return;
              }
              throw err;
            }
          }
        } catch (err) {
          update(name, { status: "error", error: err instanceof Error ? err.message.replace(/^AI_\w+: /, "") : "Erro" });
        } finally {
          running.current--;
          pump();
        }
      })();
    }
  }, [albumId, analyze]);

  const addFiles = useCallback(
    async (files: File[]) => {
      const fresh = files.filter((f) => isJpg(f.name) && !itemsRef.current[f.name]);
      if (!fresh.length) return;
      const next: Record<string, Item> = {};
      for (const f of fresh) {
        const prev = known.current.get(f.name);
        next[f.name] = { name: f.name, file: f, status: prev ? "done" : "pending", result: prev };
      }
      setItems((p) => ({ ...p, ...next }));
      itemsRef.current = { ...itemsRef.current, ...next };
      for (const f of fresh) {
        if (known.current.has(f.name)) {
          prepareImage(f, false).then((p) => update(f.name, { thumb: p.thumb })).catch(() => {});
        } else queue.current.push(f.name);
      }
      pump();
    },
    [pump],
  );

  // ---- folder watching ----
  useEffect(() => {
    if (!inDir) return;
    let stop = false;
    const scan = async () => {
      try {
        const entries = await listJpgs(inDir);
        const newOnes = entries.filter((e) => !itemsRef.current[e.name]);
        if (newOnes.length) await addFiles(await Promise.all(newOnes.map((e) => e.getFile())));
      } catch {
        /* folder temporarily unavailable */
      }
      if (!stop) setTimeout(scan, POLL_MS);
    };
    scan();
    return () => {
      stop = true;
    };
  }, [inDir, addFiles]);

  // ---- export ----
  const exportOne = useCallback(
    async (item: Item, dir: DirHandle) => {
      if (!settings || !item.result) return;
      const cat = classify(item.result, settings);
      const blob = await renderOutput(item.file, cat === "boas" ? preset : null);
      await writeToDir(dir, cat, item.name, blob);
      update(item.name, { exported: cat });
    },
    [settings, preset],
  );

  // auto export to output folder as photos finish
  useEffect(() => {
    if (!outDir || !autoExport || !settings) return;
    const pending = Object.values(items).filter((i) => i.status === "done" && !i.exported && !inFlight.current.has(i.name));
    if (!pending.length) return;
    pending.forEach((i) => inFlight.current.add(i.name));
    (async () => {
      for (const it of pending) {
        try {
          await exportOne(it, outDir);
        } catch {
          toast.error(`Falha ao gravar ${it.name}`);
        } finally {
          inFlight.current.delete(it.name);
        }
      }
    })();
  }, [items, outDir, autoExport, settings, exportOne]);

  async function chooseIn() {
    if (!fsSupported()) { toast.error("Use Chrome ou Edge para monitorar pastas."); return; }
    try {
      setInDir(await pickDir("read"));
    } catch (e) {
      if ((e as Error).name !== "AbortError") toast.error("Abra o app em uma nova aba para acessar pastas do PC.");
    }
  }
  async function chooseOut() {
    if (!fsSupported()) { toast.error("Use Chrome ou Edge para exportar para pastas."); return; }
    try {
      const d = await pickDir("readwrite");
      setItems((p) => Object.fromEntries(Object.entries(p).map(([k, v]) => [k, { ...v, exported: undefined }])));
      setOutDir(d);
    } catch (e) {
      if ((e as Error).name !== "AbortError") toast.error("Abra o app em uma nova aba para acessar pastas do PC.");
    }
  }

  async function downloadZip() {
    if (!settings) return;
    const done = Object.values(items).filter((i) => i.result);
    if (!done.length) { toast.error("Nenhuma foto analisada"); return; }
    const zip = new JSZip();
    setExporting({ done: 0, total: done.length });
    for (let i = 0; i < done.length; i++) {
      const it = done[i]!;
      const cat = classify(it.result!, settings);
      zip.file(`${cat}/${it.name}`, await renderOutput(it.file, cat === "boas" ? preset : null), { compression: "STORE" });
      setExporting({ done: i + 1, total: done.length });
    }
    const blob = await zip.generateAsync({ type: "blob", compression: "STORE" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${album?.name ?? "fotos"}.zip`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 10000);
    setExporting(null);
  }

  async function uploadPreset(file: File) {
    const text = await file.text();
    if (!text.includes("crs:")) { toast.error("Arquivo não parece um preset do Lightroom (.xmp)"); return; }
    await saveAlbum({ preset_xmp: text, preset_name: file.name.replace(/\.xmp$/i, "") });
    toast.success("Preset carregado — aplicado nas fotos boas ao exportar");
  }

  const list = Object.values(items);
  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    if (settings) for (const i of list) if (i.result) c[classify(i.result, settings)] = (c[classify(i.result, settings)] ?? 0) + 1;
    return c;
  }, [list, settings]);
  const doneCount = list.filter((i) => i.status === "done").length;
  const visible = list.filter((i) => filter === "all" || (i.result && settings && classify(i.result, settings) === filter));

  if (!album || !settings) return <div className="p-10 font-mono text-sm text-muted-foreground">carregando…</div>;

  return (
    <div className="grid min-h-[calc(100vh-3.5rem)] lg:grid-cols-[320px_1fr]">
      {/* ---- settings panel ---- */}
      <aside className="space-y-8 border-r bg-card p-6">
        <div>
          <Link to="/albums" className="text-xs text-muted-foreground">
            ← Álbuns
          </Link>
          <h1 className="mt-2 text-2xl">{album.name}</h1>
        </div>

        <section className="space-y-4">
          <h2 className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Seleção</h2>
          <div>
            <div className="flex items-center justify-between">
              <Label>Nível de foco no rosto</Label>
              <span className="font-mono text-sm text-primary">{settings.focus_threshold}</span>
            </div>
            <Slider
              className="mt-3"
              min={10}
              max={95}
              step={1}
              value={[settings.focus_threshold]}
              onValueChange={([v]) => setAlbum({ ...album, focus_threshold: v ?? 60 })}
              onValueCommit={([v]) => saveAlbum({ focus_threshold: v ?? 60 })}
            />
            <p className="mt-2 text-xs text-muted-foreground">Abaixo deste valor a foto vai para "desfocadas". Muda na hora, sem reanalisar.</p>
          </div>
          <Toggle label="Exigir atleta principal" checked={settings.require_main_subject} onChange={(v) => saveAlbum({ require_main_subject: v })} />
          <Toggle label="Separar olhos fechados" checked={settings.reject_eyes_closed} onChange={(v) => saveAlbum({ reject_eyes_closed: v })} />
          <Toggle label="Separar cabeça cortada" checked={settings.reject_head_cut} onChange={(v) => saveAlbum({ reject_head_cut: v })} />
        </section>

        <section className="space-y-3">
          <h2 className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Preset Lightroom</h2>
          <label className="block cursor-pointer rounded-md border border-dashed p-3 text-sm hover:border-primary">
            {album.preset_name ? <span className="text-primary">{album.preset_name}</span> : "Enviar arquivo .xmp"}
            <input type="file" accept=".xmp" className="hidden" onChange={(e) => e.target.files?.[0] && uploadPreset(e.target.files[0])} />
          </label>
          {album.preset_name && (
            <button className="text-xs text-muted-foreground underline" onClick={() => saveAlbum({ preset_xmp: null, preset_name: null })}>
              remover preset
            </button>
          )}
          <p className="text-xs text-muted-foreground">Aplicado nas fotos boas ao exportar. As demais saem originais.</p>
        </section>

        <section className="space-y-3">
          <h2 className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Pastas do PC</h2>
          <Button variant="secondary" className="w-full justify-start" onClick={chooseIn}>
            {inDir ? `● Monitorando: ${inDir.name}` : "Monitorar pasta de entrada"}
          </Button>
          <Button variant="secondary" className="w-full justify-start" onClick={chooseOut}>
            {outDir ? `→ Exportando para: ${outDir.name}` : "Escolher pasta de saída"}
          </Button>
          {outDir && <Toggle label="Exportar automaticamente" checked={autoExport} onChange={setAutoExport} />}
          <label className="block cursor-pointer text-center text-xs text-muted-foreground underline">
            ou enviar fotos manualmente
            <input type="file" accept="image/jpeg" multiple className="hidden" onChange={(e) => e.target.files && addFiles(Array.from(e.target.files))} />
          </label>
          <Button className="w-full" onClick={downloadZip} disabled={!!exporting}>
            {exporting ? `Gerando ZIP ${exporting.done}/${exporting.total}` : "Baixar ZIP por pastas"}
          </Button>
        </section>
      </aside>

      {/* ---- grid ---- */}
      <main className="p-6">
        {paused && (
          <div className="mb-4 flex items-center justify-between rounded-md border border-destructive p-3 text-sm">
            <span>{paused}</span>
            <Button size="sm" variant="outline" onClick={() => { setPaused(null); pausedRef.current = null; pump(); }}>
              Continuar
            </Button>
          </div>
        )}
        {list.length > 0 && (
          <div className="mb-4">
            <div className="mb-2 flex justify-between font-mono text-xs text-muted-foreground">
              <span>{doneCount}/{list.length} analisadas</span>
              <span>{list.filter((i) => i.exported).length} exportadas</span>
            </div>
            <Progress value={(doneCount / list.length) * 100} />
          </div>
        )}
        <div className="mb-5 flex flex-wrap gap-2">
          <FilterChip active={filter === "all"} onClick={() => setFilter("all")} label="Todas" count={list.length} />
          {CATEGORIES.map((c) => (
            <FilterChip key={c.id} active={filter === c.id} onClick={() => setFilter(c.id)} label={c.label} count={counts[c.id] ?? 0} dot={c.color} />
          ))}
        </div>

        {list.length === 0 ? (
          <div className="flex h-80 flex-col items-center justify-center rounded-lg border border-dashed text-center text-muted-foreground">
            <p className="text-lg text-foreground">Escolha uma pasta para monitorar</p>
            <p className="mt-1 max-w-sm text-sm">Novas fotos JPG que caírem na pasta serão analisadas e separadas automaticamente.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
            {visible.map((i) => {
              const cat = i.result ? classify(i.result, settings) : null;
              const meta = CATEGORIES.find((c) => c.id === cat);
              return (
                <figure key={i.name} className="overflow-hidden rounded-md border bg-card">
                  <div className="relative aspect-[3/2] bg-muted">
                    {i.thumb && <img src={i.thumb} alt={i.name} loading="lazy" className="h-full w-full object-cover" />}
                    {i.status === "analyzing" && <div className="absolute inset-0 animate-pulse bg-primary/20" />}
                    {meta && <span className={`absolute left-2 top-2 rounded px-1.5 py-0.5 text-[10px] font-semibold text-primary-foreground ${meta.color}`}>{meta.label}</span>}
                  </div>
                  <figcaption className="space-y-0.5 p-2 font-mono text-[11px] text-muted-foreground">
                    <p className="truncate text-foreground">{i.name}</p>
                    {i.result && <p>foco {i.result.face_sharpness} {i.result.notes ? `· ${i.result.notes}` : ""}</p>}
                    {i.status === "error" && <p className="text-destructive">{i.error}</p>}
                    {i.status === "pending" && <p>na fila</p>}
                  </figcaption>
                </figure>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between">
      <Label>{label}</Label>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

function FilterChip({ active, onClick, label, count, dot }: { active: boolean; onClick: () => void; label: string; count: number; dot?: string }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 rounded-full border px-3 py-1 text-sm transition-colors ${active ? "border-primary bg-accent text-foreground" : "text-muted-foreground hover:text-foreground"}`}
    >
      {dot && <span className={`h-2 w-2 rounded-full ${dot}`} />}
      {label}
      <span className="font-mono text-xs">{count}</span>
    </button>
  );
}
