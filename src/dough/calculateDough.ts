/** Ingredient amounts as baker's percentages: each a percentage of the flour weight. */
export type BakersPercentages = {
  hydration: number;
  salt: number;
  yeast: number;
};

export type DoughInput =
  | {
      mode: "byDoughBalls";
      ballCount: number;
      ballWeight: number;
      percentages: BakersPercentages;
    }
  | {
      mode: "byFlour";
      flourWeight: number;
      ballWeight?: number;
      percentages: BakersPercentages;
    };

/** Ingredient weights and the dough weight, in grams. */
export type DoughWeights = {
  flour: number;
  water: number;
  salt: number;
  yeast: number;
  doughWeight: number;
  doughBalls?: { count: number; leftover: number };
};

export type InputField = "ballCount" | "ballWeight" | "flourWeight" | keyof BakersPercentages;

export type InputError = {
  field: InputField;
  reason: "mustBeANumber" | "mustBePositive" | "mustBeWholeNumber" | "mustNotBeNegative";
};

export type DoughResult = { ok: true; weights: DoughWeights } | { ok: false; errors: InputError[] };

/** Calculates ingredient weights at full precision; see roundForDisplay for showing them. */
export function calculateDough(input: DoughInput): DoughResult {
  const errors = validate(input);
  if (errors.length > 0) return { ok: false, errors };

  switch (input.mode) {
    case "byDoughBalls": {
      const { hydration, salt, yeast } = input.percentages;
      const doughWeight = input.ballCount * input.ballWeight;
      const flour = doughWeight / (1 + (hydration + salt + yeast) / 100);
      return { ok: true, weights: weightsFromFlour(flour, input.percentages) };
    }
    case "byFlour": {
      const weights = weightsFromFlour(input.flourWeight, input.percentages);
      if (input.ballWeight === undefined) return { ok: true, weights };
      const count = Math.floor(weights.doughWeight / input.ballWeight);
      const leftover = weights.doughWeight - count * input.ballWeight;
      return { ok: true, weights: { ...weights, doughBalls: { count, leftover } } };
    }
  }
}

function weightsFromFlour(flour: number, percentages: BakersPercentages): DoughWeights {
  const water = (flour * percentages.hydration) / 100;
  const salt = (flour * percentages.salt) / 100;
  const yeast = (flour * percentages.yeast) / 100;
  return { flour, water, salt, yeast, doughWeight: flour + water + salt + yeast };
}

function validate(input: DoughInput): InputError[] {
  const errors: InputError[] = [];
  // An empty form field arrives as NaN.
  const check = (field: InputField, value: number, rule: "positive" | "notNegative") => {
    if (!Number.isFinite(value)) errors.push({ field, reason: "mustBeANumber" });
    else if (rule === "positive" && value <= 0) errors.push({ field, reason: "mustBePositive" });
    else if (rule === "notNegative" && value < 0) errors.push({ field, reason: "mustNotBeNegative" });
  };

  switch (input.mode) {
    case "byDoughBalls":
      check("ballCount", input.ballCount, "positive");
      if (Number.isFinite(input.ballCount) && input.ballCount > 0 && !Number.isInteger(input.ballCount)) {
        errors.push({ field: "ballCount", reason: "mustBeWholeNumber" });
      }
      check("ballWeight", input.ballWeight, "positive");
      break;
    case "byFlour":
      check("flourWeight", input.flourWeight, "positive");
      if (input.ballWeight !== undefined) check("ballWeight", input.ballWeight, "positive");
      break;
  }

  for (const field of ["hydration", "salt", "yeast"] as const) {
    check(field, input.percentages[field], "notNegative");
  }
  return errors;
}
