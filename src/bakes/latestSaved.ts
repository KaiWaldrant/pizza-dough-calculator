import type { Bake } from "./bake";

/** The most recently saved Bake, whatever its bake date, or null when there are none. */
export const latestSaved = (bakes: Bake[]): Bake | null =>
  bakes.reduce<Bake | null>((latest, bake) => (latest === null || bake.savedAt > latest.savedAt ? bake : latest), null);
