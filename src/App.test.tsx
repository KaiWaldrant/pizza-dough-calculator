import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { App } from "./App";
import { text } from "./text";

describe("App", () => {
  it("shows the app title from the text module", () => {
    render(<App />);
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe(text.appTitle);
  });
});
