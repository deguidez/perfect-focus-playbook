import { useSyncExternalStore } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { analyzePhoto } from "./analyze.functions";
import { classify, type Category, type CullSettings, type PhotoResult } from "./culling";
import type { Preset } from "./xmp";
import { isJpg, listJpgs, prepareImage, renderOutput, writeToDir, type DirHandle } from "./images";

export type Result = PhotoResult & { notes?: string | null };
export type Item = {
  name: string;
  file: File;
  thumb?: string | undefined;
  status: "pending" | "analyzing" | "done" | "error";
  result?: Result | undefined;
  error?: string | undefined;
  exported?: Category | undefined;
};
export type SessionConfig = CullSettings & { preset: Preset | null; autoExposure: boolean };
export type SessionState = {
  items: Record<string, Item>;
  paused: string | null;
  inDir: DirHandle | null;
  outDir: DirHandle | null;
  autoExport: boolean;
};

const CONCURRENCY = 4;
const POLL_MS = 4000;

/** Lives outside React so analysis, folder watching and export keep running while the user navigates the app. */
export class AlbumSession {
  state: SessionState = { items: {}, paused: null, inDir: null, outDir: null, autoExport: true };
  config: SessionConfig | null = null;
  private known = new Map<string, Result>();
  private knownP: Promise<void> | null = null;
  private queue: string[] = [];
  private running = 0;
  private exporting = new Set<string>();
  private exportChain: Promise<void> = Promise.resolve();
  private listeners = new Set<() => void>();
  private scanToken = 0;

  constructor(public albumId: string) {}

  subscribe = (fn: () => void) => {
    this.listeners.add(fn);
    return () => void this.listeners.delete(fn);
  };
  getState = () => this.state;

  get busy() {
    return this.queue.length > 0 || this.running > 0 || this.exporting.size > 0 || !!this.state.inDir;
  }

  private set(patch: Partial<SessionState>) {
    this.state = { ...this.state, ...patch };
    this.listeners.forEach((l) => l());
  }
  private update(name: string, patch: Partial<Item>) {
    const cur = this.state.items[name];
    if (cur) this.set({ items: { ...this.state.items, [name]: { ...cur, ...patch } } });
  }
  private loadKnown() {
    return (this.knownP ??= (async () => {
      const { data } = await supabase.from("photo_results").select("*").eq("album_id", this.albumId);
      for (const r of data ?? []) this.known.set(r.file_name, r as Result);
    })());
  }

  setConfig(c: SessionConfig) {
    this.config = c;
    this.drainExports();
  }

  async addFiles(files: File[]) {
    await this.loadKnown();
    const fresh = files.filter((f) => isJpg(f.name) && !this.state.items[f.name]);
    if (!fresh.length) return;
    const next: Record<string, Item> = {};
    for (const f of fresh) {
      const prev = this.known.get(f.name);
      next[f.name] = { name: f.name, file: f, status: prev ? "done" : "pending", result: prev };
    }
    this.set({ items: { ...this.state.items, ...next } });
    for (const f of fresh) {
      if (this.known.has(f.name)) prepareImage(f, false).then((p) => this.update(f.name, { thumb: p.thumb })).catch(() => {});
      else this.queue.push(f.name);
    }
    this.pump();
    this.drainExports();
  }

  resume() {
    this.set({ paused: null });
    this.pump();
  }

  private pump() {
    while (this.running < CONCURRENCY && this.queue.length && !this.state.paused) {
      const name = this.queue.shift()!;
      const item = this.state.items[name];
      if (!item) continue;
      this.running++;
      this.update(name, { status: "analyzing" });
      void this.analyzeOne(name, item.file).finally(() => {
        this.running--;
        this.pump();
      });
    }
  }

