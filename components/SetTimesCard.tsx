"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { loadTeamSwimmersResult } from "@/lib/attendance";
import { Swimmer as BaseSwimmer, formatTime } from "@/lib/swim";

type Swimmer = BaseSwimmer & { profile_id?: string | null };
import { LatestRequest } from "@/lib/loadState";
import { PlannedSeries, SetTimeRow, loadEarlierSeries, loadPlannedSeries, loadSessionSetTimes, saveSetTimes } from "@/lib/setTimes";
import { ParsedTime, parseRepTime, repInputValue } from "@/lib/setTimeInput";
import { SeriesContext, comparability, seriesFindings, seriesGaps, seriesStats } from "@/lib/setAnalysis";
import { Details } from "@/components/ui";

/*
 * Serienzeiten einer Trainingseinheit: geplante Serie waehlen, Zeiten je
 * Athlet und Wiederholung erfassen, danach auswerten.
 *
 * Erfassung nach Wiederholung (Handy): alle schlagen bei Wdh. 1 an, dann 2 ...
 * -> eine Wiederholung, alle Athleten untereinander, Enter springt weiter.
 * Desktop: dieselben Daten als Tabelle Athleten x Wiederholungen.
 *
 * Leer = noch nicht erfasst, "x" = nicht geschwommen. Gespeichert werden
 * Millisekunden; gerundet wird nur in der Anzeige. Trainingszeiten sind
 * keine Wettkampfzeiten und fliessen nicht in Bestzeiten ein.
 */

type Earlier = Awaited<ReturnType<typeof loadEarlierSeries>>["rows"][number];
type Series = PlannedSeries & { fromPlan: boolean };

const key = (swimmerId: string, rep: number) => `${swimmerId}|${rep}`;

/* alte Eintraege (vor Skript 27): leere Zeit bedeutete "nicht geschwommen" */
function missedOf(row: SetTimeRow) {
  if (row.missed_reps != null) return row.missed_reps;
  return row.times_ms.map((ms, index) => (ms === null ? index + 1 : null)).filter((rep): rep is number => rep !== null);
}

