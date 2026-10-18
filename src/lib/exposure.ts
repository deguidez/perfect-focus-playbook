/** Automatic exposure: brightens/darkens so the median luminance lands near mid-grey, with a soft highlight shoulder. */
export const TARGET_MEDIAN = 118;
const MIN_GAIN = 0.7;
const MAX_GAIN = 1.7;

/** Builds a 256-bin luminance histogram, sampling every `stride`-th pixel of RGBA data. */
export function luminanceHistogram(data: Uint8ClampedArray, stride = 1): { hist: Uint32Array; total: number } {
  const hist = new Uint32Array(256);
  let total = 0;
  const step = 4 * Math.max(1, stride);
  for (let i = 0; i < data.length; i += step) {
    hist[Math.round(0.299 * data[i]! + 0.587 * data[i + 1]! + 0.114 * data[i + 2]!)]!++;
    total++;
  }
  return { hist, total };
}

function percentile(hist: Uint32Array, total: number, p: number) {
  const target = total * p;
  let acc = 0;
  for (let v = 0; v < 256; v++) {
    acc += hist[v]!;
    if (acc >= target) return v;
  }
  return 255;
}

/** Returns a LUT to apply to every channel, or null when the photo is already well exposed. */
export function exposureLut(hist: Uint32Array, total: number): Uint8ClampedArray | null {
  if (!total) return null;
  const median = Math.max(1, percentile(hist, total, 0.5));
  const gain = Math.min(MAX_GAIN, Math.max(MIN_GAIN, TARGET_MEDIAN / median));
  if (Math.abs(gain - 1) < 0.05) return null;
  const lut = new Uint8ClampedArray(256);
  const knee = 200;
  for (let v = 0; v < 256; v++) {
    const x = v * gain;
    lut[v] = x <= knee ? x : knee + (255 - knee) * (1 - Math.exp(-(x - knee) / (255 - knee)));
  }
  return lut;
}

export function applyLut(data: Uint8ClampedArray, lut: Uint8ClampedArray) {
  for (let i = 0; i < data.length; i += 4) {
    data[i] = lut[data[i]!]!;
    data[i + 1] = lut[data[i + 1]!]!;
    data[i + 2] = lut[data[i + 2]!]!;
  }
}
