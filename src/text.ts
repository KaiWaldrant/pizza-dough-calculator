import type { ImportResult } from "./bakes/backup";

const count = (n: number, noun: string) => `${n} ${noun}${n === 1 ? "" : "s"}`;

// All user-facing text lives here, so a translation can be added later
// without hunting through components.
export const text = {
  appTitle: "Pizza Dough Calculator",
  calculator: {
    mode: "Calculate",
    byDoughBalls: "By dough balls",
    byFlour: "By flour",
    ballCount: "Dough balls",
    flourWeight: "Flour (g)",
    ballWeight: "Ball weight (g)",
    optionalBallWeight: "Ball weight (g, optional)",
    hydration: "Hydration (%)",
    salt: "Salt (%)",
    yeastType: "Yeast type",
    yeastTypes: { fresh: "Fresh", activeDry: "Active dry", instantDry: "Instant dry" },
    fermentationHours: "Fermentation (h)",
    fermentationTemperature: "Temperature (°C)",
    yeast: "Yeast (%)",
    suggestedYeast: (percentage: string) => `Suggested: ${percentage}%`,
    overridden: "Overridden",
    useSuggestion: "Use suggestion",
    outOfRange: (hours: { min: number; max: number }, temperature: { min: number; max: number }) =>
      `This fermentation is outside the range the yeast model covers (${hours.min}–${hours.max} h, ${temperature.min}–${temperature.max} °C), so treat the suggestion as a rough guide.`,
    results: "Ingredients",
    ingredient: "Ingredient",
    weight: "Weight",
    flour: "Flour",
    water: "Water",
    saltResult: "Salt",
    yeastResult: "Yeast",
    doughWeight: "Dough weight",
    doughBallsResult: "Dough balls",
    leftover: "Leftover",
    grams: (grams: number) => `${grams} g`,
    bakeDate: "Bake date",
    saveBake: "Save bake",
    bakeSaved: "Bake saved",
    errors: {
      mustBeANumber: "Enter a number",
      mustBePositive: "Must be more than 0",
      mustBeWholeNumber: "Must be a whole number",
      mustNotBeNegative: "Can't be negative",
    },
  },
  navigation: { label: "Views", calculator: "Calculator", history: "History" },
  bakes: {
    noBakes: "No bakes saved yet.",
    bakeOf: (bakeDate: string) => `Bake of ${bakeDate}`,
    fermentation: "Fermentation",
    yeastPercentage: (percentage: string, overridden: boolean) =>
      overridden ? `${percentage}% (overridden)` : `${percentage}%`,
    percentage: (percentage: number) => `${percentage}%`,
    backToHistory: "Back to history",
    bakeAgain: "Bake again",
    delete: "Delete",
    confirmDelete: "Delete this bake? This can't be undone.",
    exportHistory: "Export",
    importHistory: "Import",
    backupFileName: (date: string) => `pizza-dough-bakes-${date}.json`,
    imported: ({ bakesAdded, bakesSkipped, commentsAdded }: ImportResult) =>
      `Added ${count(bakesAdded, "bake")} and ${count(commentsAdded, "comment")}, ` +
      `skipped ${count(bakesSkipped, "bake")}.`,
    notABackup: "This file isn't a Bake history backup. Nothing was imported.",
    otherVersion: "This backup comes from a different version of the app, so it can't be read. Nothing was imported.",
    importFailed: "The import failed. Nothing was imported.",
    exportFailed: "The export failed.",
    comments: "Comments",
    comment: "Comment",
    addComment: "Add comment",
    deleteComment: "Delete comment",
    confirmDeleteComment: "Delete this comment? This can't be undone.",
    commentedAt: (createdAt: string) =>
      new Date(createdAt).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" }),
    summary: {
      byDoughBalls: (ballCount: number, ballWeight: number) => `${ballCount} × ${ballWeight} g`,
      byFlour: (flourWeight: number) => `${flourWeight} g flour`,
      yeast: (yeastType: string, percentage: string) => `${yeastType} ${percentage}%`,
      fermentationStage: (hours: number, temperature: number) => `${hours} h @ ${temperature} °C`,
      separator: " · ",
    },
  },
} as const;
