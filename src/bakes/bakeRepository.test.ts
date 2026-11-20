import { IDBFactory } from "fake-indexeddb";
import { describe, expect, it } from "vitest";
import type { NewBake } from "./bake";
import { openBakeRepository } from "./bakeRepository";

const newBake = (overrides: Partial<NewBake> = {}): NewBake => ({
  bakeDate: "2026-11-20",
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
  ...overrides,
});

describe("openBakeRepository", () => {
  it("gets a saved Bake back with its snapshot, an id and a save timestamp", async () => {
    const repository = openBakeRepository(new IDBFactory());

    const saved = await repository.save(newBake());

    expect(saved.id).toEqual(expect.any(String));
    expect(Number.isNaN(Date.parse(saved.savedAt))).toBe(false);
    expect(await repository.get(saved.id)).toEqual({ ...newBake(), id: saved.id, savedAt: saved.savedAt });
  });

  it("lists Bakes newest bake date first, then most recently saved first on the same date", async () => {
    let minute = 0;
    const now = () => new Date(Date.UTC(2026, 10, 20, 12, minute++));
    const repository = openBakeRepository(new IDBFactory(), { now });
    const older = await repository.save(newBake({ bakeDate: "2026-10-01" }));
    const newest = await repository.save(newBake({ bakeDate: "2026-11-15" }));
    const sameDayFirst = await repository.save(newBake({ bakeDate: "2026-11-01" }));
    const sameDaySecond = await repository.save(newBake({ bakeDate: "2026-11-01" }));

    const ids = (await repository.list()).map((bake) => bake.id);

    expect(ids).toEqual([newest.id, sameDaySecond.id, sameDayFirst.id, older.id]);
  });

  it("deletes a Bake so it can no longer be got or listed", async () => {
    const repository = openBakeRepository(new IDBFactory());
    const kept = await repository.save(newBake());
    const deleted = await repository.save(newBake());

    await repository.delete(deleted.id);

    expect(await repository.get(deleted.id)).toBeUndefined();
    expect((await repository.list()).map((bake) => bake.id)).toEqual([kept.id]);
  });

  it("keeps Bakes when the repository is opened again, as after a page reload", async () => {
    const factory = new IDBFactory();
    const saved = await openBakeRepository(factory).save(newBake());

    const reopened = openBakeRepository(factory);

    expect(await reopened.list()).toEqual([saved]);
  });
});
