import { describe, expect, it } from "vitest";
import { calculateDough } from "./calculateDough";
import { roundForDisplay } from "./roundForDisplay";

describe("roundForDisplay", () => {
  it("rounds flour, water, salt and dough weight to whole grams and yeast to 0.1 g", () => {
    const rounded = roundForDisplay({
      flour: 605.3268,
      water: 375.3027,
      salt: 18.1598,
      yeast: 1.2107,
      doughWeight: 1000,
    });

    expect(rounded).toEqual({ flour: 605, water: 375, salt: 18, yeast: 1.2, doughWeight: 1000 });
  });

  it("keeps a small yeast amount visible instead of rounding it to a whole gram", () => {
    expect(roundForDisplay({ flour: 300, water: 186, salt: 9, yeast: 0.36, doughWeight: 495.36 }).yeast).toBe(0.4);
  });

  it("rounds the leftover grams of dough balls to whole grams", () => {
    const rounded = roundForDisplay({
      flour: 1000,
      water: 620,
      salt: 30,
      yeast: 2,
      doughWeight: 1652,
      doughBalls: { count: 6, leftover: 152.4 },
    });

    expect(rounded.doughBalls).toEqual({ count: 6, leftover: 152 });
  });

  it("keeps the displayed ingredients of 4 × 250 g dough balls within 1 g of 1000 g", () => {
    const result = calculateDough({
      mode: "byDoughBalls",
      ballCount: 4,
      ballWeight: 250,
      percentages: { hydration: 62, salt: 3, yeast: 0.2 },
    });
    if (!result.ok) throw new Error("expected ok");

    const { flour, water, salt, yeast } = roundForDisplay(result.weights);

    expect(Math.abs(flour + water + salt + yeast - 1000)).toBeLessThanOrEqual(1);
  });
});
