import type { roundForDisplay } from "../dough/roundForDisplay";
import { text } from "../text";

const t = text.calculator;

export function Results({ weights }: { weights: ReturnType<typeof roundForDisplay> }) {
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
