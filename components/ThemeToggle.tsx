"use client";

import { useSyncExternalStore } from "react";

type Theme = "light" | "dark";

/*
 * Schalter fuer helles/dunkles Design. Die Wahl steht in
 * localStorage und als data-theme auf <html>; das Skript in
 * app/layout.tsx setzt sie schon vor dem ersten Zeichnen.
 */

function readTheme(): Theme {
  const explicit = document.documentElement.dataset.theme;

  if (explicit === "light" || explicit === "dark") {
    return explicit;
  }

  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);

  const media = window.matchMedia("(prefers-color-scheme: dark)");
  media.addEventListener("change", listener);

  return () => {
    listeners.delete(listener);
    media.removeEventListener("change", listener);
  };
}

function setTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;

  try {
    localStorage.setItem("theme", theme);
  } catch {
    /* Privates Fenster o. ae. - dann gilt die Wahl nur bis zum Neuladen */
  }

  listeners.forEach((listener) => listener());
}

export default function ThemeToggle({ className = "" }: { className?: string }) {
  const theme = useSyncExternalStore<Theme | null>(subscribe, readTheme, () => null);
  const next: Theme = theme === "dark" ? "light" : "dark";

  return (
    <button
      type="button"
      onClick={() => setTheme(next)}
      aria-label={next === "dark" ? "Dunkles Design einschalten" : "Helles Design einschalten"}
      title={next === "dark" ? "Dunkles Design" : "Helles Design"}
      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-app-border text-app-muted transition hover:bg-app-elevated hover:text-app-heading ${className}`}
    >
      <svg
        viewBox="0 0 20 20"
        className="h-4 w-4"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        {theme === "dark" ? (
          <>
            <circle cx="10" cy="10" r="3.4" />
            <path d="M10 2.2v1.6M10 16.2v1.6M2.2 10h1.6M16.2 10h1.6M4.5 4.5l1.1 1.1M14.4 14.4l1.1 1.1M4.5 15.5l1.1-1.1M14.4 5.6l1.1-1.1" />
          </>
        ) : (
          <path d="M16.2 12.3A6.6 6.6 0 0 1 7.7 3.8a6.6 6.6 0 1 0 8.5 8.5z" />
        )}
      </svg>
    </button>
  );
}

/* Segment "Hell | Dunkel" wie in der Seitenleiste des Designs */
export function ThemeSegment({ className = "" }: { className?: string }) {
  const theme = useSyncExternalStore<Theme | null>(subscribe, readTheme, () => null);

  return (
    <div className={`flex rounded-[9px] bg-app-seg p-[3px] ${className}`} role="group" aria-label="Darstellung">
      {(["light", "dark"] as Theme[]).map((value) => (
        <button
          key={value}
          type="button"
          onClick={() => setTheme(value)}
          aria-pressed={theme === value}
          className={`flex-1 rounded-md px-2 py-1 text-xs font-semibold transition ${
            theme === value ? "bg-app-surface text-app-heading shadow-seg" : "text-app-muted hover:text-app-heading"
          }`}
        >
          {value === "light" ? "Hell" : "Dunkel"}
        </button>
      ))}
    </div>
  );
}
