"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

/*
 * Mannschafts-Auswahl als Chip: Klick oeffnet eine kleine Liste aller
 * eigenen Teams (plus Link zur Teamverwaltung).
 */
export default function TeamSwitcher({
  teams,
  teamId,
  onChange,
}: {
  teams: { id: string; name: string }[];
  teamId: string | null;
  onChange: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const current = teams.find((team) => team.id === teamId) ?? teams[0];

  /* Klick daneben oder Esc schliesst */
  useEffect(() => {
    if (!open) return;
    const close = (event: MouseEvent | KeyboardEvent) => {
      if (event instanceof KeyboardEvent ? event.key === "Escape" : !ref.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", close);
    };
  }, [open]);

  if (!current) return null;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        className="flex items-center gap-1.5 rounded-full bg-app-elevated px-3 py-1 text-sm font-semibold text-app-heading transition hover:bg-app-border"
      >
        {current.name}
        <svg viewBox="0 0 20 20" className={`h-3.5 w-3.5 transition-transform ${open ? "rotate-180" : ""}`} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
          <path d="M5.5 8l4.5 4.5L14.5 8" />
        </svg>
      </button>

      {open && (
        <div className="absolute left-0 top-full z-30 mt-2 min-w-[220px] overflow-hidden rounded-2xl border border-app-border bg-app-surface p-1.5 shadow-app">
          {teams.map((team) => (
            <button
              key={team.id}
              type="button"
              onClick={() => {
                onChange(team.id);
                setOpen(false);
              }}
              className={`flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2 text-left text-sm transition hover:bg-app-elevated ${
                team.id === current.id ? "font-semibold text-app-heading" : "text-app-text"
              }`}
            >
              {team.name}
              {team.id === current.id && <span className="text-app-accent">✓</span>}
            </button>
          ))}
          <Link href="/coach/teams" className="mt-1 block border-t border-app-border px-3 pb-1.5 pt-2.5 text-xs font-semibold text-app-accent">
            Teams verwalten
          </Link>
        </div>
      )}
    </div>
  );
}
