import { applyPreset, type Preset } from "./xmp";

export const isJpg = (name: string) => /\.(jpe?g)$/i.test(name);

/** Decodes once and returns an analysis-size JPEG and a small thumbnail. */
export async function prepareImage(file: File, needAnalysis: boolean) {
  const bmp = await createImageBitmap(file);
  const draw = (max: number) => {
    const s = Math.min(1, max / Math.max(bmp.width, bmp.height));
    const c = document.createElement("canvas");
    c.width = Math.round(bmp.width * s);
    c.height = Math.round(bmp.height * s);
    const ctx = c.getContext("2d")!;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(bmp, 0, 0, c.width, c.height);
    return c;
  };
  const analysis = needAnalysis ? draw(1600).toDataURL("image/jpeg", 0.88) : undefined;
  const thumb = draw(420).toDataURL("image/jpeg", 0.75);
  bmp.close();
  return { analysis, thumb };
}

/** Full-resolution output. Without a preset the original bytes are kept untouched. */
export async function renderOutput(file: File, preset: Preset | null): Promise<Blob> {
  if (!preset) return file;
  const bmp = await createImageBitmap(file);
  const c = document.createElement("canvas");
  c.width = bmp.width;
  c.height = bmp.height;
  const ctx = c.getContext("2d", { willReadFrequently: true })!;
  ctx.drawImage(bmp, 0, 0);
  bmp.close();
  const img = ctx.getImageData(0, 0, c.width, c.height);
  applyPreset(img.data, preset);
  ctx.putImageData(img, 0, 0);
  return new Promise((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error("Falha ao exportar"))), "image/jpeg", 0.98));
}

// ---- File System Access (Chrome/Edge) ----
type DirHandle = {
  name: string;
  values: () => AsyncIterable<{ kind: string; name: string; getFile?: () => Promise<File> }>;
  getDirectoryHandle: (n: string, o?: { create: boolean }) => Promise<DirHandle>;
  getFileHandle: (n: string, o?: { create: boolean }) => Promise<{ createWritable: () => Promise<{ write: (b: Blob) => Promise<void>; close: () => Promise<void> }> }>;
};
export type { DirHandle };

export const fsSupported = () => typeof window !== "undefined" && "showDirectoryPicker" in window;

export async function pickDir(mode: "read" | "readwrite"): Promise<DirHandle> {
  const w = window as unknown as { showDirectoryPicker: (o: { mode: string }) => Promise<DirHandle> };
  return w.showDirectoryPicker({ mode });
}

export async function listJpgs(dir: DirHandle): Promise<{ name: string; getFile: () => Promise<File> }[]> {
  const out: { name: string; getFile: () => Promise<File> }[] = [];
  for await (const entry of dir.values()) {
    if (entry.kind === "file" && isJpg(entry.name) && entry.getFile) {
      out.push({ name: entry.name, getFile: entry.getFile.bind(entry) });
    }
  }
  return out;
}

export async function writeToDir(dir: DirHandle, sub: string, name: string, blob: Blob) {
  const d = await dir.getDirectoryHandle(sub, { create: true });
  const fh = await d.getFileHandle(name, { create: true });
  const w = await fh.createWritable();
  await w.write(blob);
  await w.close();
}
