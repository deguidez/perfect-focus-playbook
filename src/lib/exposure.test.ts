import { describe, expect, it } from "vitest";
import { exposureLut } from "./exposure";

const flat = (v: number) => {
  const h = new Uint32Array(256);
  h[v] = 1000;
  return h;
};

describe("auto exposure", () => {
  it("brightens an underexposed photo", () => {
    expect(exposureLut(flat(60), 1000)![60]).toBeGreaterThan(90);
  });
  it("darkens an overexposed photo", () => {
    expect(exposureLut(flat(220), 1000)![220]).toBeLessThan(200);
  });
  it("leaves a well exposed photo untouched", () => {
    expect(exposureLut(flat(118), 1000)).toBeNull();
  });
});
