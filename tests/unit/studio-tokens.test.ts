import { describe, expect, it } from "vitest";
import {
  isStudioTokenPack,
  STUDIO_TOKEN_PACKS,
} from "@/config/studio-tokens";

describe("Studio token packs", () => {
  it("accepts exactly the configured prepaid amounts", () => {
    for (const pack of STUDIO_TOKEN_PACKS) {
      expect(isStudioTokenPack(pack.amountCents)).toBe(true);
    }
  });

  it("rejects arbitrary client-supplied amounts", () => {
    expect(isStudioTokenPack(0)).toBe(false);
    expect(isStudioTokenPack(999)).toBe(false);
    expect(isStudioTokenPack(1_000_000)).toBe(false);
    expect(isStudioTokenPack(Number.NaN)).toBe(false);
  });
});
