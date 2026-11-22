/* PROTOTYPE (issue #23), throwaway. Three styling directions on the real app, switchable via
   `?theme=` and a floating bottom bar. Dev builds only; production keeps index.css. */
import { useEffect, useState } from "react";
import current from "../index.css?inline";
import neapolitan from "./neapolitan.css?inline";
import bakery from "./bakery.css?inline";
import modern from "./modern.css?inline";

const themes = [
  { key: "current", name: "Current", css: current, favicon: "#888" },
  { key: "neapolitan", name: "A · Neapolitan", css: neapolitan, favicon: "#c8321f" },
  { key: "bakery", name: "B · Bakery", css: bakery, favicon: "#8a4b1c" },
  { key: "modern", name: "C · Clean modern", css: modern, favicon: "#e4572e" },
] as const;

const keyFromUrl = () => {
  const key = new URLSearchParams(location.search).get("theme");
  return themes.some((t) => t.key === key) ? key! : "neapolitan";
};

/** Installs the theme's stylesheet and favicon. */
export function applyTheme(key: string) {
  const theme = themes.find((t) => t.key === key) ?? themes[0];
  let style = document.getElementById("prototype-theme") as HTMLStyleElement | null;
  if (!style) {
    style = document.createElement("style");
    style.id = "prototype-theme";
    document.head.append(style);
  }
  style.textContent = theme.css;
  let icon = document.querySelector<HTMLLinkElement>("link[rel=icon]");
  if (!icon) {
    icon = document.createElement("link");
    icon.rel = "icon";
    document.head.append(icon);
  }
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><circle cx="16" cy="16" r="14" fill="${theme.favicon}"/><circle cx="16" cy="16" r="10" fill="#f6d27a"/><circle cx="12" cy="13" r="2.2" fill="${theme.favicon}"/><circle cx="20" cy="15" r="2.2" fill="${theme.favicon}"/><circle cx="15" cy="21" r="2.2" fill="${theme.favicon}"/></svg>`;
  icon.href = `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

export const initialTheme = keyFromUrl;

export function ThemeSwitcher() {
  const [key, setKey] = useState(keyFromUrl);
  const index = themes.findIndex((t) => t.key === key);

  const go = (step: number) => {
    const next = themes[(index + step + themes.length) % themes.length]!.key;
    const url = new URL(location.href);
    url.searchParams.set("theme", next);
    history.replaceState(null, "", url);
    setKey(next);
  };

  useEffect(() => applyTheme(key), [key]);
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      if (target.closest("input, textarea, select, [contenteditable]")) return;
      if (event.key === "ArrowLeft") go(-1);
      if (event.key === "ArrowRight") go(1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  // Inline styles so no theme can restyle the switcher itself.
  const button = {
    all: "unset",
    cursor: "pointer",
    padding: "0 0.6rem",
    fontSize: "1.1rem",
  } as const;
  return (
    <div
      style={{
        position: "fixed",
        left: "50%",
        bottom: "4.5rem",
        transform: "translateX(-50%)",
        zIndex: 1000,
        display: "flex",
        alignItems: "center",
        gap: "0.25rem",
        padding: "0.4rem 0.6rem",
        borderRadius: "999px",
        background: "#111",
        color: "#fff",
        font: "600 13px/1 system-ui, sans-serif",
        boxShadow: "0 4px 16px rgb(0 0 0 / 0.35)",
        border: "2px dashed #ff0",
      }}
    >
      <button style={button} onClick={() => go(-1)} aria-label="Previous theme">
        ←
      </button>
      <span style={{ minWidth: "9rem", textAlign: "center" }}>PROTOTYPE: {themes[index]?.name}</span>
      <button style={button} onClick={() => go(1)} aria-label="Next theme">
        →
      </button>
    </div>
  );
}
