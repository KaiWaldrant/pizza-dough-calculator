import { describe, expect, it } from "vitest";
import { suggestYeast } from "./suggestYeast";

// Expected values are the worked examples in docs/adr/0001-yeast-model.md,
// which match Craig's yeast table to within its precision.
describe("suggestYeast", () => {
  it("suggests about 0.069% fresh yeast for 24 h at 21 °C", () => {
    const result = suggestYeast([{ hours: 24, temperature: 21 }], "fresh");

    if (!result.ok) throw new Error("expected ok");
    expect(result.percentage).toBeCloseTo(0.069, 3);
    expect(result.outOfRange).toBe(false);
  });

  it("suggests about 0.87% fresh yeast for 48 h in the fridge at 4 °C", () => {
    const result = suggestYeast([{ hours: 48, temperature: 4 }], "fresh");

    if (!result.ok) throw new Error("expected ok");
    expect(result.percentage).toBeCloseTo(0.87, 2);
  });

  it("adds up fermentation across stages", () => {
    // 2 h at 21 °C + 48 h at 4 °C ≈ 5.75 equivalent hours at 21 °C
    const result = suggestYeast(
      [
        { hours: 2, temperature: 21 },
        { hours: 48, temperature: 4 },
      ],
      "fresh",
    );

    if (!result.ok) throw new Error("expected ok");
    expect(result.percentage).toBeCloseTo(0.49, 2);
  });

  it.each([
    { yeastType: "fresh", percentage: 0.0844 },
    { yeastType: "instantDry", percentage: 0.0281 }, // fresh ÷ 3
    { yeastType: "activeDry", percentage: 0.0351 }, // instant dry × 1.25
  ] as const)("suggests $percentage% $yeastType yeast for 24 h at 20 °C", ({ yeastType, percentage }) => {
    const result = suggestYeast([{ hours: 24, temperature: 20 }], yeastType);

    if (!result.ok) throw new Error("expected ok");
    expect(result.percentage).toBeCloseTo(percentage, 4);
  });

  describe("outside the range the model covers (2–100 h, 2–30 °C)", () => {
    it.each([
      { case: "1 h", hours: 1, temperature: 21 },
      { case: "120 h", hours: 120, temperature: 4 },
      { case: "0 °C", hours: 24, temperature: 0 },
      { case: "35 °C", hours: 4, temperature: 35 },
    ])("still suggests yeast for $case but flags it", ({ hours, temperature }) => {
      const result = suggestYeast([{ hours, temperature }], "fresh");

      if (!result.ok) throw new Error("expected ok");
      expect(result.percentage).toBeGreaterThan(0);
      expect(result.outOfRange).toBe(true);
    });

    it("flags the suggestion when any one stage is out of range", () => {
      const result = suggestYeast(
        [
          { hours: 2, temperature: 21 },
          { hours: 48, temperature: 1 },
        ],
        "fresh",
      );

      if (!result.ok) throw new Error("expected ok");
      expect(result.outOfRange).toBe(true);
    });

    it.each([
      { case: "the lower limits", hours: 2, temperature: 2 },
      { case: "the upper limits", hours: 100, temperature: 30 },
    ])("does not flag a stage at $case", ({ hours, temperature }) => {
      const result = suggestYeast([{ hours, temperature }], "fresh");

      if (!result.ok) throw new Error("expected ok");
      expect(result.outOfRange).toBe(false);
    });
  });

  describe("invalid fermentation", () => {
    it.each([
      { case: "zero hours", stage: { hours: 0, temperature: 20 }, error: { stage: 0, field: "hours", reason: "mustBePositive" } },
      { case: "negative hours", stage: { hours: -4, temperature: 20 }, error: { stage: 0, field: "hours", reason: "mustBePositive" } },
      { case: "empty hours", stage: { hours: Number.NaN, temperature: 20 }, error: { stage: 0, field: "hours", reason: "mustBeANumber" } },
      { case: "empty temperature", stage: { hours: 24, temperature: Number.NaN }, error: { stage: 0, field: "temperature", reason: "mustBeANumber" } },
    ])("rejects $case", ({ stage, error }) => {
      expect(suggestYeast([stage], "fresh")).toEqual({ ok: false, errors: [error] });
    });

    it("says which stage is invalid", () => {
      const result = suggestYeast(
        [
          { hours: 2, temperature: 21 },
          { hours: 0, temperature: 4 },
        ],
        "fresh",
      );

      expect(result).toEqual({ ok: false, errors: [{ stage: 1, field: "hours", reason: "mustBePositive" }] });
    });

    it("rejects a fermentation without stages", () => {
      expect(suggestYeast([], "fresh")).toEqual({ ok: false, errors: [{ reason: "noStages" }] });
    });
  });
});
