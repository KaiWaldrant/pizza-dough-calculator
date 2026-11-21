import { useId, useRef, useState } from "react";
import { calculateDough, type DoughInput, type InputError } from "../dough/calculateDough";
import { formatPercentage } from "../dough/formatPercentage";
import { roundForDisplay } from "../dough/roundForDisplay";
import type { Bake, NewBake } from "../bakes/bake";
import { text } from "../text";
import { Results } from "./Results";
import { MODEL_HOURS, MODEL_TEMPERATURE, suggestYeast, type YeastType } from "../yeast/suggestYeast";

const t = text.calculator;

/** Form fields are kept as typed text; an empty field becomes NaN when parsed. */
type Fields = {
  ballCount: string;
  flourWeight: string;
  ballWeight: string;
  hydration: string;
  salt: string;
  hours: string;
  temperature: string;
};

const defaults: Fields = {
  ballCount: "4",
  flourWeight: "1000",
  ballWeight: "250",
  hydration: "62",
  salt: "3",
  hours: "24",
  temperature: "20",
};

/** The form as a saved Bake left it, so the baker can start from that Bake's formula. */
const fieldsFrom = ({ input, fermentation }: Bake): Fields => ({
  ...defaults,
  ...(input.mode === "byDoughBalls"
    ? { ballCount: String(input.ballCount), ballWeight: String(input.ballWeight) }
    : {
        flourWeight: String(input.flourWeight),
        ballWeight: input.ballWeight === undefined ? "" : String(input.ballWeight),
      }),
  hydration: String(input.percentages.hydration),
  salt: String(input.percentages.salt),
  // The calculator describes fermentation as a single stage.
  hours: fermentation[0] ? String(fermentation[0].hours) : defaults.hours,
  temperature: fermentation[0] ? String(fermentation[0].temperature) : defaults.temperature,
});

type Mode = DoughInput["mode"];
type ErrorReason = InputError["reason"];
/** Which input each error belongs to: a form field, or the yeast field. */
type FieldErrors = Partial<Record<keyof Fields | "yeast", ErrorReason>>;

/** Today's date in the baker's time zone, as "YYYY-MM-DD". */
const today = () => {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
};

const toNumber = (value: string) => (value.trim() === "" ? Number.NaN : Number(value));

