import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { Calculator } from "./Calculator";

function resultFor(ingredient: string) {
  const row = screen.getByRole("row", { name: new RegExp(`^${ingredient}`) });
  return within(row).getAllByRole("cell").at(-1)?.textContent;
}

async function setField(label: string, value: string) {
  const input = screen.getByLabelText(label);
  await userEvent.clear(input);
  if (value !== "") await userEvent.type(input, value);
}

describe("Calculator", () => {
  it("shows the flour for the default dough", () => {
    // 4 × 250 g at 62% hydration, 3% salt and suggested fresh yeast for 24 h at 20 °C (0.084%):
    // flour = 1000 / 1.6508 ≈ 606 g
    render(<Calculator />);

    expect(resultFor("Flour")).toBe("606 g");
  });

  it("updates the results as soon as an input changes", async () => {
    render(<Calculator />);

    await setField("Hydration (%)", "70");

    // flour = 1000 / (1 + (70 + 3 + 0.084) / 100) ≈ 578 g; water = 70% ≈ 404 g
    expect(resultFor("Flour")).toBe("578 g");
    expect(resultFor("Water")).toBe("404 g");
  });

  it("suggests less yeast for instant dry than for fresh", async () => {
    render(<Calculator />);
    expect(resultFor("Yeast")).toBe("0.5 g"); // 0.084% fresh of 606 g

    await userEvent.selectOptions(screen.getByLabelText("Yeast type"), "Instant dry");

    expect(resultFor("Yeast")).toBe("0.2 g"); // 0.028% instant dry of 606 g
  });

  describe("yeast", () => {
    it("fills in the suggested yeast for the fermentation", () => {
      render(<Calculator />);

      expect(screen.getByLabelText("Yeast (%)")).toHaveProperty("value", "0.084");
      expect(screen.getByText("Suggested: 0.084%")).toBeTruthy();
      expect(screen.queryByText("Overridden")).toBeNull();
    });

    it("keeps an overridden yeast when the fermentation changes, until the suggestion is used again", async () => {
      render(<Calculator />);

      await setField("Yeast (%)", "0.2");
      expect(screen.getByText("Overridden")).toBeTruthy();
      expect(resultFor("Yeast")).toBe("1.2 g"); // 0.2% of 605 g

      await setField("Fermentation (h)", "48");
      expect(screen.getByLabelText("Yeast (%)")).toHaveProperty("value", "0.2");
      expect(resultFor("Yeast")).toBe("1.2 g");

      await userEvent.click(screen.getByRole("button", { name: "Use suggestion" }));
      // 48 h at 20 °C → 0.033% fresh
      expect(screen.getByLabelText("Yeast (%)")).toHaveProperty("value", "0.033");
      expect(screen.queryByText("Overridden")).toBeNull();
      expect(screen.queryByRole("button", { name: "Use suggestion" })).toBeNull();
    });

    it("drops an overridden yeast when the yeast type changes", async () => {
      // An override is a percentage of one yeast type; 0.2% fresh would be ~3× too much instant dry.
      render(<Calculator />);
      await setField("Yeast (%)", "0.2");

      await userEvent.selectOptions(screen.getByLabelText("Yeast type"), "Instant dry");

      // 24 h at 20 °C → 0.028% instant dry
      expect(screen.getByLabelText("Yeast (%)")).toHaveProperty("value", "0.028");
      expect(screen.queryByText("Overridden")).toBeNull();
    });
  });

  describe("by flour", () => {
    it("calculates from a flour weight and counts the dough balls it makes", async () => {
      render(<Calculator />);

      await userEvent.click(screen.getByRole("radio", { name: "By flour" }));
      expect(screen.queryByLabelText("Dough balls")).toBeNull();
      await setField("Flour (g)", "1000");
      await setField("Ball weight (g, optional)", "250");

      // dough weight = 1000 × (1 + 0.62 + 0.03 + 0.00084) ≈ 1651 g → 6 balls of 250 g, 151 g left over
      expect(resultFor("Flour")).toBe("1000 g");
      expect(resultFor("Water")).toBe("620 g");
      expect(resultFor("Dough balls")).toBe("6");
      expect(resultFor("Leftover")).toBe("151 g");
    });

    it("leaves out the dough balls without a ball weight", async () => {
      render(<Calculator />);

      await userEvent.click(screen.getByRole("radio", { name: "By flour" }));
      await setField("Ball weight (g, optional)", "");

      expect(resultFor("Flour")).toBe("1000 g");
      expect(screen.queryByRole("row", { name: /^Dough balls/ })).toBeNull();
    });
  });

  it("warns when the fermentation is outside the range the yeast model covers", async () => {
    render(<Calculator />);
    expect(screen.queryByText(/outside the range/)).toBeNull();

    await setField("Fermentation (h)", "120");

    expect(screen.getByText(/outside the range/)).toBeTruthy();
    expect(resultFor("Flour")).toMatch(/ g$/); // still calculates
  });

  describe("invalid input", () => {
    it.each([
      { field: "Hydration (%)", value: "", message: "Enter a number" },
      { field: "Dough balls", value: "0", message: "Must be more than 0" },
      { field: "Dough balls", value: "2.5", message: "Must be a whole number" },
      { field: "Salt (%)", value: "-1", message: "Can't be negative" },
      { field: "Fermentation (h)", value: "0", message: "Must be more than 0" },
      { field: "Yeast (%)", value: "", message: "Enter a number" },
    ])("explains what is wrong with $field '$value' and hides the results", async ({ field, value, message }) => {
      render(<Calculator />);

      await setField(field, value);

      const input = screen.getByLabelText(field);
      expect(input.getAttribute("aria-invalid")).toBe("true");
      const description = document.getElementById(input.getAttribute("aria-describedby") ?? "");
      expect(description?.textContent).toBe(message);
      expect(screen.queryByRole("table")).toBeNull();
    });

    it("does not blame the yeast field when the fermentation is invalid", async () => {
      render(<Calculator />);

      await setField("Temperature (°C)", "");

      expect(screen.getByLabelText("Yeast (%)").getAttribute("aria-invalid")).toBeNull();
    });
  });
});
