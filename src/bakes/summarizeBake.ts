import { formatPercentage } from "../dough/formatPercentage";
import { text } from "../text";
import type { Bake } from "./bake";

const t = text.bakes.summary;

/** A one-line summary of a Bake for the history list, e.g. "4 × 250 g · 62% · fresh 0.07% · 24 h @ 20 °C". */
export function summarizeBake({ input, fermentation, yeastType }: Bake): string {
  return [
    input.mode === "byDoughBalls" ? t.byDoughBalls(input.ballCount, input.ballWeight) : t.byFlour(input.flourWeight),
    text.bakes.percentage(input.percentages.hydration),
    // Mid-sentence, the yeast type reads in lower case: "fresh 0.07%".
    t.yeast(text.calculator.yeastTypes[yeastType].toLowerCase(), formatPercentage(input.percentages.yeast)),
    ...fermentation.map((stage) => t.fermentationStage(stage.hours, stage.temperature)),
  ].join(t.separator);
}
