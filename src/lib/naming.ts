/** Builds the exported file name from a pattern. Tokens: {album} {original} {n} {categoria}. Empty pattern keeps the original name. */
export function exportName(
  pattern: string | null | undefined,
  v: { album: string; original: string; n: number; category: string },
): string {
  if (!pattern?.trim()) return v.original;
  const ext = v.original.match(/\.[^.]+$/)?.[0] ?? ".jpg";
  const base = v.original.replace(/\.[^.]+$/, "");
  const name = pattern
    .replaceAll("{album}", v.album)
    .replaceAll("{original}", base)
    .replaceAll("{n}", String(v.n).padStart(4, "0"))
    .replaceAll("{categoria}", v.category)
    .replace(/[\\/:*?"<>|]/g, "-")
    .trim();
  return (name || base) + ext;
}
