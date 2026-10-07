"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { classifyError } from "@/lib/loadState";
import { formatTime } from "@/lib/swim";
import { SetTimeRow } from "@/lib/setTimes";
import { Details } from "@/components/ui";
import { athleteSummary, seriesStats } from "@/lib/setAnalysis";

/*
 * Serienzeiten eines Athleten ueber mehrere Wochen.
 * Gruppiert wird nur nach gleichen Bedingungen (Strecke, Anzahl, Lage,
 * Becken, Abgang/Pause, Hilfsmittel). Fehlt eine Angabe, steht die Serie
 * in einer eigenen Gruppe "Bedingungen unvollstaendig" - ohne Vergleich.
 */

type Row = SetTimeRow & { training_sessions: { session_date: string; pool_length: number | null } | null };

const legacyMissed = (row: SetTimeRow) =>
  row.missed_reps != null ? row.missed_reps : row.times_ms.map((ms, i) => (ms === null ? i + 1 : null)).filter((r): r is number => r !== null);

function groupKey(row: Row) {
  const pool = row.pool_length ?? row.training_sessions?.pool_length ?? null;
  const parts = [row.distance, row.repetitions, row.stroke, pool, row.interval_seconds, row.interval_type];
  if (parts.some((p) => p === null || p === undefined)) return null;
  return [...parts, [...(row.materials ?? [])].sort().join("+")].join("|");
}

export default function SeriesHistory({ swimmerId, variant = "coach" }: { swimmerId: string; variant?: "coach" | "athlete" }) {
  const [entry, setEntry] = useState<{ id: string; rows: Row[] | null; missing: boolean } | null>(null);

  useEffect(() => {
    let cancelled = false;
    supabase
      .from("training_set_times")
      .select("*, training_sessions(session_date, pool_length)")
      .eq("swimmer_id", swimmerId)
      .then(({ data, error }) => {
        if (cancelled) return;
        const kind = classifyError(error);
        setEntry({ id: swimmerId, rows: kind === "error" ? null : ((data ?? []) as Row[]), missing: kind === "missing" });
      });
    return () => {
      cancelled = true;
    };
  }, [swimmerId]);

  if (!entry || entry.id !== swimmerId) return <div className="h-16 animate-pulse rounded-xl bg-app-elevated" aria-label="Wird geladen" />;
  if (entry.missing) return <p className="text-sm text-app-text">Serienzeiten sind noch nicht eingerichtet (serienzeiten.sql, Skript 27).</p>;
  if (!entry.rows) return <p className="text-sm text-app-bad">Serienzeiten konnten nicht geladen werden.</p>;

  const rows = [...entry.rows].sort((a, b) => (b.training_sessions?.session_date ?? "").localeCompare(a.training_sessions?.session_date ?? ""));
  if (!rows.length) {
    return <p className="text-sm text-app-text">{variant === "athlete" ? "Noch keine Zeiten aus dem Training." : "Noch keine Serienzeiten erfasst. Erfasst wird in der Trainingseinheit unter „Serienzeiten“."}</p>;
  }

  if (variant === "athlete") {
    return (
      <ul className="space-y-3">
        {rows.slice(0, 5).map((row) => {
          const stats = seriesStats({ times_ms: row.times_ms, missed_reps: legacyMissed(row), target_ms: row.target_ms ?? null, repetitions: row.repetitions ?? row.times_ms.length });
          const summary = athleteSummary(stats);
          if (!summary) return null;
          return (
            <li key={`${row.training_session_id}-${row.set_label}`}>
              <p className="font-bold text-app-heading">{row.set_label}</p>
              <p className="text-sm text-app-text">
                {new Date(`${row.training_sessions?.session_date}T12:00:00`).toLocaleDateString("de-DE", { day: "numeric", month: "numeric" })} · {summary}
              </p>
            </li>
          );
        })}
      </ul>
    );
  }

  const groups = new Map<string, Row[]>();
  const incomplete: Row[] = [];
  for (const row of rows) {
    const k = groupKey(row);
    if (!k) incomplete.push(row);
    else groups.set(k, [...(groups.get(k) ?? []), row]);
  }

  const line = (row: Row) => {
    const stats = seriesStats({ times_ms: row.times_ms, missed_reps: legacyMissed(row), target_ms: row.target_ms ?? null, repetitions: row.repetitions ?? row.times_ms.length });
    return (
      <li key={`${row.training_session_id}-${row.set_label}`} className="flex flex-wrap items-baseline gap-x-3 py-1.5 text-sm">
        <Link href={`/coach/training/session/${row.training_session_id}#serienzeiten`} className="num inline-flex min-h-11 w-24 shrink-0 items-center font-semibold text-app-accent-soft hover:underline">
          {(row.training_sessions?.session_date ?? "").split("-").reverse().join(".")}
        </Link>
        <span className="num text-app-heading">{stats.meanMs !== null ? `Ø ${formatTime(stats.meanMs)}` : "keine Zeit"}</span>
        {stats.bestMs !== null && <span className="num text-app-text">schnellste {formatTime(stats.bestMs)}</span>}
        {stats.trendMs !== null && (
          <span className="num text-app-text">
            Verlauf {stats.trendMs > 0 ? "+" : "−"}
            {(Math.abs(stats.trendMs) / 1000).toLocaleString("de-DE", { maximumFractionDigits: 1 })} s
          </span>
        )}
        <span className="text-app-muted">
          {stats.valid}/{stats.planned} Zeiten
        </span>
        {row.note && <span className="w-full text-[13px] text-app-muted">Notiz: {row.note}</span>}
      </li>
    );
  };

  return (
    <div className="space-y-4">
      <Details summary="So wird verglichen">
        Nur gleiche Bedingungen (Strecke, Anzahl, Lage, Becken, Abgang, Hilfsmittel). Ø = Mittel der gültigen Zeiten; Verlauf = letztes minus erstes Drittel. Trainingszeiten sind keine Bestzeiten.
      </Details>
      {[...groups.values()].map((list) => (
        <section key={groupKey(list[0])!}>
          <h3 className="text-[15px] font-bold text-app-heading">
            {list[0].set_label} <span className="font-normal text-app-muted">· {list[0].pool_length ?? list[0].training_sessions?.pool_length} m-Becken</span>
          </h3>
          <ul className="divide-y divide-app-border/70">{list.map(line)}</ul>
          {list.length === 1 && <p className="text-[13px] text-app-muted">Erst eine Serie unter diesen Bedingungen – noch kein Verlauf.</p>}
        </section>
      ))}
      {incomplete.length > 0 && (
        <section>
          <h3 className="text-[15px] font-bold text-app-heading">Bedingungen unvollständig</h3>
          <p className="text-[13px] text-app-muted">Strecke, Becken oder Abgang fehlen – diese Serien werden nicht verglichen.</p>
          <ul className="divide-y divide-app-border/70">
            {incomplete.map((row) => (
              <li key={`${row.training_session_id}-${row.set_label}`} className="py-1 text-sm text-app-text">
                <span className="font-semibold text-app-heading">{row.set_label}</span> · {line(row)}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
