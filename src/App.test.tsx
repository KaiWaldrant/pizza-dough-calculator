import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { IDBFactory } from "fake-indexeddb";
import { afterEach, describe, expect, it, vi } from "vitest";
import { App } from "./App";
import type { NewBake } from "./bakes/bake";
import { openBakeRepository } from "./bakes/bakeRepository";
import { tickingClock } from "./bakes/tickingClock";
import { text } from "./text";

/** A repository on a fresh database whose clock ticks a minute per save, so ordering is deterministic. */
const newRepository = () => openBakeRepository(new IDBFactory(), { now: tickingClock() });

async function setField(label: string, value: string) {
  const input = await screen.findByLabelText(label);
  await userEvent.clear(input);
  if (value !== "") await userEvent.type(input, value);
}

afterEach(() => {
  vi.restoreAllMocks();
});

async function openSavedBake(repository = newRepository(), comments: string[] = []) {
  const bake = await repository.save(savedBake);
  for (const comment of comments) await repository.addComment(bake.id, comment);
  render(<App repository={repository} />);
  await userEvent.click(await screen.findByRole("button", { name: "History" }));
  await userEvent.click(await screen.findByRole("button", { name: /2026-11-01/ }));
  return screen.findByRole("region", { name: "Bake of 2026-11-01" });
}

