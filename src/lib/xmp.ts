/** Lightroom/Camera Raw XMP preset parsing and a fast LUT-based approximation for JPGs. */
export type Preset = {
  exposure: number; // stops
  contrast: number; // -100..100
  highlights: number;
  shadows: number;
  whites: number;
  blacks: number;
  temperature: number; // -100..100 (incremental)
  tint: number;
  vibrance: number;
  saturation: number;
  curve: [number, number][]; // 0..255 points
};

function num(xmp: string, key: string): number | undefined {
  const attr = new RegExp(`crs:${key}="([+-]?[\\d.]+)"`).exec(xmp);
  const el = new RegExp(`<crs:${key}>([+-]?[\\d.]+)</crs:${key}>`).exec(xmp);
  const v = attr?.[1] ?? el?.[1];
  return v === undefined ? undefined : parseFloat(v);
}

export function parseXmp(xmp: string): Preset {
  let temperature = num(xmp, "IncrementalTemperature") ?? 0;
  const kelvin = num(xmp, "Temperature");
  if (!num(xmp, "IncrementalTemperature") && kelvin && kelvin > 1000) {
    temperature = Math.max(-100, Math.min(100, (kelvin - 5500) / 40));
  }
  let tint = num(xmp, "IncrementalTint") ?? num(xmp, "Tint") ?? 0;
  tint = Math.max(-100, Math.min(100, tint));

  const curve: [number, number][] = [];
  const block = /<crs:ToneCurvePV2012>([\s\S]*?)<\/crs:ToneCurvePV2012>/.exec(xmp)?.[1];
  if (block) {
    for (const m of block.matchAll(/<rdf:li>\s*(\d+)\s*,\s*(\d+)\s*<\/rdf:li>/g)) {
      curve.push([parseInt(m[1]!), parseInt(m[2]!)]);
    }
  }
  return {
    exposure: num(xmp, "Exposure2012") ?? num(xmp, "Exposure") ?? 0,
    contrast: num(xmp, "Contrast2012") ?? 0,
    highlights: num(xmp, "Highlights2012") ?? 0,
    shadows: num(xmp, "Shadows2012") ?? 0,
    whites: num(xmp, "Whites2012") ?? 0,
    blacks: num(xmp, "Blacks2012") ?? 0,
    temperature,
    tint,
    vibrance: num(xmp, "Vibrance") ?? 0,
    saturation: num(xmp, "Saturation") ?? 0,
    curve: curve.length >= 2 ? curve.sort((a, b) => a[0] - b[0]) : [],
  };
}

const clamp = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);

function curveAt(curve: [number, number][], x: number): number {
  if (!curve.length) return x;
  const xi = x * 255;
  for (let i = 1; i < curve.length; i++) {
    const [x0, y0] = curve[i - 1]!;
    const [x1, y1] = curve[i]!;
    if (xi <= x1) return (y0 + ((y1 - y0) * (xi - x0)) / Math.max(1, x1 - x0)) / 255;
  }
  return curve[curve.length - 1]![1] / 255;
}

/** Tone mapping for one normalized value. */
export function tone(v: number, p: Preset): number {
  // exposure in linear light
  let lin = Math.pow(v, 2.2) * Math.pow(2, p.exposure);
  let x = Math.pow(clamp(lin), 1 / 2.2);
  // whites / blacks move the endpoints
  const lo = -p.blacks / 400;
  const hi = 1 - p.whites / 400;
  x = clamp((x - lo) / Math.max(0.05, hi - lo));
  // highlights / shadows: weighted by luminance masks
  const sh = (1 - x) * (1 - x);
  const hl = x * x;
  x = clamp(x + (p.shadows / 100) * 0.35 * sh * x * 2 + (p.highlights / 100) * 0.35 * hl * (1 - x) * 2);
  // contrast: S-curve around mid grey
  const c = p.contrast / 100;
  if (c !== 0) {
    const s = x - 0.5;
    x = clamp(0.5 + s * (1 + c * 0.6) - c * 0.6 * 4 * s * s * s * (c > 0 ? 1 : 0));
  }
  x = curveAt(p.curve, x);
  lin = x;
  return clamp(lin);
}

export function buildLuts(p: Preset): [Uint8ClampedArray, Uint8ClampedArray, Uint8ClampedArray] {
  const t = p.temperature / 100;
  const g = p.tint / 100;
  const gains = [1 + t * 0.18 + g * 0.05, 1 - g * 0.12, 1 - t * 0.18 + g * 0.05];
  return gains.map((gain) => {
    const lut = new Uint8ClampedArray(256);
    for (let i = 0; i < 256; i++) lut[i] = Math.round(tone(clamp((i / 255) * gain), p) * 255);
    return lut;
  }) as [Uint8ClampedArray, Uint8ClampedArray, Uint8ClampedArray];
}

/** Applies the preset in place on RGBA pixel data. */
export function applyPreset(data: Uint8ClampedArray, p: Preset) {
  const [lr, lg, lb] = buildLuts(p);
  const sat = p.saturation / 100;
  const vib = p.vibrance / 100;
  const doColor = sat !== 0 || vib !== 0;
  for (let i = 0; i < data.length; i += 4) {
    let r = lr[data[i]!]!;
    let gg = lg[data[i + 1]!]!;
    let b = lb[data[i + 2]!]!;
    if (doColor) {
      const max = Math.max(r, gg, b);
      const min = Math.min(r, gg, b);
      const curSat = max === 0 ? 0 : (max - min) / max;
      const amt = 1 + sat + vib * (1 - curSat);
      const l = 0.299 * r + 0.587 * gg + 0.114 * b;
      r = l + (r - l) * amt;
      gg = l + (gg - l) * amt;
      b = l + (b - l) * amt;
    }
    data[i] = r;
    data[i + 1] = gg;
    data[i + 2] = b;
  }
}

export const EMPTY_PRESET: Preset = {
  exposure: 0, contrast: 0, highlights: 0, shadows: 0, whites: 0, blacks: 0,
  temperature: 0, tint: 0, vibrance: 0, saturation: 0, curve: [],
};

/** Writes a preset as a Lightroom-compatible XMP so in-app presets are stored and downloaded like uploaded ones. */
export function serializeXmp(p: Preset, name: string): string {
  const s = (v: number, d = 0) => (v > 0 ? "+" : "") + v.toFixed(d);
  const curve = p.curve.length
    ? `\n   <crs:ToneCurvePV2012><rdf:Seq>${p.curve.map(([x, y]) => `<rdf:li>${x}, ${y}</rdf:li>`).join("")}</rdf:Seq></crs:ToneCurvePV2012>`
    : "";
  return `<x:xmpmeta xmlns:x="adobe:ns:meta/">
 <rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">
  <rdf:Description rdf:about="" xmlns:crs="http://ns.adobe.com/camera-raw-settings/1.0/"
   crs:PresetType="Normal" crs:Name="${name.replace(/[<>&"]/g, "")}" crs:ProcessVersion="11.0"
   crs:Exposure2012="${s(p.exposure, 2)}" crs:Contrast2012="${s(p.contrast)}"
   crs:Highlights2012="${s(p.highlights)}" crs:Shadows2012="${s(p.shadows)}"
   crs:Whites2012="${s(p.whites)}" crs:Blacks2012="${s(p.blacks)}"
   crs:IncrementalTemperature="${s(p.temperature)}" crs:IncrementalTint="${s(p.tint)}"
   crs:Vibrance="${s(p.vibrance)}" crs:Saturation="${s(p.saturation)}">${curve}
  </rdf:Description>
 </rdf:RDF>
</x:xmpmeta>
`;
}
