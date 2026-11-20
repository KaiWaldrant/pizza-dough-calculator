import { useId, useState } from "react";
import { calculateDough, type DoughInput, type InputError } from "../dough/calculateDough";
import { roundForDisplay } from "../dough/roundForDisplay";
import { text } from "../text";
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

type Mode = DoughInput["mode"];
type ErrorReason = InputError["reason"];
/** Which input each error belongs to: a form field, or the yeast field. */
type FieldErrors = Partial<Record<keyof Fields | "yeast", ErrorReason>>;

const toNumber = (value: string) => (value.trim() === "" ? Number.NaN : Number(value));

// Two significant digits keep very small suggestions (e.g. 0.00050%) from rounding to nothing.
const formatPercentage = (percentage: number) => String(Number(percentage.toPrecision(2)));

export function Calculator() {
  const [mode, setMode] = useState<Mode>("byDoughBalls");
  const [fields, setFields] = useState(defaults);
  const [yeastType, setYeastType] = useState<YeastType>("fresh");
  /** The yeast % the baker typed in place of the suggestion, or null to use the suggestion. */
  const [overriddenYeast, setOverriddenYeast] = useState<string | null>(null);

  const suggestion = suggestYeast(
    [{ hours: toNumber(fields.hours), temperature: toNumber(fields.temperature) }],
    yeastType,
  );
  const suggestedYeast = suggestion.ok ? formatPercentage(suggestion.percentage) : "";
  const yeast =
    overriddenYeast !== null ? toNumber(overriddenYeast) : suggestion.ok ? suggestion.percentage : Number.NaN;

  const percentages = { hydration: toNumber(fields.hydration), salt: toNumber(fields.salt), yeast };
  const result = calculateDough(
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
        },
  );

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

function Results({ weights }: { weights: ReturnType<typeof roundForDisplay> }) {
  const rows: [string, number][] = [
    [t.flour, weights.flour],
    [t.water, weights.water],
    [t.saltResult, weights.salt],
    [t.yeastResult, weights.yeast],
    [t.doughWeight, weights.doughWeight],
  ];
  const { doughBalls } = weights;
  return (
    <table>
      <caption>{t.results}</caption>
      <thead>
        <tr>
          <th scope="col">{t.ingredient}</th>
          <th scope="col">{t.weight}</th>
        </tr>
      </thead>
      <tbody>
        {rows.map(([label, grams]) => (
          <tr key={label}>
            <th scope="row">{label}</th>
            <td>{t.grams(grams)}</td>
          </tr>
        ))}
        {doughBalls && (
          <>
            <tr>
              <th scope="row">{t.doughBallsResult}</th>
              <td>{doughBalls.count}</td>
            </tr>
            <tr>
              <th scope="row">{t.leftover}</th>
              <td>{t.grams(doughBalls.leftover)}</td>
            </tr>
          </>
        )}
      </tbody>
    </table>
  );
}
