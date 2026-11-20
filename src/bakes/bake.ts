import type { DoughInput, DoughWeights } from "../dough/calculateDough";
import type { FermentationStage, YeastType } from "../yeast/suggestYeast";

/** One dough the baker made: a snapshot that is never recalculated or edited after saving. */
export type Bake = {
  id: string;
  /** The day the dough was made, as "YYYY-MM-DD". */
  bakeDate: string;
  /** When the Bake was saved, as an ISO timestamp. */
  savedAt: string;
  /** The mode, its inputs and the baker's percentages, including the yeast % used. */
  input: DoughInput;
  fermentation: FermentationStage[];
  yeastType: YeastType;
  yeastOverridden: boolean;
  /** The calculated weights at full precision, as they were when saved. */
  weights: DoughWeights;
};

export type NewBake = Omit<Bake, "id" | "savedAt">;
