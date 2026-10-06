"use client";

import { useSyncExternalStore } from "react";

/*
 * Sonnen-Modus: maximaler Kontrast fuer draussen am Beckenrand.
 * Steht als data-contrast="sonne" auf <html> und in localStorage;
 * app/layout.tsx setzt ihn schon vor dem ersten Zeichnen.
 */

const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

const read = () => document.documentElement.dataset.contrast === "sonne";

function toggle() {
  const on = !read();
  if (on) document.documentElement.dataset.contrast = "sonne";
  else delete document.documentElement.dataset.contrast;
  try {
    localStorage.setItem("contrast", on ? "sonne" : "normal");
  } catch {
    /* ohne Browser-Speicher gilt es bis zum Neuladen */
  }
  listeners.forEach((listener) => listener());
}

export default function ContrastToggle({ className = "" }: { className?: string }) {
  const on = useSyncExternalStore(subscribe, read, () => false);

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={on}
      title={on ? "Sonnen-Modus aus" : "Sonnen-Modus (hoher Kontrast für draußen)"}
      className={`flex h-9 shrink-0 items-center justify-center gap-1 rounded-lg border px-2 text-sm transition ${
        on ? "border-app-heading bg-app-heading font-bold text-app-surface" : "border-app-border text-app-muted hover:bg-app-elevated hover:text-app-heading"
      } ${className}`}
    >
      ☀<span className="hidden text-xs sm:inline">{on ? "Sonne an" : ""}</span>
    </button>
  );
}
