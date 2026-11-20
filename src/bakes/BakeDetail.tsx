import { formatPercentage } from "../dough/formatPercentage";
import { roundForDisplay } from "../dough/roundForDisplay";
import { Results } from "../calculator/Results";
import { text } from "../text";
import type { BakeRepository } from "./bakeRepository";
import { useLoad } from "../useLoad";

const t = text.bakes;
const c = text.calculator;

/** A saved Bake, read-only: its formula can never be edited after saving. */
export function BakeDetail(props: { repository: BakeRepository; id: string; onBack: () => void }) {
  const { repository, id } = props;
  const bake = useLoad(() => repository.get(id), [repository, id]);

  if (!bake) return null;
  const { input, weights } = bake;
  const rows: [string, string][] = [
    [c.mode, c[input.mode]],
    ...(input.mode === "byDoughBalls"
      ? ([[c.ballCount, String(input.ballCount)], [c.ballWeight, String(input.ballWeight)]] as [string, string][])
      : ([
          [c.flourWeight, String(input.flourWeight)],
          ...(input.ballWeight === undefined ? [] : [[c.ballWeight, String(input.ballWeight)]]),
        ] as [string, string][])),
    [c.hydration, t.percentage(input.percentages.hydration)],
    [c.salt, t.percentage(input.percentages.salt)],
    [c.yeastType, c.yeastTypes[bake.yeastType]],
    [c.yeast, t.yeastPercentage(formatPercentage(input.percentages.yeast), bake.yeastOverridden)],
    ...bake.fermentation.map(
      (stage): [string, string] => [t.fermentation, t.summary.fermentationStage(stage.hours, stage.temperature)],
    ),
  ];
  const headingId = `bake-${bake.id}`;

  return (
    <section aria-labelledby={headingId}>
      <h2 id={headingId}>{t.bakeOf(bake.bakeDate)}</h2>
      <dl>
        {rows.map(([term, value]) => (
          <div key={term}>
            <dt>{term}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
      <Results weights={roundForDisplay(weights)} />
      <p>
        <button type="button" onClick={props.onBack}>
          {t.backToHistory}
        </button>{" "}
        <button
          type="button"
          onClick={async () => {
            if (!window.confirm(t.confirmDelete)) return;
            await repository.delete(bake.id);
            props.onBack();
          }}
        >
          {t.delete}
        </button>
      </p>
    </section>
  );
}
