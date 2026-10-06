"use client";

import { useState } from "react";
import {
  CalendarEntry,
  MONTH_NAMES,
  WEEKDAYS,
  entryOnDay,
  formatTimeOfDay,
  getCategory,
  getMonthGrid,
  toDateKey,
} from "@/lib/community";
import { Icon } from "@/components/icons";
import { buttonGhost, buttonSecondary } from "@/components/ui";

/*
 * Monatsansicht plus Liste der naechsten Termine.
 * Wird im Coach- und im Athletenbereich verwendet.
 */
export default function CalendarView({
  entries,
  onSelectEntry,
  onSelectDay,
  teamName,
  registeredIds,
  registrationCounts,
}: {
  entries: CalendarEntry[];
  onSelectEntry: (entry: CalendarEntry) => void;
  onSelectDay?: (dayKey: string) => void;
  teamName: (teamId: string | null) => string;
  registeredIds?: Set<string>;
  registrationCounts?: Record<string, number>;
}) {
  const today = new Date();
  const todayKey = toDateKey(today);
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const weeks = getMonthGrid(year, month);

  function shiftMonth(delta: number) {
    const date = new Date(year, month + delta, 1);
    setYear(date.getFullYear());
    setMonth(date.getMonth());
  }

  const upcoming = entries
    .filter((entry) => new Date(entry.ends_at ?? entry.starts_at).getTime() >= today.getTime() - 3600000)
    .sort((a, b) => a.starts_at.localeCompare(b.starts_at))
    .slice(0, 8);

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_320px]">
      {/* Monatsraster */}
      <section className="overflow-hidden rounded-2xl border border-app-border bg-app-surface shadow-app">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-app-border px-4 py-3">
          <h2 className="text-lg font-semibold">
            {MONTH_NAMES[month]} {year}
          </h2>
          <div className="flex items-center gap-1">
            <button type="button" onClick={() => shiftMonth(-1)} aria-label="Vorheriger Monat" className={buttonGhost}>
              ‹
            </button>
            <button
              type="button"
              onClick={() => {
                setYear(today.getFullYear());
                setMonth(today.getMonth());
              }}
              className={`${buttonSecondary} px-3 py-1.5`}
            >
              Heute
            </button>
            <button type="button" onClick={() => shiftMonth(1)} aria-label="Nächster Monat" className={buttonGhost}>
              ›
            </button>
          </div>
        </div>

        <div className="grid grid-cols-7 border-b border-app-border bg-app-bg/50 text-center text-xs font-semibold text-app-faint">
          {WEEKDAYS.map((day) => (
            <div key={day} className="py-2">
              {day}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7">
          {weeks.flat().map((day) => {
            const dayKey = toDateKey(day);
            const inMonth = day.getMonth() === month;
            const dayEntries = entries
              .filter((entry) => entryOnDay(entry, dayKey))
              .sort((a, b) => a.starts_at.localeCompare(b.starts_at));

            return (
              <div
                key={dayKey}
                className={`group min-h-20 border-b border-r border-app-border p-1 text-left sm:min-h-28 sm:p-1.5 [&:nth-child(7n)]:border-r-0 ${
                  inMonth ? "" : "bg-app-bg/40"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={`flex h-6 w-6 items-center justify-center rounded-full text-xs ${
                      dayKey === todayKey
                        ? "bg-app-accent font-bold text-app-accent-ink"
                        : inMonth
                          ? "text-app-heading"
                          : "text-app-faint"
                    }`}
                  >
                    {day.getDate()}
                  </span>
                  {onSelectDay && (
                    <button
                      type="button"
                      onClick={() => onSelectDay(dayKey)}
                      aria-label={`Termin am ${day.toLocaleDateString("de-DE")} anlegen`}
                      className="hidden h-5 w-5 items-center justify-center rounded text-app-faint hover:bg-app-elevated hover:text-app-accent group-hover:flex"
                    >
                      <Icon name="plus" className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>

                <div className="mt-1 space-y-0.5">
                  {dayEntries.slice(0, 3).map((entry) => {
                    const category = getCategory(entry.category);

                    return (
                      <button
                        key={entry.id}
                        type="button"
                        onClick={() => onSelectEntry(entry)}
                        title={entry.title}
                        className={`flex w-full items-center gap-1 truncate rounded-md px-1 py-0.5 text-left text-[11px] font-medium transition hover:brightness-95 ${category.chip}`}
                      >
                        {entry.visibility === "coach" && <Icon name="lock" className="h-3 w-3 shrink-0" />}
                        <span className="hidden shrink-0 sm:inline">
                          {!entry.all_day && toDateKey(new Date(entry.starts_at)) === dayKey
                            ? formatTimeOfDay(entry.starts_at)
                            : ""}
                        </span>
                        <span className="truncate">{entry.title}</span>
                      </button>
                    );
                  })}
                  {dayEntries.length > 3 && (
                    <p className="px-1 text-[11px] text-app-faint">+{dayEntries.length - 3} weitere</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Naechste Termine */}
      <section className="overflow-hidden rounded-2xl border border-app-border bg-app-surface shadow-app">
        <div className="border-b border-app-border px-4 py-3">
          <h2 className="text-base font-semibold">Nächste Termine</h2>
        </div>

        {upcoming.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-app-muted">Keine anstehenden Termine.</p>
        ) : (
          <ul className="divide-y divide-app-border">
            {upcoming.map((entry) => {
              const start = new Date(entry.starts_at);
              const category = getCategory(entry.category);

              return (
                <li key={entry.id}>
                  <button
                    type="button"
                    onClick={() => onSelectEntry(entry)}
                    className="flex w-full items-start gap-3 px-4 py-3 text-left transition hover:bg-app-elevated"
                  >
                    <span className="flex w-11 shrink-0 flex-col items-center rounded-xl border border-app-border py-1">
                      <span className="text-[10px] font-semibold uppercase text-app-faint">
                        {start.toLocaleDateString("de-DE", { month: "short" })}
                      </span>
                      <span className="text-lg font-bold leading-none text-app-heading">{start.getDate()}</span>
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-1.5">
                        <span className={`h-2 w-2 shrink-0 rounded-full ${category.dot}`} />
                        <span className="truncate text-sm font-semibold text-app-heading">{entry.title}</span>
                      </span>
                      <span className="mt-0.5 block truncate text-xs text-app-muted">
                        {entry.all_day ? "ganztägig" : formatTimeOfDay(entry.starts_at)} · {teamName(entry.team_id)}
                      </span>
                      <span className="mt-1 flex flex-wrap gap-1">
                        {entry.visibility === "coach" && (
                          <span className="rounded-full bg-app-elevated px-2 py-0.5 text-[10px] font-medium text-app-muted">
                            nur Trainer
                          </span>
                        )}
                        {entry.registration_enabled && (
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                              registeredIds?.has(entry.id)
                                ? "bg-app-good/15 text-app-good"
                                : "bg-app-accent/12 text-app-accent"
                            }`}
                          >
                            {registeredIds?.has(entry.id)
                              ? "angemeldet ✓"
                              : registrationCounts
                                ? `${registrationCounts[entry.id] ?? 0}${entry.max_participants ? ` / ${entry.max_participants}` : ""} angemeldet`
                                : "Anmeldung"}
                          </span>
                        )}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
