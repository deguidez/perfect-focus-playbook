import { describe, expect, it } from "vitest";
import { classify } from "./culling";
import { parseXmp } from "./xmp";

const settings = { focus_threshold: 60, require_main_subject: true, reject_eyes_closed: true, reject_head_cut: true };
const sharp = { main_subject_found: true, face_sharpness: 80, eyes_closed: false, head_cut: false };

describe("classify", () => {
  it("manual choice wins over the AI (eyes closed moved to good)", () =>
    expect(classify({ ...sharp, eyes_closed: true, manual_category: "boas" }, settings)).toBe("boas"));
  it("manual choice survives threshold changes", () =>
    expect(classify({ ...sharp, manual_category: "desfocadas" }, settings)).toBe("desfocadas"));
  it("sharp face above threshold is good", () => expect(classify(sharp, settings)).toBe("boas"));
  it("sharpness below the focus level goes to blurred", () =>
    expect(classify({ ...sharp, face_sharpness: 59 }, settings)).toBe("desfocadas"));
  it("raising the focus level moves photos to blurred", () =>
    expect(classify(sharp, { ...settings, focus_threshold: 85 })).toBe("desfocadas"));
  it("eyes closed separated only when enabled", () => {
    expect(classify({ ...sharp, eyes_closed: true }, settings)).toBe("olhos_fechados");
    expect(classify({ ...sharp, eyes_closed: true }, { ...settings, reject_eyes_closed: false })).toBe("boas");
  });
  it("head cut separated only when enabled", () => {
    expect(classify({ ...sharp, head_cut: true }, settings)).toBe("cabeca_cortada");
    expect(classify({ ...sharp, head_cut: true }, { ...settings, reject_head_cut: false })).toBe("boas");
  });
  it("no main athlete", () => expect(classify({ ...sharp, main_subject_found: false }, settings)).toBe("sem_atleta"));
});

describe("parseXmp", () => {
  it("reads Lightroom attributes and tone curve", () => {
    const p = parseXmp(
      `<rdf:Description crs:Exposure2012="+0.50" crs:Contrast2012="-12" crs:Vibrance="+20"><crs:ToneCurvePV2012><rdf:Seq><rdf:li>0, 10</rdf:li><rdf:li>255, 245</rdf:li></rdf:Seq></crs:ToneCurvePV2012></rdf:Description>`,
    );
    expect(p.exposure).toBe(0.5);
    expect(p.contrast).toBe(-12);
    expect(p.vibrance).toBe(20);
    expect(p.curve).toEqual([[0, 10], [255, 245]]);
  });
});
