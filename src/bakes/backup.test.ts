import { describe, expect, it } from "vitest";
import type { Bake, Comment } from "./bake";
import { parseBackup } from "./backup";

const bake: Bake = {
  id: "bake-1",
  bakeDate: "2026-11-01",
  savedAt: "2026-11-01T18:00:00.000Z",
  input: {
    mode: "byDoughBalls",
    ballCount: 4,
    ballWeight: 250,
    percentages: { hydration: 62, salt: 3, yeast: 0.07 },
  },
  fermentation: [{ hours: 24, temperature: 20 }],
  yeastType: "fresh",
  yeastOverridden: true,
  weights: { flour: 605.0, water: 375.1, salt: 18.15, yeast: 0.4235, doughWeight: 1000 },
};

const comment: Comment = { id: "comment-1", bakeId: "bake-1", body: "great oven spring", createdAt: "2026-11-02T20:00:00.000Z" };

const json = (contents: unknown) => JSON.stringify(contents);
const backupWith = ({ bakes = [], comments = [] }: { bakes?: unknown[]; comments?: unknown[] }) => ({
  schemaVersion: 1,
  bakes,
  comments,
});
/** A backup holding one Bake with some fields changed, e.g. to values a backup can't have. */
const withBake = (changes: Record<string, unknown>) => backupWith({ bakes: [{ ...bake, ...changes }] });
const wrongStructure = { ok: false, errors: [{ field: "file", reason: "wrongStructure" }] };

describe("parseBackup", () => {
  it("reads a backup's Bakes and Comments", () => {
    expect(parseBackup(json({ schemaVersion: 1, bakes: [bake], comments: [comment] }))).toEqual({
      ok: true,
      backup: { schemaVersion: 1, bakes: [bake], comments: [comment] },
    });
  });

  it("rejects a file that isn't JSON", () => {
    expect(parseBackup("not json {")).toEqual({ ok: false, errors: [{ field: "file", reason: "notJson" }] });
  });

  it("rejects a backup with an unknown schema version", () => {
    expect(parseBackup(json({ schemaVersion: 2, bakes: [], comments: [] }))).toEqual({
      ok: false,
      errors: [{ field: "file", reason: "unknownSchemaVersion" }],
    });
  });

  it("reads a Bake made by flour, with and without a ball weight and dough balls", () => {
    const byFlour: Bake = {
      ...bake,
      input: { mode: "byFlour", flourWeight: 1000, percentages: { hydration: 65, salt: 3, yeast: 0.02 } },
    };
    const withBalls: Bake = {
      ...bake,
      id: "bake-2",
      input: { ...byFlour.input, ballWeight: 250 } as Bake["input"],
      weights: { ...bake.weights, doughBalls: { count: 6, leftover: 170 } },
    };

    expect(parseBackup(json({ schemaVersion: 1, bakes: [byFlour, withBalls], comments: [] }))).toEqual({
      ok: true,
      backup: { schemaVersion: 1, bakes: [byFlour, withBalls], comments: [] },
    });
  });

  it("drops fields a backup's Bakes and Comments don't have", () => {
    const parsed = parseBackup(
      json({ schemaVersion: 1, bakes: [{ ...bake, extra: 1 }], comments: [{ ...comment, extra: 2 }] }),
    );

    expect(parsed).toEqual({ ok: true, backup: { schemaVersion: 1, bakes: [bake], comments: [comment] } });
  });

  it("rejects JSON that isn't a backup at all", () => {
    expect(parseBackup(json({ name: "package.json" }))).toEqual(wrongStructure);
    expect(parseBackup(json({ schemaVersion: "1", bakes: [], comments: [] }))).toEqual(wrongStructure);
  });

  it.each([
    ["an array instead of a backup", []],
    ["no Bakes", { schemaVersion: 1, comments: [] }],
    ["Comments that aren't a list", { schemaVersion: 1, bakes: [], comments: {} }],
    ["a Bake without an id", withBake({ id: undefined })],
    ["a Bake with an empty id", withBake({ id: "" })],
    ["a Bake date that isn't a date", withBake({ bakeDate: "yesterday" })],
    ["a Bake date that isn't a real day", withBake({ bakeDate: "2026-13-45" })],
    ["a Bake without a save time", withBake({ savedAt: 5 })],
    ["a save time that isn't a timestamp", withBake({ savedAt: "last week" })],
    ["an unknown mode", withBake({ input: { ...bake.input, mode: "byPizza" } })],
    ["a dough ball count that isn't a number", withBake({ input: { ...bake.input, ballCount: "4" } })],
    ["a fractional dough ball count", withBake({ input: { ...bake.input, ballCount: 2.5 } })],
    ["a ball weight of zero", withBake({ input: { ...bake.input, ballWeight: 0 } })],
    [
      "a ball weight by flour that isn't a number",
      withBake({ input: { mode: "byFlour", flourWeight: 1000, ballWeight: "x", percentages: bake.input.percentages } }),
    ],
    ["a missing baker's percentage", withBake({ input: { ...bake.input, percentages: { hydration: 62, salt: 3 } } })],
    ["a negative baker's percentage", withBake({ input: { ...bake.input, percentages: { hydration: 62, salt: -3, yeast: 0.07 } } })],
    ["no fermentation stage", withBake({ fermentation: [] })],
    ["a fermentation stage without a temperature", withBake({ fermentation: [{ hours: 24 }] })],
    ["a fermentation of zero hours", withBake({ fermentation: [{ hours: 0, temperature: 20 }] })],
    ["an unknown yeast type", withBake({ yeastType: "sourdough" })],
    ["an overridden flag that isn't true or false", withBake({ yeastOverridden: "yes" })],
    ["a missing weight", withBake({ weights: { ...bake.weights, water: undefined } })],
    ["a negative weight", withBake({ weights: { ...bake.weights, salt: -1 } })],
    ["dough balls without a leftover", withBake({ weights: { ...bake.weights, doughBalls: { count: 4 } } })],
    ["the same Bake twice", backupWith({ bakes: [bake, bake] })],
    ["a Comment without a body", backupWith({ bakes: [bake], comments: [{ ...comment, body: undefined }] })],
    ["a Comment with an empty id", backupWith({ bakes: [bake], comments: [{ ...comment, id: "" }] })],
    ["a Comment time that isn't a timestamp", backupWith({ bakes: [bake], comments: [{ ...comment, createdAt: "now" }] })],
    ["a Comment on a Bake the file doesn't have", backupWith({ bakes: [bake], comments: [{ ...comment, bakeId: "other" }] })],
    ["the same Comment twice", backupWith({ bakes: [bake], comments: [comment, comment] })],
  ])("rejects a backup with %s", (_, contents) => {
    expect(parseBackup(json(contents))).toEqual(wrongStructure);
  });

  it("rejects a number too large to store", () => {
    // JSON.parse turns 1e999 into Infinity, which a later export would write out as null.
    const contents = json(backupWith({ bakes: [bake] })).replace('"ballWeight":250', '"ballWeight":1e999');

    expect(parseBackup(contents)).toEqual(wrongStructure);
  });
});
