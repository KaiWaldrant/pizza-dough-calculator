import { text } from "../text";
import type { BakeRepository } from "./bakeRepository";
import { summarizeBake } from "./summarizeBake";
import { useLoad } from "../useLoad";

const t = text.bakes;

export function History({ repository, onOpen }: { repository: BakeRepository; onOpen: (id: string) => void }) {
  const bakes = useLoad(() => repository.list(), [repository]);

  if (bakes === undefined) return null;
  return (
    <section>
      <h2>{text.navigation.history}</h2>
      {bakes.length === 0 ? (
        <p>{t.noBakes}</p>
      ) : (
        <ul>
          {bakes.map((bake) => (
            <li key={bake.id}>
              <button type="button" onClick={() => onOpen(bake.id)}>
                <time dateTime={bake.bakeDate}>{bake.bakeDate}</time> {summarizeBake(bake)}
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
