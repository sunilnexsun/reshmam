// Category names like "GROUNDNUT OIL ( கடலை எண்ணெய் )" show English on one line and Tamil on the next.
import { describe, expect, it } from "vitest";
import { splitBilingualName } from "@storefront/_lib/bilingual-name";

describe("splitBilingualName", () => {
  it("splits the Tamil in brackets from the English", () => {
    expect(splitBilingualName("GROUNDNUT OIL ( கடலை எண்ணெய் )")).toEqual({ english: "GROUNDNUT OIL", tamil: "கடலை எண்ணெய்" });
    expect(splitBilingualName("Gingelly Oil (நல்லெண்ணெய்)")).toEqual({ english: "Gingelly Oil", tamil: "நல்லெண்ணெய்" });
  });

  it("leaves a name with no Tamil as it is, including English in brackets", () => {
    expect(splitBilingualName("Combo Pack")).toEqual({ english: "Combo Pack", tamil: null });
    expect(splitBilingualName("Coconut Oil (1 L)")).toEqual({ english: "Coconut Oil (1 L)", tamil: null });
  });

  it("keeps a name that is only Tamil whole", () => {
    expect(splitBilingualName("( நல்லெண்ணெய் )")).toEqual({ english: "( நல்லெண்ணெய் )", tamil: null });
  });
});