  private async analyzeOne(name: string, file: File) {
    try {
      const prepared = await prepareImage(file, true);
      this.update(name, { thumb: prepared.thumb });
      for (let attempt = 0; ; ) {
        try {
          const r = await analyzePhoto({ data: { albumId: this.albumId, fileName: name, image: prepared.analysis! } });
          this.known.set(name, r);
          this.update(name, { status: "done", result: r });
          this.drainExports();
          return;
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          if ((msg.startsWith("AI_429") || /AI_5\d\d/.test(msg)) && attempt < 3) {
            attempt++;
            await new Promise((r) => setTimeout(r, 1500 * 2 ** attempt + Math.random() * 500));
            continue;
          }
          if (msg.startsWith("AI_402") || msg.startsWith("AI_403")) {
            this.set({ paused: msg.startsWith("AI_402") ? "Créditos de IA esgotados. Adicione créditos e clique em continuar." : "Acesso à IA bloqueado no workspace." });
            this.queue.unshift(name);
            this.update(name, { status: "pending" });
            return;
          }
          throw err;
        }
      }
    } catch (err) {
      this.update(name, { status: "error", error: err instanceof Error ? err.message.replace(/^AI_\w+: /, "") : "Erro" });
    }
  }

  watch(dir: DirHandle) {
    const token = ++this.scanToken;
    this.set({ inDir: dir });
    const scan = async () => {
      if (token !== this.scanToken) return;
      try {
        const entries = await listJpgs(dir);
        const newOnes = entries.filter((e) => !this.state.items[e.name]);
        if (newOnes.length) await this.addFiles(await Promise.all(newOnes.map((e) => e.getFile())));
      } catch {
        /* folder temporarily unavailable */
      }
      if (token === this.scanToken) setTimeout(scan, POLL_MS);
    };
    void scan();
  }

  stopWatching() {
    this.scanToken++;
    this.set({ inDir: null });
  }

  setOutDir(dir: DirHandle) {
    const items = Object.fromEntries(Object.entries(this.state.items).map(([k, v]) => [k, { ...v, exported: undefined }]));
    this.set({ items, outDir: dir });
    this.drainExports();
  }

  setAutoExport(v: boolean) {
    this.set({ autoExport: v });
    this.drainExports();
  }

  renderOptionsFor(cat: Category) {
    const c = this.config;
    return cat === "boas" && c ? { preset: c.preset, autoExposure: c.autoExposure } : null;
  }

  private drainExports() {
    const { outDir, autoExport, items } = this.state;
    if (!outDir || !autoExport || !this.config) return;
    for (const it of Object.values(items)) {
      if (it.status !== "done" || it.exported || this.exporting.has(it.name)) continue;
      this.exporting.add(it.name);
      this.exportChain = this.exportChain.then(async () => {
        try {
          const cur = this.state.items[it.name];
          if (!cur?.result || !this.config || this.state.outDir !== outDir) return;
          const cat = classify(cur.result, this.config);
          await writeToDir(outDir, cat, cur.name, await renderOutput(cur.file, this.renderOptionsFor(cat)));
          this.update(cur.name, { exported: cat });
        } catch {
          toast.error(`Falha ao gravar ${it.name}`);
        } finally {
          this.exporting.delete(it.name);
        }
      });
    }
  }
}

const sessions = new Map<string, AlbumSession>();

export function getAlbumSession(albumId: string) {
  let s = sessions.get(albumId);
  if (!s) sessions.set(albumId, (s = new AlbumSession(albumId)));
  return s;
}

export function busySessions() {
  return [...sessions.values()].filter((s) => s.busy);
}

if (typeof window !== "undefined") {
  window.addEventListener("beforeunload", (e) => {
    if (busySessions().length) e.preventDefault();
  });
}

const EMPTY: SessionState = { items: {}, paused: null, inDir: null, outDir: null, autoExport: true };

export function useAlbumSession(albumId: string) {
  const s = getAlbumSession(albumId);
  const state = useSyncExternalStore(s.subscribe, s.getState, () => EMPTY);
  return [s, state] as const;
}
