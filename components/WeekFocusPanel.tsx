"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { CalendarEntry } from "@/lib/community";
import {
  NonFinish,
  QualifyingStandard,
  QualifyingTime,
  RESULT_COLUMNS,
  Swimmer,
  SwimmerResult,
  formatEventShort,
  formatTime,
  splitResults,
} from "@/lib/swim";
import { daysUntil, describeCompetition, focusFromRow, loadNonFinishes, loadUpcomingCompetitions } from "@/lib/nextCompetition";
import { AthleteFocus } from "@/lib/trainingFocus";
import { PHASES, SuggestedBlock, buildWeekFocus } from "@/lib/weekFocus";

/*
 * Wochenfokus in der Trainingsplanung: fasst den aktuellen Stand aller
 * Athleten zusammen und schlaegt Bausteine vor (Hauptteil A/B, Technik).
 */
export default function WeekFocusPanel({ onInsert }: { onInsert?: (block: SuggestedBlock) => void }) {
  const [swimmers, setSwimmers] = useState<Swimmer[]>([]);
  const [focusBySwimmer, setFocusBySwimmer] = useState<Map<string, AthleteFocus>>(new Map());
  const [results, setResults] = useState<SwimmerResult[]>([]);
  const [standards, setStandards] = useState<QualifyingStandard[]>([]);
  const [times, setTimes] = useState<QualifyingTime[]>([]);
  const [nonFinishes, setNonFinishes] = useState<NonFinish[]>([]);
  const [upcoming, setUpcoming] = useState<CalendarEntry[]>([]);
  const [open, setOpen] = useState(true);
  const [inserted, setInserted] = useState<string[]>([]);
  const [today] = useState(() => new Date().toISOString().slice(0, 10));

  useEffect(() => {
    async function load() {
      const [swimmerResponse, resultResponse, standardResponse, timeResponse] = await Promise.all([
        supabase.from("swimmers").select("*"),
        supabase.from("swimmer_results").select(RESULT_COLUMNS),
        supabase.from("qualifying_standards").select("*").order("created_at", { ascending: false }),
        supabase.from("qualifying_times").select("id, standard_id, gender, birth_year_from, birth_year_to, distance, stroke, time_ms"),
      ]);
      const rows = (swimmerResponse.data ?? []) as Record<string, unknown>[];
      setSwimmers(rows as unknown as Swimmer[]);
      setFocusBySwimmer(new Map(rows.map((row) => [row.id as string, focusFromRow(row)])));
      setResults(splitResults((resultResponse.data ?? []) as Record<string, unknown>[]).pool);
      setStandards((standardResponse.data ?? []) as QualifyingStandard[]);
      setTimes((timeResponse.data ?? []) as QualifyingTime[]);
      setNonFinishes((await loadNonFinishes()).rows);
      setUpcoming(await loadUpcomingCompetitions());
    }
    load();
  }, []);

  const next = upcoming[0] ?? null;
  const standard = standards[0] ?? null;
  const week = useMemo(
    () =>
      buildWeekFocus({
        swimmers,
        results,
        focusBySwimmer,
        standard,
        standardTimes: times.filter((time) => time.standard_id === standard?.id),
        nonFinishes,
        daysUntil: next ? daysUntil(next) : null,
        today,
      }),
    [swimmers, results, focusBySwimmer, standard, times, nonFinishes, next, today]
  );

  if (swimmers.length === 0) return null;
  const phase = PHASES[week.phase];

  return (
    <section className="rounded-2xl border border-app-accent/30 bg-app-accent/5 text-sm">
      <button type="button" onClick={() => setOpen(!open)} className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left">
        <span>
          <b className="text-app-heading">Wochenfokus · {phase.label}</b>
          <span className="ml-2 text-app-muted">{next ? describeCompetition(next) : phase.hint}</span>
        </span>
        <span className="text-app-accent">{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <div className="space-y-3 border-t border-app-accent/20 px-4 py-3">
          <p className="text-app-muted">
            <b className="text-app-text">Schwerpunkt der Phase:</b> {phase.hint}
          </p>

          {week.technique.length > 0 && (
            <div className="rounded-lg bg-app-bad/10 px-3 py-2 text-app-bad">
              {week.technique.map((item) => (
                <p key={item.title}>
                  ⚠ <b>{item.title}</b> – {item.athletes.join(", ")} (Disqualifikation, muss geübt werden)
                </p>
              ))}
            </div>
          )}

          {week.targets.length > 0 && (
            <p className="text-app-muted">
              <b className="text-app-text">Pflichtzeit in Reichweite:</b>{" "}
              {week.targets
                .map(
                  (target) =>
                    `${formatEventShort(target.event)} – ${target.athletes.map((athlete) => `${athlete.name} +${formatTime(athlete.gapMs)}`).join(", ")}`
                )
                .join(" · ")}
            </p>
          )}

          <div className="grid gap-2 md:grid-cols-2">
            {week.blocks.map((block) => (
              <div key={block.id} className="rounded-lg border border-app-border bg-app-surface px-3 py-2">
                <div className="flex items-start justify-between gap-2">
                  <b className="text-app-heading">{block.title}</b>
                  {onInsert && (
                    <button
                      type="button"
                      onClick={() => {
                        onInsert(block);
                        setInserted((current) => [...current, block.id]);
                      }}
                      className="shrink-0 text-xs font-semibold text-app-accent"
                    >
                      {inserted.includes(block.id) ? "✓ übernommen" : "+ übernehmen"}
                    </button>
                  )}
                </div>
                <p className="text-xs text-app-muted">{block.why}</p>
                <ul className="mt-1 text-xs text-app-text">
                  {block.rows.map((row, index) => (
                    <li key={index}>
                      {row.repetitions}×{row.distance} · {row.zone} · {row.intervalType} {row.intervalTime}s
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          {standard && <p className="text-xs text-app-faint">Pflichtzeiten: {standard.name} · Fokus-Strecken der Athleten (ohne gespeicherten Fokus: Vorschlag)</p>}
        </div>
      )}
    </section>
  );
}
