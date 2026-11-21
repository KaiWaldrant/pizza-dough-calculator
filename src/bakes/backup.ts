import { calculateDough, type DoughInput, type DoughWeights } from "../dough/calculateDough";
import { type FermentationStage, suggestYeast, type YeastType } from "../yeast/suggestYeast";
import type { Bake, Comment } from "./bake";

export const SCHEMA_VERSION = 1;

const YEAST_TYPES: YeastType[] = ["fresh", "activeDry", "instantDry"];

/** The whole Bake history as one JSON file: the backup, and the way to move history between browsers. */
export type Backup = { schemaVersion: typeof SCHEMA_VERSION; bakes: Bake[]; comments: Comment[] };

/** What merging a backup into the history did. */
export type ImportResult = { bakesAdded: number; bakesSkipped: number; commentsAdded: number };

export type BackupError = { field: "file"; reason: "notJson" | "unknownSchemaVersion" | "wrongStructure" };

export type ParsedBackup = { ok: true; backup: Backup } | { ok: false; errors: BackupError[] };

export function parseBackup(json: string): ParsedBackup {
  let value: unknown;
  try {
    value = JSON.parse(json);
  } catch {
    return failure("notJson");
  }
  if (!isRecord(value)) return failure("wrongStructure");
  // Without a numeric version it isn't one of our backups; with another number it's from another app version.
  if (typeof value.schemaVersion !== "number") return failure("wrongStructure");
  if (value.schemaVersion !== SCHEMA_VERSION) return failure("unknownSchemaVersion");
  const bakes = listOf(value.bakes, readBake);
  const comments = listOf(value.comments, readComment);
  if (!bakes || !comments || !hasUniqueIds(bakes) || !hasUniqueIds(comments)) return failure("wrongStructure");
  const bakeIds = new Set(bakes.map(({ id }) => id));
  if (!comments.every(({ bakeId }) => bakeIds.has(bakeId))) return failure("wrongStructure");
  return { ok: true, backup: { schemaVersion: SCHEMA_VERSION, bakes, comments } };
}

// Each reader returns a fresh object with only the known fields, or undefined if the value doesn't fit.

function readBake(value: unknown): Bake | undefined {
  if (!isRecord(value)) return undefined;
  const { id, bakeDate, savedAt, yeastOverridden } = value;
  const input = readInput(value.input);
  const fermentation = listOf(value.fermentation, readStage);
  const yeastType = YEAST_TYPES.find((type) => type === value.yeastType);
  const weights = readWeights(value.weights);
  if (
    !isId(id) ||
    !isDate(bakeDate) ||
    !isTimestamp(savedAt) ||
    typeof yeastOverridden !== "boolean" ||
    !input ||
    !fermentation ||
    !yeastType ||
    !weights ||
    // Only a formula the calculator accepts could have been saved.
    !calculateDough(input).ok ||
    !suggestYeast(fermentation, yeastType).ok
  ) {
    return undefined;
  }
  return { id, bakeDate, savedAt, input, fermentation, yeastType, yeastOverridden, weights };
}

function readInput(value: unknown): DoughInput | undefined {
  if (!isRecord(value)) return undefined;
  const percentages = readNumbers(value.percentages, ["hydration", "salt", "yeast"]);
  if (!percentages) return undefined;
  if (value.mode === "byDoughBalls") {
    const { ballCount, ballWeight } = readNumbers(value, ["ballCount", "ballWeight"]) ?? {};
    if (ballCount === undefined || ballWeight === undefined) return undefined;
    return { mode: "byDoughBalls", ballCount, ballWeight, percentages };
  }
  if (value.mode === "byFlour") {
    const { flourWeight } = readNumbers(value, ["flourWeight"]) ?? {};
    if (flourWeight === undefined) return undefined;
    if (value.ballWeight === undefined) return { mode: "byFlour", flourWeight, percentages };
    if (typeof value.ballWeight !== "number") return undefined;
    return { mode: "byFlour", flourWeight, ballWeight: value.ballWeight, percentages };
  }
  return undefined;
}

const readStage = (value: unknown): FermentationStage | undefined => readNumbers(value, ["hours", "temperature"]);

function readWeights(value: unknown): DoughWeights | undefined {
  const weights = readNumbers(value, ["flour", "water", "salt", "yeast", "doughWeight"]);
  if (!weights || !isRecord(value) || Object.values(weights).some((grams) => grams < 0)) return undefined;
  if (value.doughBalls === undefined) return weights;
  const doughBalls = readNumbers(value.doughBalls, ["count", "leftover"]);
  if (!doughBalls || !Number.isInteger(doughBalls.count) || doughBalls.count < 0 || doughBalls.leftover < 0) {
    return undefined;
  }
  return { ...weights, doughBalls };
}

function readComment(value: unknown): Comment | undefined {
  if (!isRecord(value)) return undefined;
  const { id, bakeId, body, createdAt } = value;
  if (!isId(id) || !isId(bakeId) || typeof body !== "string" || !isTimestamp(createdAt)) return undefined;
  return { id, bakeId, body, createdAt };
}

const isId = (value: unknown): value is string => typeof value === "string" && value !== "";

/** A real calendar day as "YYYY-MM-DD". */
const isDate = (value: unknown): value is string =>
  typeof value === "string" &&
  /^\d{4}-\d{2}-\d{2}$/.test(value) &&
  // An impossible day like 2026-13-45 is either invalid or rolls over to another date.
  !Number.isNaN(Date.parse(value)) &&
  new Date(value).toISOString().startsWith(value);

/** An ISO timestamp as the app writes them, e.g. "2026-11-20T12:00:00.000Z". */
const isTimestamp = (value: unknown): value is string =>
  typeof value === "string" && !Number.isNaN(Date.parse(value)) && new Date(value).toISOString() === value;

/** The named fields of `value`, if all of them are finite numbers. */
function readNumbers<K extends string>(value: unknown, keys: K[]): Record<K, number> | undefined {
  if (!isRecord(value)) return undefined;
  const numbers = {} as Record<K, number>;
  for (const key of keys) {
    const number = value[key];
    if (typeof number !== "number" || !Number.isFinite(number)) return undefined;
    numbers[key] = number;
  }
  return numbers;
}

/** Every item read, or undefined if `value` isn't a list or any item doesn't fit. */
function listOf<T>(value: unknown, read: (item: unknown) => T | undefined): T[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const items: T[] = [];
  for (const item of value) {
    const parsed = read(item);
    if (parsed === undefined) return undefined;
    items.push(parsed);
  }
  return items;
}

const hasUniqueIds = (items: { id: string }[]) => new Set(items.map(({ id }) => id)).size === items.length;

const failure = (reason: BackupError["reason"]): ParsedBackup => ({ ok: false, errors: [{ field: "file", reason }] });

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);
