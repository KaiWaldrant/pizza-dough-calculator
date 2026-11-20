import { describe, expect, it } from "vitest";
import { calculateDough } from "./calculateDough";

const neapolitan = { hydration: 62, salt: 3, yeast: 0.2 };

describe("calculateDough", () => {
  describe("by dough balls", () => {
    it("splits the dough weight into ingredients by baker's percentage", () => {
      // 4 × 250 g = 1000 g; flour = 1000 / 1.652
      const result = calculateDough({
        mode: "byDoughBalls",
        ballCount: 4,
        ballWeight: 250,
        percentages: neapolitan,
      });

      if (!result.ok) throw new Error("expected ok");
      expect(result.weights.flour).toBeCloseTo(605.327, 3);
      expect(result.weights.water).toBeCloseTo(375.303, 3);
      expect(result.weights.salt).toBeCloseTo(18.160, 3);
      expect(result.weights.yeast).toBeCloseTo(1.211, 3);
      expect(result.weights.doughWeight).toBeCloseTo(1000, 6);
      expect(result.weights.doughBalls).toBeUndefined();
    });
  });

  describe("by flour", () => {
    it("derives the other ingredients from the flour weight", () => {
      const result = calculateDough({ mode: "byFlour", flourWeight: 1000, percentages: neapolitan });

      if (!result.ok) throw new Error("expected ok");
      expect(result.weights.flour).toBe(1000);
      expect(result.weights.water).toBeCloseTo(620, 9);
      expect(result.weights.salt).toBeCloseTo(30, 9);
      expect(result.weights.yeast).toBeCloseTo(2, 9);
      expect(result.weights.doughWeight).toBeCloseTo(1652, 9);
      expect(result.weights.doughBalls).toBeUndefined();
    });

    it("counts whole dough balls and leftover grams when given a ball weight", () => {
      // 1652 g of dough at 250 g per ball → 6 balls, 152 g left over
      const result = calculateDough({
        mode: "byFlour",
        flourWeight: 1000,
        ballWeight: 250,
        percentages: neapolitan,
      });

      if (!result.ok) throw new Error("expected ok");
      expect(result.weights.doughBalls?.count).toBe(6);
      expect(result.weights.doughBalls?.leftover).toBeCloseTo(152, 9);
    });
  });

  describe("invalid input", () => {
    it.each([
      { case: "zero dough balls", ballCount: 0, ballWeight: 250, error: { field: "ballCount", reason: "mustBePositive" } },
      { case: "negative dough balls", ballCount: -1, ballWeight: 250, error: { field: "ballCount", reason: "mustBePositive" } },
      { case: "a fraction of a dough ball", ballCount: 2.5, ballWeight: 250, error: { field: "ballCount", reason: "mustBeWholeNumber" } },
      { case: "zero ball weight", ballCount: 4, ballWeight: 0, error: { field: "ballWeight", reason: "mustBePositive" } },
      { case: "an empty ball weight", ballCount: 4, ballWeight: Number.NaN, error: { field: "ballWeight", reason: "mustBeANumber" } },
      { case: "negative ball weight", ballCount: 4, ballWeight: -250, error: { field: "ballWeight", reason: "mustBePositive" } },
    ])("rejects $case by dough balls", ({ ballCount, ballWeight, error }) => {
      const result = calculateDough({ mode: "byDoughBalls", ballCount, ballWeight, percentages: neapolitan });

      expect(result).toEqual({ ok: false, errors: [error] });
    });

    it.each([
      { case: "zero flour", flourWeight: 0, ballWeight: undefined, error: { field: "flourWeight", reason: "mustBePositive" } },
      { case: "negative flour", flourWeight: -1000, ballWeight: undefined, error: { field: "flourWeight", reason: "mustBePositive" } },
      { case: "negative ball weight", flourWeight: 1000, ballWeight: -250, error: { field: "ballWeight", reason: "mustBePositive" } },
    ])("rejects $case by flour", ({ flourWeight, ballWeight, error }) => {
      const result = calculateDough({ mode: "byFlour", flourWeight, ballWeight, percentages: neapolitan });

      expect(result).toEqual({ ok: false, errors: [error] });
    });

    it.each([
      { case: "negative hydration", percentages: { ...neapolitan, hydration: -1 }, field: "hydration", reason: "mustNotBeNegative" },
      { case: "negative salt", percentages: { ...neapolitan, salt: -0.5 }, field: "salt", reason: "mustNotBeNegative" },
      { case: "negative yeast", percentages: { ...neapolitan, yeast: -0.1 }, field: "yeast", reason: "mustNotBeNegative" },
      { case: "empty yeast", percentages: { ...neapolitan, yeast: Number.NaN }, field: "yeast", reason: "mustBeANumber" },
    ])("rejects $case", ({ percentages, field, reason }) => {
      const result = calculateDough({ mode: "byFlour", flourWeight: 1000, percentages });

      expect(result).toEqual({ ok: false, errors: [{ field, reason }] });
    });

    it("accepts zero percentages", () => {
      const result = calculateDough({
        mode: "byFlour",
        flourWeight: 1000,
        percentages: { hydration: 0, salt: 0, yeast: 0 },
      });

      expect(result.ok).toBe(true);
    });

    it("reports every invalid field at once", () => {
      const result = calculateDough({
        mode: "byDoughBalls",
        ballCount: 0,
        ballWeight: 250,
        percentages: { ...neapolitan, salt: -1 },
      });

      expect(result).toEqual({
        ok: false,
        errors: [
          { field: "ballCount", reason: "mustBePositive" },
          { field: "salt", reason: "mustNotBeNegative" },
        ],
      });
    });
  });
});
