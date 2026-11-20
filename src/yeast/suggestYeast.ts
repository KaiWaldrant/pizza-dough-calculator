// The suggested-yeast model and its constants come from docs/adr/0001-yeast-model.md:
// a power-law fit to Craig's yeast table.

export type YeastType = "fresh" | "activeDry" | "instantDry";

/** One period of fermentation at a steady temperature, in hours and °C. */
export type FermentationStage = { hours: number; temperature: number };

export type FermentationError =
  | { stage: number; field: keyof FermentationStage; reason: "mustBeANumber" | "mustBePositive" }
  | { reason: "noStages" };

export type SuggestedYeast =
  | { ok: true; percentage: number; outOfRange: boolean }
  | { ok: false; errors: FermentationError[] };

/** How much faster yeast works per °C, relative to the reference temperature. */
const TEMPERATURE_SENSITIVITY = 0.15;
const REFERENCE_TEMPERATURE = 21;
/** The fit's anchor point: this fresh yeast baker's percentage for REFERENCE_HOURS at the reference temperature. */
const REFERENCE_FRESH_YEAST = 0.2;
const REFERENCE_HOURS = 11;
/** Fresh yeast % scales with (REFERENCE_HOURS / equivalent hours) to this power. */
const TIME_EXPONENT = 1.37;

/** The range of a single stage the model covers; outside it the suggestion is flagged. */
export const MODEL_HOURS = { min: 2, max: 100 };
export const MODEL_TEMPERATURE = { min: 2, max: 30 };

/** How much of each yeast type replaces 1 g of fresh yeast. */
const FRESH_YEAST_EQUIVALENT: Record<YeastType, number> = {
  fresh: 1,
  instantDry: 1 / 3,
  activeDry: (1 / 3) * 1.25,
};

/**
 * Suggests a yeast baker's percentage for a fermentation and yeast type.
 * Outside the range the model covers it still suggests a value, flagged as outOfRange.
 */
export function suggestYeast(stages: FermentationStage[], yeastType: YeastType): SuggestedYeast {
  const errors = validate(stages);
  if (errors.length > 0) return { ok: false, errors };

  const equivalentHours = stages.reduce(
    (sum, stage) => sum + stage.hours * temperatureFactor(stage.temperature),
    0,
  );
  const fresh = REFERENCE_FRESH_YEAST * (REFERENCE_HOURS / equivalentHours) ** TIME_EXPONENT;
  return {
    ok: true,
    percentage: fresh * FRESH_YEAST_EQUIVALENT[yeastType],
    outOfRange: stages.some(isOutOfRange),
  };
}

/** How fast yeast works at a temperature compared to the reference temperature. */
function temperatureFactor(temperature: number): number {
  return Math.exp(TEMPERATURE_SENSITIVITY * (temperature - REFERENCE_TEMPERATURE));
}

function isOutOfRange({ hours, temperature }: FermentationStage): boolean {
  return (
    hours < MODEL_HOURS.min ||
    hours > MODEL_HOURS.max ||
    temperature < MODEL_TEMPERATURE.min ||
    temperature > MODEL_TEMPERATURE.max
  );
}

function validate(stages: FermentationStage[]): FermentationError[] {
  if (stages.length === 0) return [{ reason: "noStages" }];

  const errors: FermentationError[] = [];
  stages.forEach(({ hours, temperature }, stage) => {
    // An empty form field arrives as NaN.
    if (!Number.isFinite(hours)) errors.push({ stage, field: "hours", reason: "mustBeANumber" });
    else if (hours <= 0) errors.push({ stage, field: "hours", reason: "mustBePositive" });
    if (!Number.isFinite(temperature)) errors.push({ stage, field: "temperature", reason: "mustBeANumber" });
  });
  return errors;
}
