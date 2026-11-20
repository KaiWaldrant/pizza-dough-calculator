import { IDBFactory } from "fake-indexeddb";
import { describe, expect, it } from "vitest";
import type { NewBake } from "./bake";
import { openBakeRepository } from "./bakeRepository";
import { tickingClock } from "./tickingClock";

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
    const repository = openBakeRepository(new IDBFactory(), { now: tickingClock() });
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

  describe("comments", () => {
    it("lists a Bake's comments oldest first, with their creation time", async () => {
      const repository = openBakeRepository(new IDBFactory(), { now: tickingClock() });
      const bake = await repository.save(newBake());
      const other = await repository.save(newBake());
      await repository.addComment(bake.id, "slack at 6 h");
      await repository.addComment(other.id, "on another bake");
      await repository.addComment(bake.id, "great oven spring");

      const comments = await repository.listComments(bake.id);

      expect(comments.map(({ body, createdAt }) => ({ body, createdAt }))).toEqual([
        { body: "slack at 6 h", createdAt: "2026-11-20T12:02:00.000Z" },
        { body: "great oven spring", createdAt: "2026-11-20T12:04:00.000Z" },
      ]);
    });

    it("deletes a comment", async () => {
      const repository = openBakeRepository(new IDBFactory());
      const bake = await repository.save(newBake());
      const kept = await repository.addComment(bake.id, "slack at 6 h");
      const deleted = await repository.addComment(bake.id, "typo");

      await repository.deleteComment(deleted.id);

      expect(await repository.listComments(bake.id)).toEqual([kept]);
    });

    it("deletes a Bake's comments together with the Bake", async () => {
      const repository = openBakeRepository(new IDBFactory());
      const bake = await repository.save(newBake());
      const other = await repository.save(newBake());
      await repository.addComment(bake.id, "slack at 6 h");
      const kept = await repository.addComment(other.id, "on another bake");

      await repository.delete(bake.id);

      expect(await repository.listComments(bake.id)).toEqual([]);
      expect(await repository.listComments(other.id)).toEqual([kept]);
    });

    it("keeps comments when the repository is opened again, as after a page reload", async () => {
      const factory = new IDBFactory();
      const repository = openBakeRepository(factory);
      const bake = await repository.save(newBake());
      const comment = await repository.addComment(bake.id, "great oven spring");

      expect(await openBakeRepository(factory).listComments(bake.id)).toEqual([comment]);
    });
  });

  describe("database upgrades", () => {
    it("keeps the Bakes of a version 1 database and adds comments to them", async () => {
      const factory = new IDBFactory();
      const v1 = await openRaw(factory, 1, (database) => database.createObjectStore("bakes", { keyPath: "id" }));
      const v1Bake = { ...newBake(), id: "v1-bake", savedAt: "2026-11-01T12:00:00.000Z" };
      await new Promise((resolve) => {
        const transaction = v1.transaction("bakes", "readwrite");
        transaction.objectStore("bakes").add(v1Bake);
        transaction.oncomplete = resolve;
      });
      v1.close();

      const repository = openBakeRepository(factory);
      const comment = await repository.addComment("v1-bake", "from before comments existed");

      expect(await repository.list()).toEqual([v1Bake]);
      expect(await repository.listComments("v1-bake")).toEqual([comment]);
    });

    it("fails instead of waiting forever when another tab keeps an older version open", async () => {
      const factory = new IDBFactory();
      await openRaw(factory, 1, (database) => database.createObjectStore("bakes", { keyPath: "id" }));

      await expect(openBakeRepository(factory).list()).rejects.toThrow();
    });

    it("lets another tab upgrade the database to a newer version", async () => {
      const factory = new IDBFactory();
      await openBakeRepository(factory).list();

      const newer = await openRaw(factory, 3);

      expect(newer.version).toBe(3);
    });
  });
});

/** Opens the database directly, standing in for another tab or an older version of the app. */
function openRaw(factory: IDBFactory, version: number, upgrade?: (database: IDBDatabase) => void) {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const opening = factory.open("pizza-dough", version);
    opening.onupgradeneeded = () => upgrade?.(opening.result);
    opening.onsuccess = () => resolve(opening.result);
    opening.onerror = () => reject(opening.error);
  });
}