export default function SetTimesCard({ sessionId, teamId, sessionDate }: { sessionId: string; teamId: string; sessionDate: string }) {
  const [state, setState] = useState<"loading" | "ready" | "missing" | "error">("loading");
  const [team, setTeam] = useState<Swimmer[]>([]);
  const [others, setOthers] = useState<Swimmer[]>([]);
  const [present, setPresent] = useState<Set<string> | null>(null);
  const [added, setAdded] = useState<string[]>([]);
  const [showAbsent, setShowAbsent] = useState(false);
  const [rows, setRows] = useState<SetTimeRow[]>([]);
  const [planned, setPlanned] = useState<PlannedSeries[]>([]);
  const [poolLength, setPoolLength] = useState<number | null>(null);
  const [rpeByProfile, setRpeByProfile] = useState<Map<string, number>>(new Map());
  const [active, setActive] = useState("");
  const [freeLabel, setFreeLabel] = useState("");
  const [freeSeries, setFreeSeries] = useState<Series[]>([]);
  const [rep, setRep] = useState(1);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [targetDraft, setTargetDraft] = useState<Record<string, string>>({});
  const [noteDraft, setNoteDraft] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<{ tone: "good" | "bad"; text: string } | null>(null);
  const [earlier, setEarlier] = useState<Earlier[]>([]);
  const inputs = useRef<Record<string, HTMLInputElement | null>>({});
  const earlierRequests = useRef(new LatestRequest());

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const [teamRes, timesRes, planRes, sessionRes, attendanceRes, feedbackRes, allRes] = await Promise.all([
        loadTeamSwimmersResult(teamId),
        loadSessionSetTimes(sessionId),
        loadPlannedSeries(sessionId),
        supabase.from("training_sessions").select("pool_length").eq("id", sessionId).maybeSingle(),
        supabase.from("training_attendance").select("swimmer_id, status").eq("training_session_id", sessionId),
        supabase.from("training_feedback").select("athlete_id, rpe").eq("training_session_id", sessionId),
        supabase.from("swimmers").select("id, first_name, last_name, birth_year, gender, profile_id").order("last_name"),
      ]);
      if (cancelled) return;
      if (timesRes.missingTable) return setState("missing");
      if (timesRes.failed || teamRes.failed || planRes.failed) return setState("error");
      setTeam(teamRes.swimmers);
      setOthers(((allRes.data ?? []) as Swimmer[]).filter((s) => !teamRes.swimmers.some((t) => t.id === s.id)));
      setRows(timesRes.rows);
      setPlanned(planRes.series);
      setPoolLength((sessionRes.data as { pool_length: number | null } | null)?.pool_length ?? null);
      const attendance = (attendanceRes.data ?? []) as { swimmer_id: string; status: string }[];
      setPresent(attendance.length ? new Set(attendance.filter((a) => a.status === "anwesend").map((a) => a.swimmer_id)) : null);
      setRpeByProfile(new Map(((feedbackRes.data ?? []) as { athlete_id: string; rpe: number | null }[]).filter((f) => f.rpe).map((f) => [f.athlete_id, f.rpe!])));
      // Athleten, die schon Zeiten haben, aber nicht (mehr) im Team sind
      setAdded([...new Set(timesRes.rows.map((r) => r.swimmer_id))].filter((id) => !teamRes.swimmers.some((t) => t.id === id)));
      const first = planRes.series[0]?.label ?? timesRes.rows[0]?.set_label ?? "";
      setActive(first);
      setState("ready");
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [sessionId, teamId]);

  /* Serien: geplante + bereits erfasste ohne Plan + frei angelegte */
  const series: Series[] = useMemo(() => {
    const list: Series[] = planned.map((p) => ({ ...p, fromPlan: true }));
    for (const row of rows) {
      if (list.some((s) => s.label === row.set_label)) continue;
      list.push({
        plan_key: row.plan_key ?? `frei:${row.set_label}`,
        label: row.set_label,
        distance: row.distance ?? 0,
        repetitions: row.repetitions ?? row.times_ms.length,
        stroke: row.stroke,
        zone: row.zone ?? null,
        interval_type: row.interval_type ?? null,
        interval_seconds: row.interval_seconds,
        materials: row.materials ?? [],
        fromPlan: false,
      });
    }
    for (const free of freeSeries) if (!list.some((s) => s.label === free.label)) list.push(free);
    return list;
  }, [planned, rows, freeSeries]);

  const current = series.find((s) => s.label === active) ?? null;
  const repCount = Math.max(current?.repetitions ?? 0, ...rows.filter((r) => r.set_label === active).map((r) => r.times_ms.length), 1);

  const allSwimmers = useMemo(() => [...team, ...others], [team, others]);
  const participants = useMemo(() => {
    const extra = added.map((id) => allSwimmers.find((s) => s.id === id)).filter((s): s is Swimmer => Boolean(s));
    const base = present && !showAbsent ? team.filter((s) => present.has(s.id) || rows.some((r) => r.swimmer_id === s.id && r.set_label === active)) : team;
    return [...base, ...extra.filter((s) => !base.some((b) => b.id === s.id))];
  }, [team, added, allSwimmers, present, showAbsent, rows, active]);
  const hiddenAbsent = present && !showAbsent ? team.filter((s) => !participants.some((p) => p.id === s.id)).length : 0;

  const savedRow = (swimmerId: string) => rows.find((r) => r.swimmer_id === swimmerId && r.set_label === active);
  const cellValue = (swimmerId: string, r: number) => {
    const draft = drafts[`${active}|${key(swimmerId, r)}`];
    if (draft !== undefined) return draft;
    const row = savedRow(swimmerId);
    if (!row) return "";
    return repInputValue(row.times_ms[r - 1] ?? null, missedOf(row).includes(r));
  };
  const parsed = (swimmerId: string, r: number): ParsedTime => parseRepTime(cellValue(swimmerId, r), current?.distance || null);
  const setCell = (swimmerId: string, r: number, value: string) => setDrafts((d) => ({ ...d, [`${active}|${key(swimmerId, r)}`]: value }));
  const target = targetDraft[active] ?? (rows.find((r) => r.set_label === active && r.target_ms)?.target_ms ? formatTime(rows.find((r) => r.set_label === active && r.target_ms)!.target_ms!) : "");
  const targetParsed = target ? parseRepTime(target, current?.distance || null) : ({ kind: "empty" } as ParsedTime);

  const dirtySwimmers = participants.filter(
    (s) =>
      Object.keys(drafts).some((k) => k.startsWith(`${active}|${s.id}|`) && drafts[k] !== (() => {
        const r = Number(k.split("|")[2]);
        const row = savedRow(s.id);
        return row ? repInputValue(row.times_ms[r - 1] ?? null, missedOf(row).includes(r)) : "";
      })()) ||
      (noteDraft[`${active}|${s.id}`] !== undefined && noteDraft[`${active}|${s.id}`] !== (savedRow(s.id)?.note ?? "")) ||
      (targetDraft[active] !== undefined && Boolean(savedRow(s.id)))
  );
  const invalidCells = participants.flatMap((s) =>
    Array.from({ length: repCount }, (_, i) => i + 1)
      .filter((r) => ["invalid", "ambiguous"].includes(parsed(s.id, r).kind))
      .map((r) => `${s.first_name} Wdh. ${r}`)
  );

  /* ungespeicherte Aenderungen beim Verlassen */
  useEffect(() => {
    if (!dirtySwimmers.length) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirtySwimmers.length]);

  /* fruehere Serien gleicher Strecke fuer den Vergleich */
  useEffect(() => {
    if (!current?.distance || !participants.length) return;
    const token = earlierRequests.current.begin();
    loadEarlierSeries(participants.map((p) => p.id), current.distance, sessionDate).then((res) => {
      if (earlierRequests.current.isLatest(token)) setEarlier(res.rows);
    });
  }, [current?.distance, participants, sessionDate]);

  async function save() {
    if (saving) return;
    if (invalidCells.length) {
      setStatus({ tone: "bad", text: `Bitte zuerst korrigieren: ${invalidCells.slice(0, 4).join(", ")}${invalidCells.length > 4 ? " …" : ""}` });
      return;
    }
    if (targetParsed.kind === "invalid" || targetParsed.kind === "ambiguous" || targetParsed.kind === "missed") {
      setStatus({ tone: "bad", text: "Sollzeit bitte als Zeit eingeben (z. B. 2:35,00) oder leer lassen." });
      return;
    }
    if (!current) return;
    setSaving(true);
    const failed: string[] = [];
    const savedRows: SetTimeRow[] = [];
    for (const swimmer of dirtySwimmers) {
      const times: (number | null)[] = [];
      const missed: number[] = [];
      for (let r = 1; r <= repCount; r++) {
        const p = parsed(swimmer.id, r);
        times.push(p.kind === "time" ? p.ms : null);
        if (p.kind === "missed") missed.push(r);
      }
      const existing = savedRow(swimmer.id);
      const row: SetTimeRow = {
        training_session_id: sessionId,
        swimmer_id: swimmer.id,
        set_label: current.label,
        stroke: current.stroke,
        interval_seconds: current.interval_seconds,
        times_ms: times,
        note: (noteDraft[`${active}|${swimmer.id}`] ?? existing?.note ?? "").trim() || null,
        distance: current.distance || null,
        repetitions: repCount,
        pool_length: poolLength,
        zone: current.zone,
        interval_type: current.interval_type,
        target_ms: targetParsed.kind === "time" ? targetParsed.ms : null,
        missed_reps: missed,
        plan_key: current.fromPlan ? current.plan_key : null,
        materials: current.materials,
      };
      const error = await saveSetTimes(row);
      if (error) failed.push(swimmer.first_name);
      else savedRows.push(row);
    }
    // Gespeicherte uebernehmen, Entwuerfe nur fuer diese verwerfen; fehlgeschlagene bleiben stehen
    setRows((list) => [...list.filter((r) => !savedRows.some((s) => s.swimmer_id === r.swimmer_id && s.set_label === r.set_label)), ...savedRows]);
    setDrafts((d) => Object.fromEntries(Object.entries(d).filter(([k]) => !savedRows.some((s) => k.startsWith(`${active}|${s.swimmer_id}|`)))));
    setNoteDraft((d) => Object.fromEntries(Object.entries(d).filter(([k]) => !savedRows.some((s) => k === `${active}|${s.swimmer_id}`))));
    if (!failed.length) setTargetDraft((d) => Object.fromEntries(Object.entries(d).filter(([k]) => k !== active)));
    setSaving(false);
    setStatus(
      failed.length
        ? { tone: "bad", text: `Nicht gespeichert für: ${failed.join(", ")}. Die Eingaben bleiben stehen – bitte erneut speichern.` }
        : { tone: "good", text: `Gespeichert (${savedRows.length} ${savedRows.length === 1 ? "Athlet" : "Athleten"}).` }
    );
  }

  /* Enter: naechster Athlet, nach dem letzten die naechste Wiederholung */
  function onEnter(index: number) {
    const next = participants[index + 1];
    if (next) inputs.current[key(next.id, rep)]?.focus();
    else if (rep < repCount) {
      setRep(rep + 1);
      setTimeout(() => participants[0] && inputs.current[key(participants[0].id, rep + 1)]?.focus(), 30);
    }
  }

  function addFree() {
    const label = freeLabel.trim();
    if (!label) return;
    const m = /^(\d+)\s*[x×]\s*(\d+)/i.exec(label);
    setFreeSeries((list) => [
      ...list,
      { plan_key: `frei:${label}`, label, distance: m ? Number(m[2]) : 0, repetitions: m ? Number(m[1]) : 1, stroke: null, zone: null, interval_type: null, interval_seconds: null, materials: [], fromPlan: false },
    ]);
    setActive(label);
    setRep(1);
    setFreeLabel("");
  }

  const context: SeriesContext = {
    distance: current?.distance || null,
    repetitions: repCount,
    stroke: current?.stroke ?? null,
    pool_length: poolLength,
    interval_seconds: current?.interval_seconds ?? null,
    interval_type: current?.interval_type ?? null,
    materials: current?.materials ?? [],
  };

  const analysis = participants
    .map((swimmer) => {
      const row = savedRow(swimmer.id);
      if (!row) return null;
      const entry = { times_ms: row.times_ms, missed_reps: missedOf(row), target_ms: row.target_ms ?? null, repetitions: row.repetitions ?? repCount };
      const stats = seriesStats(entry);
      if (!stats.valid && !stats.missed) return null;
      const candidates = earlier
        .filter((e) => e.swimmer_id === swimmer.id)
        .map((e) => ({ e, cmp: comparability(context, { distance: e.distance ?? null, repetitions: e.repetitions ?? e.times_ms.length, stroke: e.stroke, pool_length: e.pool_length ?? null, interval_seconds: e.interval_seconds, interval_type: e.interval_type ?? null, materials: e.materials ?? [] }) }))
        .sort((a, b) => Number(b.cmp.comparable) - Number(a.cmp.comparable) || b.e.date.localeCompare(a.e.date));
      const prev = candidates[0];
      const previous = prev
        ? { stats: seriesStats({ times_ms: prev.e.times_ms, missed_reps: missedOf(prev.e), target_ms: prev.e.target_ms ?? null, repetitions: prev.e.repetitions ?? prev.e.times_ms.length }), date: prev.e.date, comparable: prev.cmp.comparable, cmp: prev.cmp }
        : null;
      const rpe = swimmer.profile_id ? rpeByProfile.get(swimmer.profile_id) ?? null : null;
      return {
        swimmer,
        row,
        stats,
        findings: seriesFindings(stats, { previous, rpe }),
        gaps: seriesGaps(stats, { ...context, target_ms: row.target_ms ?? null }, Boolean(previous?.comparable)),
        previous,
      };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);

  const fieldClass = (p: ParsedTime) =>
    `w-full min-h-12 rounded-lg border bg-app-bg px-3 text-base tabular-nums outline-none focus:ring-2 focus:ring-app-accent ${
      p.kind === "invalid" || p.kind === "ambiguous" ? "border-app-bad" : p.kind === "time" && p.warning ? "border-app-warn" : "border-app-border"
    }`;
  const hint = (p: ParsedTime) =>
    p.kind === "invalid" || p.kind === "ambiguous" ? (
      <span className="block text-xs text-app-bad">{p.message}</span>
    ) : p.kind === "time" && (p.shorthand || p.warning) ? (
      <span className={`block text-xs ${p.warning ? "text-app-warn" : "text-app-muted"}`}>
        {p.shorthand ? `= ${p.display}` : ""}
        {p.warning ? `${p.shorthand ? " · " : ""}${p.warning}` : ""}
      </span>
    ) : p.kind === "missed" ? (
      <span className="block text-xs text-app-muted">nicht geschwommen</span>
    ) : null;

  return (
    <section id="serienzeiten" className="mt-5 scroll-mt-20 rounded-2xl border border-app-border bg-app-surface">
      <div className="border-b border-app-border px-4 py-3">
        <h2 className="text-base font-bold text-app-heading">Serienzeiten</h2>
        <p className="text-[13px] text-app-text">Zeit je Wiederholung: 1:12,40 oder 32,85 · „x“ = nicht geschwommen · leer = noch nicht erfasst</p>
      </div>

      {state === "loading" ? (
        <div className="m-4 h-16 animate-pulse rounded-xl bg-app-elevated" aria-label="Wird geladen" />
      ) : state === "missing" ? (
        <p className="p-4 text-sm text-app-warn">Bitte zuerst <b>serienzeiten.sql</b> und Skript 27 im Supabase SQL-Editor ausführen.</p>
      ) : state === "error" ? (
        <p className="p-4 text-sm text-app-bad">Serienzeiten konnten nicht geladen werden. Bitte Seite neu laden – bitte jetzt nichts eintragen.</p>
      ) : (
        <>
          {/* Serie waehlen */}
          <div className="flex flex-wrap items-center gap-2 border-b border-app-border px-4 py-3" role="tablist" aria-label="Serie">
            {series.map((s) => (
              <button
                key={s.label}
                type="button"
                role="tab"
                aria-selected={s.label === active}
                onClick={() => {
                  setActive(s.label);
                  setRep(1);
                }}
                className={`min-h-11 rounded-lg px-3 text-sm font-semibold ${s.label === active ? "bg-app-accent text-app-accent-ink" : "border border-app-border text-app-heading hover:bg-app-elevated"}`}
              >
                {s.label}
              </button>
            ))}
            {series.length === 0 && <p className="text-sm text-app-text">Im Plan dieser Einheit gibt es keine Serie mit mehreren Wiederholungen.</p>}
            <span className="flex items-center gap-2">
              <input
                value={freeLabel}
                onChange={(e) => setFreeLabel(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addFree()}
                placeholder="freie Serie, z. B. 10x100"
                aria-label="Freie Serie anlegen"
                className="min-h-11 w-44 rounded-lg border border-app-border bg-app-bg px-2 text-base sm:text-sm"
              />
              <button type="button" onClick={addFree} className="min-h-11 rounded-lg border border-app-border px-3 text-sm font-semibold hover:bg-app-elevated">
                + Serie
              </button>
            </span>
          </div>

          {current && (
            <>
              {/* Kontext */}
              <div className="flex flex-col gap-2 border-b border-app-border px-4 py-3 text-[13px] text-app-text sm:flex-row sm:items-end sm:gap-4">
                <p className="min-w-0 sm:flex-1">
                  {current.distance ? `${repCount} × ${current.distance} m` : `${repCount} Wiederholungen`}
                  {current.stroke ? ` · ${current.stroke}` : ""}
                  {current.zone ? ` · ${current.zone}` : ""}
                  {current.interval_seconds ? ` · ${current.interval_type === "@" ? "Abgang" : "Pause"} ${Math.floor(current.interval_seconds / 60)}:${String(current.interval_seconds % 60).padStart(2, "0")}` : ""}
                  {` · ${poolLength ? `${poolLength}-m-Becken` : "Becken unbekannt"}`}
                  {current.materials.length ? ` · ${current.materials.join(", ")}` : ""}
                </p>
                <label className="text-[13px]">
                  <span className="block font-semibold text-app-heading" title="Der Abgang ist keine Zielzeit – nur eintragen, wenn vorgegeben.">Sollzeit je Wdh. (optional, nicht der Abgang)</span>
                  <input
                    value={target}
                    onChange={(e) => setTargetDraft((d) => ({ ...d, [active]: e.target.value }))}
                    placeholder="z. B. 2:35,00"
                    inputMode="decimal"
                    className={`${fieldClass(targetParsed)} w-36`}
                  />
                  {hint(targetParsed)}
                </label>
              </div>

              {participants.length === 0 ? (
                <p className="p-4 text-sm text-app-text">Niemand ist als anwesend erfasst. {hiddenAbsent ? "" : "Diesem Team sind keine Athleten zugeordnet."}</p>
              ) : (
                <>
                  {/* Handy: nach Wiederholung */}
                  <div className="md:hidden">
                    <div className="flex items-center gap-2 border-b border-app-border px-4 py-2">
                      <button type="button" aria-label="Vorige Wiederholung" disabled={rep <= 1} onClick={() => setRep(rep - 1)} className="h-12 w-12 rounded-lg border border-app-border text-lg disabled:opacity-30">
                        ‹
                      </button>
                      <p className="flex-1 text-center text-base font-bold text-app-heading" aria-live="polite">
                        Wiederholung {rep} von {repCount}
                      </p>
                      <button type="button" aria-label="Nächste Wiederholung" disabled={rep >= repCount} onClick={() => setRep(rep + 1)} className="h-12 w-12 rounded-lg border border-app-border text-lg disabled:opacity-30">
                        ›
                      </button>
                    </div>
                    <div className="flex gap-1 overflow-x-auto px-4 py-2" aria-label="Wiederholungen">
                      {Array.from({ length: repCount }, (_, i) => i + 1).map((r) => {
                        const filled = participants.filter((s) => parsed(s.id, r).kind !== "empty").length;
                        return (
                          <button
                            key={r}
                            type="button"
                            onClick={() => setRep(r)}
                            aria-label={`Wiederholung ${r}, ${filled} von ${participants.length} erfasst`}
                            className={`min-h-11 min-w-11 shrink-0 rounded-lg text-sm font-semibold ${r === rep ? "bg-app-accent text-app-accent-ink" : filled === participants.length ? "bg-app-good/15 text-app-heading" : "border border-app-border text-app-text"}`}
                          >
                            {r}
                          </button>
                        );
                      })}
                    </div>
                    <ul className="divide-y divide-app-border/70">
                      {participants.map((swimmer, index) => {
                        const p = parsed(swimmer.id, rep);
                        return (
                          <li key={swimmer.id} className="flex items-start gap-3 px-4 py-2">
                            <label htmlFor={`t-${swimmer.id}-${rep}`} className="min-w-0 flex-1 pt-3 text-[15px] font-semibold text-app-heading">
                              {swimmer.first_name} {swimmer.last_name ?? ""}
                              {!swimmer.profile_id && <span className="block text-xs font-normal text-app-muted">ohne Login</span>}
                            </label>
                            <span className="w-36 shrink-0">
                              <input
                                id={`t-${swimmer.id}-${rep}`}
                                ref={(el) => {
                                  inputs.current[key(swimmer.id, rep)] = el;
                                }}
                                value={cellValue(swimmer.id, rep)}
                                onChange={(e) => setCell(swimmer.id, rep, e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") {
                                    e.preventDefault();
                                    onEnter(index);
                                  }
                                }}
                                inputMode="decimal"
                                enterKeyHint="next"
                                autoComplete="off"
                                placeholder="–"
                                aria-invalid={p.kind === "invalid" || p.kind === "ambiguous"}
                                className={fieldClass(p)}
                              />
                              {hint(p)}
                            </span>
                            <button
                              type="button"
                              onClick={() => setCell(swimmer.id, rep, p.kind === "missed" ? "" : "x")}
                              aria-pressed={p.kind === "missed"}
                              aria-label={`${swimmer.first_name}: Wiederholung ${rep} nicht geschwommen`}
                              className={`h-12 w-12 shrink-0 rounded-lg border text-sm font-bold ${p.kind === "missed" ? "border-app-heading bg-app-heading text-app-surface" : "border-app-border text-app-muted"}`}
                            >
                              x
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  </div>

                  {/* Desktop/Tablet: Tabelle */}
                  <div className="hidden overflow-x-auto md:block">
                    <table className="w-full text-sm">
                      <thead className="text-left text-xs text-app-muted">
                        <tr className="border-b border-app-border">
                          <th className="sticky left-0 bg-app-surface px-4 py-2 font-semibold">Athlet</th>
                          {Array.from({ length: repCount }, (_, i) => (
                            <th key={i} className="px-1 py-2 text-center font-semibold">
                              {i + 1}
                            </th>
                          ))}
                          <th className="px-3 py-2 font-semibold">Notiz</th>
                        </tr>
                      </thead>
                      <tbody>
                        {participants.map((swimmer) => (
                          <tr key={swimmer.id} className="border-b border-app-border/70 align-top">
                            <th scope="row" className="sticky left-0 bg-app-surface px-4 py-2 text-left font-semibold text-app-heading">
                              {swimmer.first_name} {swimmer.last_name ?? ""}
                              {!swimmer.profile_id && <span className="block text-xs font-normal text-app-muted">ohne Login</span>}
                            </th>
                            {Array.from({ length: repCount }, (_, i) => {
                              const r = i + 1;
                              const p = parsed(swimmer.id, r);
                              return (
                                <td key={r} className="px-1 py-1.5">
                                  <input
                                    value={cellValue(swimmer.id, r)}
                                    onChange={(e) => setCell(swimmer.id, r, e.target.value)}
                                    aria-label={`${swimmer.first_name} Wiederholung ${r}`}
                                    aria-invalid={p.kind === "invalid" || p.kind === "ambiguous"}
                                    title={p.kind === "invalid" || p.kind === "ambiguous" ? p.message : p.kind === "time" && p.shorthand ? `= ${p.display}` : undefined}
                                    inputMode="decimal"
                                    autoComplete="off"
                                    className={`${fieldClass(p)} min-h-11 min-w-[5.5rem] px-2 text-center text-sm`}
                                  />
                                  {p.kind === "time" && p.shorthand && <span className="block text-center text-[11px] text-app-muted">= {p.display}</span>}
                                  {(p.kind === "invalid" || p.kind === "ambiguous") && <span className="block text-center text-[11px] text-app-bad">prüfen</span>}
                                </td>
                              );
                            })}
                            <td className="px-3 py-1.5">
                              <input
                                value={noteDraft[`${active}|${swimmer.id}`] ?? savedRow(swimmer.id)?.note ?? ""}
                                onChange={(e) => setNoteDraft((d) => ({ ...d, [`${active}|${swimmer.id}`]: e.target.value }))}
                                aria-label={`Notiz ${swimmer.first_name}`}
                                placeholder="optional"
                                className="min-h-11 w-40 rounded-lg border border-app-border bg-app-bg px-2 text-sm"
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}

              {/* Teilnehmer */}
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-2 text-[13px] text-app-text">
                {hiddenAbsent > 0 && (
                  <button type="button" onClick={() => setShowAbsent(true)} className="min-h-11 font-semibold text-app-accent-soft hover:underline">
                    {hiddenAbsent} nicht als anwesend erfasst – anzeigen
                  </button>
                )}
                <label className="flex items-center gap-2">
                  <span>Athlet ergänzen:</span>
                  <select
                    value=""
                    onChange={(e) => e.target.value && setAdded((a) => [...a, e.target.value])}
                    className="min-h-11 rounded-lg border border-app-border bg-app-bg px-2 text-sm"
                  >
                    <option value="">auswählen …</option>
                    {[...team.filter((s) => !participants.some((p) => p.id === s.id)), ...others.filter((s) => !added.includes(s.id))].map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.last_name}, {s.first_name}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              {/* Speichern */}
              <div className="sticky bottom-20 z-10 flex flex-wrap items-center gap-3 border-t border-app-border bg-app-surface px-4 py-3 lg:bottom-0">
                <button
                  type="button"
                  onClick={save}
                  disabled={saving || (!dirtySwimmers.length && targetDraft[active] === undefined)}
                  className="min-h-11 rounded-xl bg-app-accent px-5 text-sm font-bold text-app-accent-ink disabled:opacity-40"
                >
                  {saving ? "Speichert …" : "Zeiten speichern"}
                </button>
                <p className={`text-sm ${status?.tone === "bad" ? "text-app-bad" : status?.tone === "good" && !dirtySwimmers.length ? "text-app-good" : "text-app-text"}`} role="status">
                  {dirtySwimmers.length ? `Ungespeichert: ${dirtySwimmers.map((s) => s.first_name).join(", ")}` : status?.text ?? "Alles gespeichert."}
                  {dirtySwimmers.length && status?.tone === "bad" ? ` · ${status.text}` : ""}
                </p>
              </div>

              {/* Auswertung */}
              {analysis.length > 0 && (
                <div className="border-t border-app-border px-4 py-3">
                  <h3 className="text-[15px] font-bold text-app-heading">Auswertung {current.label}</h3>
                  <p className="text-[13px] text-app-muted">Nur gespeicherte Zeiten · Trainingszeiten zählen nicht als Bestzeiten</p>
                  <ul className="mt-2 space-y-3">
                    {analysis.map(({ swimmer, stats, findings, gaps, previous, row }) => (
                      <li key={swimmer.id} className="border-t border-app-border/70 pt-2">
                        <p className="flex flex-wrap items-baseline gap-x-3">
                          <span className="text-[15px] font-semibold text-app-heading">
                            {swimmer.first_name} {swimmer.last_name ?? ""}
                          </span>
                          <Link href={`/coach/schwimmer/${swimmer.id}?tab=serien`} className="inline-flex min-h-11 items-center text-[13px] font-semibold text-app-accent-soft hover:underline">
                            Verlauf und Notizen im Profil →
                          </Link>
                        </p>
                        <p className="num text-sm text-app-text">
                          {stats.valid ? (
                            <>
                              Ø {formatTime(stats.meanMs!)} · schnellste {formatTime(stats.bestMs!)} (Wdh. {stats.bestRep}) · langsamste {formatTime(stats.worstMs!)} (Wdh. {stats.worstRep})
                              {stats.cvPercent !== null ? ` · Gleichmäßigkeit ±${stats.cvPercent.toLocaleString("de-DE")} %` : ""}
                              {row.target_ms ? ` · Sollzeit ${formatTime(row.target_ms)}: ${stats.targetHits}/${stats.valid} getroffen` : ""}
                            </>
                          ) : (
                            "keine gültige Zeit"
                          )}
                        </p>
                        {/* Verlauf je Wiederholung */}
                        {stats.valid > 1 && (
                          <RepBars times={row.times_ms} missed={missedOf(row)} planned={stats.planned} target={row.target_ms ?? null} />
                        )}
                        {findings.length > 0 && (
                          <ul className="mt-1 space-y-1.5">
                            {findings.map((f, i) => (
                              <li key={i} className="text-sm text-app-heading">
                                {f.observation}
                              </li>
                            ))}
                          </ul>
                        )}
                        {findings.length > 0 && (
                          <Details summary="Einordnung & nächste Schritte">
                            <ul className="space-y-1">
                              {findings.map((f, i) => (
                                <li key={i}>
                                  {f.context} <span className="text-app-text">→ {f.action}</span>
                                </li>
                              ))}
                            </ul>
                          </Details>
                        )}
                        {previous && !previous.comparable && previous.cmp.differences.length + previous.cmp.unknown.length > 0 && (
                          <p className="text-[13px] text-app-muted">
                            Nicht vergleichbar mit {previous.date.split("-").reverse().join(".")}: {[...previous.cmp.differences.map((d) => `${d} anders`), ...previous.cmp.unknown.map((u) => `${u} unbekannt`)].join(", ")}
                          </p>
                        )}
                        {gaps.length > 0 && <p className="text-[13px] text-app-muted">Fehlt: {gaps.join(" · ")}</p>}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}
        </>
      )}
    </section>
  );
}

/* Verlauf je Wiederholung: Balken = Zeit (laenger = langsamer), Linie = Sollzeit */
function RepBars({ times, missed, planned, target }: { times: (number | null)[]; missed: number[]; planned: number; target: number | null }) {
  const values = times.filter((t): t is number => t !== null);
  const min = Math.min(...values, target ?? Infinity);
  const max = Math.max(...values, target ?? -Infinity);
  const span = Math.max(max - min, 1);
  const width = (ms: number) => 30 + ((ms - min) / span) * 70; // 30-100 %
  return (
    <ol className="mt-1.5 grid gap-0.5" aria-label="Zeiten je Wiederholung">
      {Array.from({ length: planned }, (_, i) => {
        const ms = times[i] ?? null;
        const isMissed = missed.includes(i + 1);
        return (
          <li key={i} className="flex items-center gap-2 text-[12px]">
            <span className="w-5 text-right text-app-muted">{i + 1}</span>
            <span className="relative h-3 flex-1">
              {ms !== null && <span className={`absolute inset-y-0 left-0 rounded-sm ${target && ms > target ? "bg-app-warn/70" : "bg-app-accent/60"}`} style={{ width: `${width(ms)}%` }} />}
              {target && <span className="absolute inset-y-[-2px] w-px bg-app-heading" style={{ left: `${width(target)}%` }} aria-hidden="true" />}
            </span>
            <span className="num w-16 text-right text-app-text">{ms !== null ? formatTime(ms) : isMissed ? "nicht geschw." : "–"}</span>
          </li>
        );
      })}
    </ol>
  );
}