export function Calculator({
  startingBake,
  onSave,
}: {
  /** The Bake whose formula the form starts from; the defaults are used without one. */
  startingBake?: Bake;
  onSave?: (bake: NewBake) => Promise<void>;
}) {
  const [mode, setMode] = useState<Mode>(startingBake?.input.mode ?? "byDoughBalls");
  const [fields, setFields] = useState(() => (startingBake ? fieldsFrom(startingBake) : defaults));
  const [yeastType, setYeastType] = useState<YeastType>(startingBake?.yeastType ?? "fresh");
  /** The yeast % the baker typed in place of the suggestion, or null to use the suggestion. */
  const [overriddenYeast, setOverriddenYeast] = useState<string | null>(
    startingBake?.yeastOverridden ? String(startingBake.input.percentages.yeast) : null,
  );
  const [bakeDate, setBakeDate] = useState(today);
  /** The form as it was last saved, so "Bake saved" clears and Save re-enables on the next edit. */
  const [savedForm, setSavedForm] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  // A ref, unlike state, already blocks the second click of a double-click.
  const savingRef = useRef(false);

  const fermentation = [{ hours: toNumber(fields.hours), temperature: toNumber(fields.temperature) }];
  const suggestion = suggestYeast(fermentation, yeastType);
  const suggestedYeast = suggestion.ok ? formatPercentage(suggestion.percentage) : "";
  const yeast =
    overriddenYeast !== null ? toNumber(overriddenYeast) : suggestion.ok ? suggestion.percentage : Number.NaN;

  const percentages = { hydration: toNumber(fields.hydration), salt: toNumber(fields.salt), yeast };
  const input: DoughInput =
    mode === "byDoughBalls"
      ? {
          mode,
          ballCount: toNumber(fields.ballCount),
          ballWeight: toNumber(fields.ballWeight),
          percentages,
        }
      : {
          mode,
          flourWeight: toNumber(fields.flourWeight),
          // The ball weight is optional here: leave it empty to skip counting dough balls.
          ballWeight: fields.ballWeight.trim() === "" ? undefined : toNumber(fields.ballWeight),
          percentages,
        };
  const result = calculateDough(input);

  const errors: FieldErrors = {};
  if (!suggestion.ok) {
    for (const error of suggestion.errors) {
      if ("field" in error) errors[error.field] ??= error.reason;
    }
  }
  if (!result.ok) {
    for (const error of result.errors) {
      // Without an override, a missing yeast % comes from an invalid fermentation, reported there.
      if (error.field === "yeast" && overriddenYeast === null) continue;
      errors[error.field] ??= error.reason;
    }
  }

  const form = JSON.stringify({ mode, fields, yeastType, overriddenYeast, bakeDate });
  const saved = savedForm === form;
  // The snapshot stores the fermentation too, so it must be valid even when the yeast is overridden.
  const canSave = result.ok && suggestion.ok && bakeDate !== "" && !saving && !saved;

  const numberField = (name: keyof Fields, label: string) => (
    <NumberField
      label={label}
      value={fields[name]}
      error={errors[name]}
      onChange={(value) => setFields({ ...fields, [name]: value })}
    />
  );

  return (
    <form onSubmit={(event) => event.preventDefault()}>
      <fieldset>
        <legend>{t.mode}</legend>
        {(["byDoughBalls", "byFlour"] as const).map((option) => (
          <label key={option}>
            <input type="radio" name="mode" checked={mode === option} onChange={() => setMode(option)} />
            {t[option]}
          </label>
        ))}
      </fieldset>
      {mode === "byDoughBalls" ? numberField("ballCount", t.ballCount) : numberField("flourWeight", t.flourWeight)}
      {numberField("ballWeight", mode === "byDoughBalls" ? t.ballWeight : t.optionalBallWeight)}
      {numberField("hydration", t.hydration)}
      {numberField("salt", t.salt)}
      <label>
        {t.yeastType}
        <select
          value={yeastType}
          onChange={(event) => {
            setYeastType(event.target.value as YeastType);
            // An override is a percentage of the previous yeast type, so it no longer applies.
            setOverriddenYeast(null);
          }}
        >
          {(Object.keys(t.yeastTypes) as YeastType[]).map((type) => (
            <option key={type} value={type}>
              {t.yeastTypes[type]}
            </option>
          ))}
        </select>
      </label>
      {numberField("hours", t.fermentationHours)}
      {numberField("temperature", t.fermentationTemperature)}
      <NumberField
        label={t.yeast}
        value={overriddenYeast ?? suggestedYeast}
        error={errors.yeast}
        onChange={setOverriddenYeast}
      />
      {suggestion.ok && <p>{t.suggestedYeast(suggestedYeast)}</p>}
      {suggestion.ok && suggestion.outOfRange && <p role="note">{t.outOfRange(MODEL_HOURS, MODEL_TEMPERATURE)}</p>}
      {overriddenYeast !== null && (
        <p>
          <strong>{t.overridden}</strong>{" "}
          <button type="button" onClick={() => setOverriddenYeast(null)}>
            {t.useSuggestion}
          </button>
        </p>
      )}

      {result.ok && <Results weights={roundForDisplay(result.weights)} />}

      {onSave && (
        <p>
          <label>
            {t.bakeDate}
            <input type="date" value={bakeDate} onChange={(event) => setBakeDate(event.target.value)} />
          </label>{" "}
          <button
            type="button"
            disabled={!canSave}
            onClick={async () => {
              if (!canSave || !result.ok || savingRef.current) return;
              savingRef.current = true;
              setSaving(true);
              try {
                const yeastOverridden = overriddenYeast !== null;
                await onSave({ bakeDate, input, fermentation, yeastType, yeastOverridden, weights: result.weights });
                setSavedForm(form);
              } finally {
                savingRef.current = false;
                setSaving(false);
              }
            }}
          >
            {t.saveBake}
          </button>{" "}
          <span role="status">{saved && t.bakeSaved}</span>
        </p>
      )}
    </form>
  );
}

function NumberField(props: {
  label: string;
  value: string;
  error: ErrorReason | undefined;
  onChange: (value: string) => void;
}) {
  const id = useId();
  const errorId = `${id}-error`;
  return (
    <div>
      <label htmlFor={id}>{props.label}</label>
      <input
        id={id}
        type="number"
        inputMode="decimal"
        value={props.value}
        aria-invalid={props.error ? true : undefined}
        aria-describedby={props.error ? errorId : undefined}
        onChange={(event) => props.onChange(event.target.value)}
      />
      {props.error && <span id={errorId}>{t.errors[props.error]}</span>}
    </div>
  );
}
