import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { applyPreset, EMPTY_PRESET, serializeXmp, type Preset } from "@/lib/xmp";

type Key = Exclude<keyof Preset, "curve">;
const CONTROLS: { key: Key; label: string; min: number; max: number; step: number }[] = [
  { key: "exposure", label: "Exposição", min: -3, max: 3, step: 0.05 },
  { key: "contrast", label: "Contraste", min: -100, max: 100, step: 1 },
  { key: "highlights", label: "Realces", min: -100, max: 100, step: 1 },
  { key: "shadows", label: "Sombras", min: -100, max: 100, step: 1 },
  { key: "whites", label: "Brancos", min: -100, max: 100, step: 1 },
  { key: "blacks", label: "Pretos", min: -100, max: 100, step: 1 },
  { key: "temperature", label: "Temperatura", min: -100, max: 100, step: 1 },
  { key: "tint", label: "Matiz", min: -100, max: 100, step: 1 },
  { key: "vibrance", label: "Vibração", min: -100, max: 100, step: 1 },
  { key: "saturation", label: "Saturação", min: -100, max: 100, step: 1 },
];

export function PresetEditor({
  open,
  onOpenChange,
  initial,
  initialName,
  samples,
  onSave,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initial: Preset | null;
  initialName: string | null;
  samples: string[];
  onSave: (xmp: string, name: string) => void;
}) {
  const [p, setP] = useState<Preset>(initial ?? EMPTY_PRESET);
  const [name, setName] = useState(initialName ?? "Meu preset");
  const [sample, setSample] = useState(0);
  const [before, setBefore] = useState(false);
  const canvas = useRef<HTMLCanvasElement>(null);
  const source = useRef<ImageData | null>(null);

  useEffect(() => {
    if (open) {
      setP(initial ?? EMPTY_PRESET);
      setName(initialName ?? "Meu preset");
    }
  }, [open, initial, initialName]);

  // load sample pixels once per photo
  useEffect(() => {
    const src = samples[sample];
    if (!open || !src) return;
    const img = new Image();
    img.onload = () => {
      const c = canvas.current;
      if (!c) return;
      c.width = img.width;
      c.height = img.height;
      const ctx = c.getContext("2d", { willReadFrequently: true })!;
      ctx.drawImage(img, 0, 0);
      source.current = ctx.getImageData(0, 0, c.width, c.height);
      draw();
    };
    img.src = src;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, sample, samples]);

  const draw = () => {
    const c = canvas.current;
    const src = source.current;
    if (!c || !src) return;
    const out = new ImageData(new Uint8ClampedArray(src.data), src.width, src.height);
    if (!before) applyPreset(out.data, p);
    c.getContext("2d")!.putImageData(out, 0, 0);
  };
  useEffect(draw, [p, before]);

  function download() {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([serializeXmp(p, name)], { type: "application/xml" }));
    a.download = `${name || "preset"}.xmp`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl">
        <DialogHeader>
          <DialogTitle>Criar preset</DialogTitle>
        </DialogHeader>
        <div className="grid gap-6 md:grid-cols-[1fr_280px]">
          <div className="space-y-2">
            <div className="flex aspect-[3/2] items-center justify-center overflow-hidden rounded-md bg-muted">
              {samples.length ? (
                <canvas ref={canvas} className="max-h-full max-w-full object-contain" />
              ) : (
                <p className="p-6 text-center text-sm text-muted-foreground">Adicione fotos ao álbum para ver a prévia.</p>
              )}
            </div>
            {samples.length > 0 && (
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <button
                  className="underline"
                  onPointerDown={() => setBefore(true)}
                  onPointerUp={() => setBefore(false)}
                  onPointerLeave={() => setBefore(false)}
                >
                  segure para ver o antes
                </button>
                <div className="flex items-center gap-2 font-mono">
                  <button onClick={() => setSample((s) => (s - 1 + samples.length) % samples.length)}>‹</button>
                  {sample + 1}/{samples.length}
                  <button onClick={() => setSample((s) => (s + 1) % samples.length)}>›</button>
                </div>
              </div>
            )}
          </div>
          <div className="max-h-[65vh] space-y-4 overflow-y-auto pr-1">
            <div>
              <Label>Nome</Label>
              <Input className="mt-1" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            {CONTROLS.map((c) => (
              <div key={c.key}>
                <div className="flex justify-between text-sm">
                  <Label onDoubleClick={() => setP({ ...p, [c.key]: 0 })}>{c.label}</Label>
                  <span className="font-mono text-xs text-primary">
                    {p[c.key] > 0 ? "+" : ""}
                    {c.key === "exposure" ? p[c.key].toFixed(2) : p[c.key]}
                  </span>
                </div>
                <Slider className="mt-2" min={c.min} max={c.max} step={c.step} value={[p[c.key]]} onValueChange={([v]) => setP({ ...p, [c.key]: v ?? 0 })} />
              </div>
            ))}
            <p className="text-xs text-muted-foreground">Dê dois cliques no nome de um ajuste para zerá-lo.</p>
          </div>
        </div>
        <div className="flex flex-wrap justify-end gap-2">
          <Button variant="ghost" onClick={() => setP(EMPTY_PRESET)}>Zerar tudo</Button>
          <Button variant="secondary" onClick={download}>Baixar .xmp</Button>
          <Button onClick={() => onSave(serializeXmp(p, name), name || "Meu preset")}>Salvar no álbum</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