describe("App", () => {
  it("shows the app title from the text module", async () => {
    render(<App repository={newRepository()} />);
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe(text.appTitle);
  });

  it("saves a Bake from the calculator and lists it in the history", async () => {
    render(<App repository={newRepository()} />);

    await setField("Bake date", "2026-11-14");
    await userEvent.click(await screen.findByRole("button", { name: "Save bake" }));
    await screen.findByText("Bake saved");
    await userEvent.click(screen.getByRole("button", { name: "History" }));

    const item = await screen.findByRole("listitem");
    expect(item.textContent).toContain("2026-11-14");
    expect(item.textContent).toContain("4 × 250 g · 62% · fresh 0.084% · 24 h @ 20 °C");
  });

  it("doesn't save a Bake with an invalid fermentation, even when the yeast is overridden", async () => {
    render(<App repository={newRepository()} />);

    await setField("Yeast (%)", "0.1");
    await setField("Fermentation (h)", "");

    expect((screen.getByRole("button", { name: "Save bake" }) as HTMLButtonElement).disabled).toBe(true);
  });

  it("doesn't save a Bake without a bake date", async () => {
    render(<App repository={newRepository()} />);

    await setField("Bake date", "");

    expect((screen.getByRole("button", { name: "Save bake" }) as HTMLButtonElement).disabled).toBe(true);
  });

  it("saves one Bake when Save bake is double-clicked", async () => {
    render(<App repository={newRepository()} />);

    await userEvent.dblClick(await screen.findByRole("button", { name: "Save bake" }));
    await screen.findByText("Bake saved");
    await userEvent.click(screen.getByRole("button", { name: "History" }));

    await screen.findByRole("listitem");
    expect(screen.getAllByRole("listitem")).toHaveLength(1);
  });

  it("clears Bake saved and allows saving again once the formula is edited", async () => {
    render(<App repository={newRepository()} />);
    await userEvent.click(await screen.findByRole("button", { name: "Save bake" }));
    await screen.findByText("Bake saved");

    await setField("Hydration (%)", "70");

    expect(screen.queryByText("Bake saved")).toBeNull();
    expect((screen.getByRole("button", { name: "Save bake" }) as HTMLButtonElement).disabled).toBe(false);
  });

  it("shows a Bake's saved grams read-only, not grams recalculated with today's yeast model", async () => {
    const repository = newRepository();
    // 0.07% of 605 g would be 0.4 g of yeast; the snapshot says 7.3 g, as if an older model had suggested more.
    await repository.save({ ...savedBake, weights: { ...savedBake.weights, yeast: 7.3 } });
    render(<App repository={repository} />);

    await userEvent.click(await screen.findByRole("button", { name: "History" }));
    await userEvent.click(await screen.findByRole("button", { name: /2026-11-01/ }));

    const detail = await screen.findByRole("region", { name: "Bake of 2026-11-01" });
    expect(resultIn(detail, "Yeast")).toBe("7.3 g");
    expect(resultIn(detail, "Flour")).toBe("605 g");
    expect(within(detail).getByText("0.07% (overridden)")).toBeDefined();
    expect(within(detail).queryAllByRole("spinbutton")).toEqual([]);
  });

  it("deletes a Bake once the baker confirms", async () => {
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(true);
    const detail = await openSavedBake();

    await userEvent.click(within(detail).getByRole("button", { name: "Delete" }));

    expect(confirm).toHaveBeenCalledWith("Delete this bake? This can't be undone.");
    expect(await screen.findByText("No bakes saved yet.")).toBeDefined();
  });

  it("keeps a Bake when the baker cancels the delete", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(false);
    const detail = await openSavedBake();

    await userEvent.click(within(detail).getByRole("button", { name: "Delete" }));

    expect(screen.getByRole("region", { name: "Bake of 2026-11-01" })).toBeDefined();
  });

  it("adds comments to a Bake and shows them oldest first", async () => {
    const detail = await openSavedBake();

    await userEvent.type(within(detail).getByLabelText("Comment"), "slack at 6 h");
    await userEvent.click(within(detail).getByRole("button", { name: "Add comment" }));
    await userEvent.type(within(detail).getByLabelText("Comment"), "great oven spring");
    await userEvent.click(within(detail).getByRole("button", { name: "Add comment" }));

    await waitFor(() =>
      expect(commentsIn(detail)).toEqual([
        expect.stringContaining("slack at 6 h"),
        expect.stringContaining("great oven spring"),
      ]),
    );
    expect((within(detail).getByLabelText("Comment") as HTMLTextAreaElement).value).toBe("");
  });

  it("deletes a comment once the baker confirms", async () => {
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(true);
    const repository = newRepository();
    const detail = await openSavedBake(repository, ["slack at 6 h", "typo"]);
    await waitFor(() => expect(commentsIn(detail)).toHaveLength(2));

    const typo = within(detail).getAllByRole("listitem")[1]!;
    await userEvent.click(within(typo).getByRole("button", { name: "Delete comment" }));

    expect(confirm).toHaveBeenCalledWith("Delete this comment? This can't be undone.");
    await waitFor(() => expect(commentsIn(detail)).toEqual([expect.stringContaining("slack at 6 h")]));
  });

  it("deletes two comments clicked in quick succession", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    const detail = await openSavedBake(newRepository(), ["first", "second"]);
    await waitFor(() => expect(commentsIn(detail)).toHaveLength(2));

    const [first, second] = within(detail).getAllByRole("button", { name: "Delete comment" });
    fireEvent.click(first!);
    fireEvent.click(second!);

    await waitFor(() => expect(commentsIn(detail)).toEqual([]));
  });

  it("keeps a comment when the baker cancels the delete", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(false);
    const detail = await openSavedBake(newRepository(), ["slack at 6 h"]);
    await waitFor(() => expect(commentsIn(detail)).toHaveLength(1));

    await userEvent.click(within(detail).getByRole("button", { name: "Delete comment" }));

    expect(commentsIn(detail)).toHaveLength(1);
  });

  it("doesn't add a blank comment", async () => {
    const detail = await openSavedBake();

    await userEvent.type(within(detail).getByLabelText("Comment"), "   ");

    expect((within(detail).getByRole("button", { name: "Add comment" }) as HTMLButtonElement).disabled).toBe(true);
  });

  describe("Bake again", () => {
    /** Saves an older Bake to bake again, then a newer one, so the calculator's usual start differs. */
    async function bakeAgain(older: NewBake) {
      const repository = newRepository();
      await repository.save(older);
      await repository.save({
        ...savedBake,
        bakeDate: "2026-11-15",
        input: { mode: "byFlour", flourWeight: 1500, percentages: { hydration: 70, salt: 2, yeast: 0.2 } },
        yeastType: "activeDry",
      });
      render(<App repository={repository} />);
      await userEvent.click(await screen.findByRole("button", { name: "History" }));
      await userEvent.click(await screen.findByRole("button", { name: /2026-11-01/ }));
      await userEvent.click(await screen.findByRole("button", { name: "Bake again" }));
      await screen.findByLabelText("Hydration (%)");
      return repository;
    }

    it("loads the Bake's formula with an overridden yeast as an override", async () => {
      await bakeAgain(savedBake);

      expect((screen.getByRole("radio", { name: "By dough balls" }) as HTMLInputElement).checked).toBe(true);
      expect(valueOf("Dough balls")).toBe("4");
      expect(valueOf("Ball weight (g)")).toBe("250");
      expect(valueOf("Hydration (%)")).toBe("62");
      expect(valueOf("Salt (%)")).toBe("3");
      expect(valueOf("Yeast type")).toBe("fresh");
      expect(valueOf("Fermentation (h)")).toBe("24");
      expect(valueOf("Temperature (°C)")).toBe("20");
      expect(valueOf("Yeast (%)")).toBe("0.07");
      expect(screen.getByText("Overridden")).toBeDefined();
    });

    it("uses the current suggested yeast when the Bake's yeast wasn't overridden", async () => {
      // Stored as 0.5%, but fresh yeast for 24 h at 20 °C is suggested at 0.084% today.
      await bakeAgain({
        ...savedBake,
        input: { ...savedBake.input, percentages: { hydration: 62, salt: 3, yeast: 0.5 } },
        yeastOverridden: false,
      });

      expect(valueOf("Yeast (%)")).toBe("0.084");
      expect(screen.queryByText("Overridden")).toBeNull();
    });

    it("saves a new Bake and leaves the original unchanged", async () => {
      const repository = await bakeAgain(savedBake);
      const [, original] = await repository.list();

      await setField("Hydration (%)", "65");
      await userEvent.click(screen.getByRole("button", { name: "Save bake" }));
      await screen.findByText("Bake saved");

      const bakes = await repository.list();
      expect(bakes).toHaveLength(3);
      expect(bakes).toContainEqual(original);
      const added = bakes.find((bake) => bake.id !== original?.id && bake.bakeDate !== "2026-11-15");
      expect(added?.input.percentages.hydration).toBe(65);
      // The bake date starts again at today, not at the original's bake date ("en-CA" formats as YYYY-MM-DD).
      expect(added?.bakeDate).toBe(new Date().toLocaleDateString("en-CA"));
    });
  });

  it("opens the calculator with the most recently saved Bake's formula, even if it has an older bake date", async () => {
    const repository = newRepository();
    await repository.save({ ...savedBake, bakeDate: "2026-11-15" });
    await repository.save({
      ...savedBake,
      bakeDate: "2026-10-01",
      input: { mode: "byFlour", flourWeight: 1500, percentages: { hydration: 65, salt: 2.5, yeast: 0.05 } },
      fermentation: [{ hours: 48, temperature: 4 }],
      yeastType: "instantDry",
      yeastOverridden: true,
    });

    render(<App repository={repository} />);

    expect((await screen.findByRole("radio", { name: "By flour" }) as HTMLInputElement).checked).toBe(true);
    expect(valueOf("Flour (g)")).toBe("1500");
    expect(valueOf("Ball weight (g, optional)")).toBe("");
    expect(valueOf("Hydration (%)")).toBe("65");
    expect(valueOf("Salt (%)")).toBe("2.5");
    expect(valueOf("Yeast type")).toBe("instantDry");
    expect(valueOf("Yeast (%)")).toBe("0.05");
    expect(screen.getByText("Overridden")).toBeDefined();
    expect(valueOf("Fermentation (h)")).toBe("48");
    expect(valueOf("Temperature (°C)")).toBe("4");
  });

  it("opens the calculator with the next most recent Bake once the latest is deleted", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    const repository = newRepository();
    const withHydration = (bakeDate: string, hydration: number): NewBake => ({
      ...savedBake,
      bakeDate,
      input: { ...savedBake.input, percentages: { hydration, salt: 3, yeast: 0.07 } },
    });
    await repository.save(withHydration("2026-10-01", 65));
    await repository.save(withHydration("2026-11-01", 70));
    render(<App repository={repository} />);
    await screen.findByLabelText("Hydration (%)");

    await userEvent.click(screen.getByRole("button", { name: "History" }));
    await userEvent.click(await screen.findByRole("button", { name: /2026-11-01/ }));
    await userEvent.click(await screen.findByRole("button", { name: "Delete" }));
    await screen.findByRole("button", { name: /2026-10-01/ });
    await userEvent.click(screen.getByRole("button", { name: "Calculator" }));

    await screen.findByLabelText("Hydration (%)");
    expect(valueOf("Hydration (%)")).toBe("65");
  });

  it("opens the calculator with the defaults when the history can't be read", async () => {
    const repository = { ...newRepository(), list: () => Promise.reject(new Error("IndexedDB unavailable")) };

    render(<App repository={repository} />);

    await screen.findByLabelText("Hydration (%)");
    expect(valueOf("Hydration (%)")).toBe("62");
  });

  it("opens the calculator with a Bake's formula just after it is saved", async () => {
    render(<App repository={newRepository()} />);

    await setField("Hydration (%)", "70");
    await userEvent.click(screen.getByRole("button", { name: "Save bake" }));
    await screen.findByText("Bake saved");
    await userEvent.click(screen.getByRole("button", { name: "History" }));
    await userEvent.click(screen.getByRole("button", { name: "Calculator" }));

    expect(valueOf("Hydration (%)")).toBe("70");
  });
});

function valueOf(label: string) {
  return (screen.getByLabelText(label) as HTMLInputElement | HTMLSelectElement).value;
}

const savedBake: NewBake = {
  bakeDate: "2026-11-01",
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

function resultIn(container: HTMLElement, ingredient: string) {
  const row = within(container).getByRole("row", { name: new RegExp(`^${ingredient}`) });
  return within(row).getAllByRole("cell").at(-1)?.textContent;
}

function commentsIn(detail: HTMLElement) {
  const list = within(detail).queryByRole("list", { name: "Comments" });
  return list ? within(list).getAllByRole("listitem").map((comment) => comment.textContent) : [];
}
