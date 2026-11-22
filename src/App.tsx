import { useState } from "react";
import type { Bake } from "./bakes/bake";
import type { BakeRepository } from "./bakes/bakeRepository";
import { BakeDetail } from "./bakes/BakeDetail";
import { History } from "./bakes/History";
import { latestSaved } from "./bakes/latestSaved";
import { Calculator } from "./calculator/Calculator";
import { text } from "./text";
import { useLoad } from "./useLoad";

type View =
  /** The calculator, starting from the formula of the Bake it was opened `from` (Bake again), else the latest. */
  | { name: "calculator"; from?: Bake }
  | { name: "history" }
  | { name: "bake"; id: string };

export function App({ repository }: { repository: BakeRepository }) {
  const [view, setView] = useState<View>({ name: "calculator" });

  return (
    <>
      <main>
        <h1>{text.appTitle}</h1>
        <nav aria-label={text.navigation.label}>
          {(["calculator", "history"] as const).map((option) => (
            <button
              key={option}
              type="button"
              aria-current={view.name === option ? "page" : undefined}
              onClick={() => setView(option === "calculator" ? { name: "calculator" } : { name: "history" })}
            >
              {text.navigation[option]}
            </button>
          ))}
        </nav>
        {view.name === "calculator" &&
          (view.from ? (
            <SavingCalculator key={view.from.id} repository={repository} startingBake={view.from} />
          ) : (
            <LatestCalculator repository={repository} />
          ))}
        {view.name === "history" && (
          <History repository={repository} onOpen={(id) => setView({ name: "bake", id })} />
        )}
        {view.name === "bake" && (
          <BakeDetail
            repository={repository}
            id={view.id}
            onBack={() => setView({ name: "history" })}
            onBakeAgain={(bake) => setView({ name: "calculator", from: bake })}
          />
        )}
      </main>
      {/* Set at build time, e.g. by the Docker build's APP_VERSION. */}
      <footer>{text.version(import.meta.env.VITE_APP_VERSION || text.devVersion)}</footer>
    </>
  );
}

/** The calculator, starting from the most recently saved Bake each time it opens. */
function LatestCalculator({ repository }: { repository: BakeRepository }) {
  // Without a readable history the calculator still works, starting from the defaults.
  const latestBake = useLoad(
    () =>
      repository
        .list()
        .then(latestSaved)
        .catch(() => null),
    [repository],
  );
  if (latestBake === undefined) return null;
  return <SavingCalculator repository={repository} startingBake={latestBake ?? undefined} />;
}

function SavingCalculator({ repository, startingBake }: { repository: BakeRepository; startingBake?: Bake }) {
  return (
    <Calculator
      startingBake={startingBake}
      onSave={async (bake) => {
        await repository.save(bake);
      }}
    />
  );
}
