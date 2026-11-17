import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { text } from "./text";

const root = document.getElementById("root");
if (!root) throw new Error("Missing #root element");

document.title = text.appTitle;

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
