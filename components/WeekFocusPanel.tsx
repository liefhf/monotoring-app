"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { fetchAll } from "@/lib/fetchAll";
import { CalendarEntry, toDateKey } from "@/lib/community";
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
import { Suggestion, suggestExercises } from "@/lib/exerciseSuggest";

const SECTION_LABEL: Record<string, string> = {
  einschwimmen: "Einschwimmen",
  technik: "Technik",
  hauptblock: "Hauptblock",
  ausschwimmen: "Ausschwimmen",
};

/*
 * Wochenfokus in der Trainingsplanung: fasst den aktuellen Stand aller
 * Athleten zusammen und schlaegt Bausteine vor (Hauptteil A/B, Technik).
 */
export default function WeekFocusPanel({ onInsert, poolLength = 25 }: { onInsert?: (block: SuggestedBlock) => void; poolLength?: number }) {
  const [swimmers, setSwimmers] = useState<Swimmer[]>([]);
  const [focusBySwimmer, setFocusBySwimmer] = useState<Map<string, AthleteFocus>>(new Map());
  const [results, setResults] = useState<SwimmerResult[]>([]);
  const [standards, setStandards] = useState<QualifyingStandard[]>([]);
  const [times, setTimes] = useState<QualifyingTime[]>([]);
  const [nonFinishes, setNonFinishes] = useState<NonFinish[]>([]);
  const [upcoming, setUpcoming] = useState<CalendarEntry[]>([]);
  const [competitionFaults, setCompetitionFaults] = useState<{ name: string; code: string }[]>([]);
  const [open, setOpen] = useState(true);
  const [inserted, setInserted] = useState<string[]>([]);
  const [today] = useState(() => toDateKey(new Date()));
  const [request, setRequest] = useState("");
  const [suggestion, setSuggestion] = useState<Suggestion | null>(null);
  const [picked, setPicked] = useState<number[]>([]);

  useEffect(() => {
    async function load() {
      const [swimmerResponse, resultResponse, standardResponse, timeResponse] = await Promise.all([
        supabase.from("swimmers").select("*"),
        fetchAll(() => supabase.from("swimmer_results").select(RESULT_COLUMNS)),
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
      /* Technikfehler aus Wettkaempfen der letzten 4 Wochen (Spalte faults evtl. noch nicht angelegt) */
      const since = new Date(Date.parse(today) - 28 * 86_400_000).toISOString().slice(0, 10);
      const faultRes = await supabase.from("competition_starts").select("swimmer_id, faults").gte("start_date", since);
      const names = new Map(rows.map((row) => [row.id as string, row.first_name as string]));
      setCompetitionFaults(
        faultRes.error
          ? []
          : ((faultRes.data ?? []) as { swimmer_id: string; faults: { code: string }[] | null }[]).flatMap((row) =>
              (row.faults ?? []).map((fault) => ({ name: names.get(row.swimmer_id) ?? "?", code: fault.code }))
            )
      );
    }
    load();
  }, [today]);

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
        competitionFaults,
        daysUntil: next ? daysUntil(next) : null,
        today,
      }),
    [swimmers, results, focusBySwimmer, standard, times, nonFinishes, competitionFaults, next, today]
  );

  function makeSuggestion() {
    const result = suggestExercises(request, week, poolLength === 50 ? 50 : 25);
    setSuggestion(result);
    setPicked(result.rows.map((_, index) => index));
  }

  function insertPicked() {
    if (!suggestion || !onInsert) return;
    onInsert({
      id: `eingabe-${Date.now()}`,
      title: request.trim() || "Vorschlag",
      why: "aus der Eingabe",
      rows: suggestion.rows.filter((_, index) => picked.includes(index)),
    });
    setSuggestion(null);
  }

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
          <div className="rounded-lg border border-app-border bg-app-surface p-3">
            <label className="mb-1 block text-xs font-semibold text-app-heading">Was soll heute gemacht werden?</label>
            <div className="flex flex-wrap gap-2">
              <input
                value={request}
                onChange={(e) => setRequest(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    makeSuggestion();
                  }
                }}
                placeholder="z. B. Sprint Kraul + Rückenwende, 90 min"
                className="min-w-[240px] flex-1 rounded-lg border border-app-border bg-app-bg px-3 py-2 text-sm outline-none focus:border-app-accent"
              />
              <button type="button" onClick={makeSuggestion} className="rounded-lg bg-app-accent px-3 py-2 text-sm font-semibold text-app-accent-ink">
                Übungen vorschlagen
              </button>
            </div>

            {suggestion && (
              <div className="mt-3 space-y-2">
                {suggestion.notes.map((note) => (
                  <p key={note} className="text-xs text-app-muted">ℹ {note}</p>
                ))}
                {["einschwimmen", "technik", "hauptblock", "ausschwimmen"].map((section) => {
                  const entries = suggestion.rows.map((entry, index) => ({ entry, index })).filter(({ entry }) => entry.section === section);
                  if (entries.length === 0) return null;
                  return (
                    <div key={section}>
                      <p className="text-xs font-semibold text-app-muted">{SECTION_LABEL[section]}</p>
                      {entries.map(({ entry, index }) => (
                        <label key={index} className="flex items-start gap-2 py-0.5 text-xs">
                          <input
                            type="checkbox"
                            checked={picked.includes(index)}
                            onChange={() => setPicked((current) => (current.includes(index) ? current.filter((i) => i !== index) : [...current, index]))}
                            className="mt-0.5"
                          />
                          <span>
                            <b>{entry.repetitions}×{entry.distance}</b> {entry.style} · {entry.exercise}{" "}
                            <span className="text-app-faint">({entry.zone}{entry.intervalTime ? `, ${entry.intervalType} ${entry.intervalTime}s` : ""})</span>
                          </span>
                        </label>
                      ))}
                    </div>
                  );
                })}
                {onInsert && (
                  <button type="button" onClick={insertPicked} disabled={picked.length === 0} className="rounded-lg border border-app-accent px-3 py-1.5 text-xs font-semibold text-app-accent disabled:opacity-50">
                    {picked.length} Übungen in die Einheit übernehmen
                  </button>
                )}
              </div>
            )}
          </div>

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
