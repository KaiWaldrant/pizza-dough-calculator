import { describe, expect, it } from "vitest";
import type { Bake } from "./bake";
import { summarizeBake } from "./summarizeBake";

const bake: Bake = {
  id: "a",
  bakeDate: "2026-11-20",
  savedAt: "2026-11-20T12:00:00.000Z",
  input: {
    mode: "byDoughBalls",
    ballCount: 4,
    ballWeight: 250,
    percentages: { hydration: 62, salt: 3, yeast: 0.07 },
  },
  fermentation: [{ hours: 24, temperature: 20 }],
  yeastType: "fresh",
  yeastOverridden: false,
  weights: { flour: 605.0, water: 375.1, salt: 18.15, yeast: 0.4235, doughWeight: 1000 },
};

describe("summarizeBake", () => {
  it("summarizes a Bake made by dough balls", () => {
    expect(summarizeBake(bake)).toBe("4 × 250 g · 62% · fresh 0.07% · 24 h @ 20 °C");
  });

  it("summarizes a Bake made by flour, with the yeast % to two significant digits", () => {
    const byFlour: Bake = {
      ...bake,
      input: { mode: "byFlour", flourWeight: 1000, percentages: { hydration: 65, salt: 3, yeast: 0.0234 } },
      fermentation: [{ hours: 48, temperature: 4 }],
      yeastType: "instantDry",
    };

    expect(summarizeBake(byFlour)).toBe("1000 g flour · 65% · instant dry 0.023% · 48 h @ 4 °C");
  });
});
