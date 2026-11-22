import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { openBakeRepository } from "./bakes/bakeRepository";
import { applyTheme, initialTheme, ThemeSwitcher } from "./prototype-styling/ThemeSwitcher";
import { text } from "./text";

// PROTOTYPE (issue #23): dev builds swap whole stylesheets via ?theme=; production keeps index.css.
if (import.meta.env.DEV) applyTheme(initialTheme());
else void import("./index.css");

const repository = openBakeRepository();

const root = document.getElementById("root");
if (!root) throw new Error("Missing #root element");

document.title = text.appTitle;

createRoot(root).render(
  <StrictMode>
    <App repository={repository} />
    {import.meta.env.DEV && <ThemeSwitcher />}
  </StrictMode>,
);
