import { describe, expect, it } from "vitest";
import { exportName } from "./naming";

const v = { album: "Maratona SP", original: "IMG_0042.JPG", n: 7, category: "boas" };

describe("exportName", () => {
  it("keeps the original name without a pattern", () => expect(exportName("", v)).toBe("IMG_0042.JPG"));
  it("fills album and padded number", () => expect(exportName("{album}_{n}", v)).toBe("Maratona SP_0007.JPG"));
  it("supports original name and category", () => expect(exportName("{categoria}-{original}", v)).toBe("boas-IMG_0042.JPG"));
  it("strips characters Windows forbids", () => expect(exportName("a/b:{n}", v)).toBe("a-b-0007.JPG"));
});
