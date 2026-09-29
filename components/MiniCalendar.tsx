"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { CALENDAR_COLUMNS, CalendarEntry } from "@/lib/community";

/*
 * Kompakter Kalender fuer das Dashboard: zwei Monate nebeneinander,
 * Wochen ab Montag. Heute hell hervorgehoben, Wettkaempfe als farbiges
 * Band (mehrtaegig durchgehend), Trainingstage mit kleinem Punkt.
 * Klick auf einen Tag plant ein Training fuer diesen Tag.
 */

/* Als durchgehendes Band: Wettkaempfe (pink) und Trainingslager (lila) */
const BAND_CATEGORIES = ["wettkampf", "trainingslager"];

const WEEKDAYS = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];
const pad = (n: number) => String(n).padStart(2, "0");
const key = (y: number, m: number, d: number) => `${y}-${pad(m + 1)}-${pad(d)}`;

function monthGrid(year: number, month: number) {
  const first = new Date(Date.UTC(year, month, 1));
  const offset = (first.getUTCDay() + 6) % 7;
  const days = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const cells: (string | null)[] = Array.from({ length: offset }, () => null);
  for (let d = 1; d <= days; d++) cells.push(key(year, month, d));
  while (cells.length % 7) cells.push(null);
  return cells;
}

export default function MiniCalendar({ teamId, today }: { teamId: string | null; today: string }) {
  const [start, setStart] = useState(() => ({ year: Number(today.slice(0, 4)), month: Number(today.slice(5, 7)) - 1 }));
  const [entries, setEntries] = useState<CalendarEntry[]>([]);
  const [trainingDays, setTrainingDays] = useState<Set<string>>(new Set());

  const months = [0, 1].map((i) => {
    const date = new Date(Date.UTC(start.year, start.month + i, 1));
    return { year: date.getUTCFullYear(), month: date.getUTCMonth() };
  });
  const rangeFrom = key(months[0].year, months[0].month, 1);
  const lastDay = new Date(Date.UTC(months[1].year, months[1].month + 1, 0)).toISOString().slice(0, 10);

  useEffect(() => {
    if (!teamId) return;
    Promise.all([
      supabase
        .from("calendar_entries")
        .select(CALENDAR_COLUMNS)
        .lte("starts_at", `${lastDay}T23:59:59`)
        .gte("starts_at", new Date(Date.parse(rangeFrom) - 14 * 86_400_000).toISOString()),
      supabase.from("training_sessions").select("session_date").eq("team_id", teamId).gte("session_date", rangeFrom).lte("session_date", lastDay),
    ]).then(([entryRes, sessionRes]) => {
      setEntries(((entryRes.data ?? []) as CalendarEntry[]).filter((entry) => !entry.team_id || entry.team_id === teamId));
      setTrainingDays(new Set(((sessionRes.data ?? []) as { session_date: string }[]).map((row) => row.session_date)));
    });
  }, [teamId, rangeFrom, lastDay]);

  /* Tag -> Wettkampf (fuer das Band) bzw. anderer Termin (Punkt) */
  const competitionOn = (date: string) =>
    entries.find(
      (entry) => BAND_CATEGORIES.includes(entry.category) && entry.starts_at.slice(0, 10) <= date && (entry.ends_at ?? entry.starts_at).slice(0, 10) >= date
    ) ?? null;
  const otherOn = (date: string) => entries.some((entry) => !BAND_CATEGORIES.includes(entry.category) && entry.starts_at.slice(0, 10) === date);

  const shift = (count: number) => {
    const date = new Date(Date.UTC(start.year, start.month + count, 1));
    setStart({ year: date.getUTCFullYear(), month: date.getUTCMonth() });
  };

  return (
    <section className="h-full rounded-3xl border border-app-border bg-app-surface p-4 shadow-app">
      <div className="grid gap-4 sm:grid-cols-2">
        {months.map((m, index) => {
          const cells = monthGrid(m.year, m.month);
          const title = new Date(Date.UTC(m.year, m.month, 1)).toLocaleDateString("de-DE", { month: "long", year: "numeric", timeZone: "UTC" });
          return (
            <div key={`${m.year}-${m.month}`}>
              <div className="mb-2 flex items-center justify-between">
                {index === 0 ? (
                  <button type="button" onClick={() => shift(-1)} className="h-7 w-7 rounded-full text-app-muted hover:bg-app-elevated" aria-label="Vorheriger Monat">
                    ‹
                  </button>
                ) : (
                  <span className="w-7 sm:hidden" />
                )}
                <p className="flex-1 text-center text-sm font-bold capitalize text-app-heading">{title}</p>
                {index === 1 ? (
                  <button type="button" onClick={() => shift(1)} className="h-7 w-7 rounded-full text-app-muted hover:bg-app-elevated" aria-label="Nächster Monat">
                    ›
                  </button>
                ) : (
                  <span className="hidden w-7 sm:block" />
                )}
              </div>
              <div className="grid grid-cols-7 gap-y-1 text-center text-xs">
                {WEEKDAYS.map((day) => (
                  <span key={day} className="pb-1 text-[11px] text-app-faint">
                    {day}
                  </span>
                ))}
                {cells.map((date, cellIndex) => {
                  if (!date) return <span key={`e${cellIndex}`} />;
                  const competition = competitionOn(date);
                  const isToday = date === today;
                  const prevSame = competition && competitionOn(shiftDay(date, -1))?.id === competition.id && cellIndex % 7 !== 0;
                  const nextSame = competition && competitionOn(shiftDay(date, 1))?.id === competition.id && cellIndex % 7 !== 6;
                  return (
                    <Link
                      key={date}
                      href={`/coach/training/new?day=${date}`}
                      title={competition?.title ?? (trainingDays.has(date) ? "Training" : undefined)}
                      className={`relative flex h-8 items-center justify-center text-sm tabular-nums transition ${
                        competition ? `${competition.category === "trainingslager" ? "bg-[color:var(--app-accent-2)]/25" : "bg-app-accent/20"} text-app-heading` : "text-app-text hover:bg-app-elevated"
                      } ${competition && !prevSame ? "rounded-l-lg" : ""} ${competition && !nextSame ? "rounded-r-lg" : ""} ${!competition ? "rounded-lg" : ""}`}
                    >
                      <span
                        className={`flex h-7 w-7 items-center justify-center rounded-lg ${
                          isToday ? "bg-app-heading font-bold text-app-surface" : competition && !prevSame ? `font-bold ${competition.category === "trainingslager" ? "text-[color:var(--app-accent-2)]" : "text-app-accent"}` : ""
                        }`}
                      >
                        {Number(date.slice(8))}
                      </span>
                      {(trainingDays.has(date) || otherOn(date)) && (
                        <span className={`absolute bottom-0.5 h-1 w-1 rounded-full ${trainingDays.has(date) ? "bg-app-accent" : "bg-app-faint"}`} />
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-3 flex justify-center gap-4 text-[11px] text-app-muted">
        <span className="flex items-center gap-1.5">
          <i className="inline-block h-2.5 w-4 rounded bg-app-accent/40" /> Wettkampf
        </span>
        <span className="flex items-center gap-1.5">
          <i className="inline-block h-2.5 w-4 rounded bg-[color:var(--app-accent-2)]/50" /> Trainingslager
        </span>
        <span className="flex items-center gap-1.5">
          <i className="inline-block h-1.5 w-1.5 rounded-full bg-app-accent" /> Training
        </span>
      </div>
    </section>
  );
}

function shiftDay(date: string, days: number) {
  return new Date(Date.parse(`${date}T12:00:00Z`) + days * 86_400_000).toISOString().slice(0, 10);
}
