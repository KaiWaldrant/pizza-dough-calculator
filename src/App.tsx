import { useState } from "react";
import type { BakeRepository } from "./bakes/bakeRepository";
import { BakeDetail } from "./bakes/BakeDetail";
import { History } from "./bakes/History";
import { latestSaved } from "./bakes/latestSaved";
import { Calculator } from "./calculator/Calculator";
import { text } from "./text";
import { useLoad } from "./useLoad";

type View = { name: "calculator" | "history" } | { name: "bake"; id: string };

export function App({ repository }: { repository: BakeRepository }) {
  const [view, setView] = useState<View>({ name: "calculator" });

  return (
    <main>
      <h1>{text.appTitle}</h1>
      <nav aria-label={text.navigation.label}>
        {(["calculator", "history"] as const).map((option) => (
          <button
            key={option}
            type="button"
            aria-current={view.name === option ? "page" : undefined}
            onClick={() => setView({ name: option })}
          >
            {text.navigation[option]}
          </button>
        ))}
      </nav>
      {view.name === "calculator" && <CalculatorView repository={repository} />}
      {view.name === "history" && (
        <History repository={repository} onOpen={(id) => setView({ name: "bake", id })} />
      )}
      {view.name === "bake" && (
        <BakeDetail repository={repository} id={view.id} onBack={() => setView({ name: "history" })} />
      )}
    </main>
  );
}

/** The calculator, starting from the most recently saved Bake each time it opens. */
function CalculatorView({ repository }: { repository: BakeRepository }) {
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
  return (
    <Calculator
      startingBake={latestBake ?? undefined}
      onSave={async (bake) => {
        await repository.save(bake);
      }}
    />
  );
}
