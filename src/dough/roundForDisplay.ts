import type { DoughWeights } from "./calculateDough";

/** Rounds weights for showing to the baker. Calculate at full precision; round only here. */
export function roundForDisplay(weights: DoughWeights): DoughWeights {
  const rounded: DoughWeights = {
    flour: Math.round(weights.flour),
    water: Math.round(weights.water),
    salt: Math.round(weights.salt),
    // Yeast amounts are often only a gram or two, so keep one decimal.
    yeast: Math.round(weights.yeast * 10) / 10,
    doughWeight: Math.round(weights.doughWeight),
  };
  if (weights.doughBalls) {
    rounded.doughBalls = {
      count: weights.doughBalls.count,
      leftover: Math.round(weights.doughBalls.leftover),
    };
  }
  return rounded;
}
