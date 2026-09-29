"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { supabase } from "@/lib/supabase";
import { formatDate, formatEvent, formatTime, formatTimeDifference } from "@/lib/swim";
import {
  CompetitionStart,
  RATING_CATEGORIES,
  START_COLUMNS,
  STATUS_LABELS,
  averageRating,
  buildSeasonMatrix,
  formatPercent,
  formatSeason,
  percentDiff,
  ratingTrend,
  seasonStartYear,
} from "@/lib/competitionFeedback";
import { Card, EmptyState, inputClass } from "@/components/ui";

/*
 * Saison-Auswertung eines Schwimmers: alle Wettkaempfe der
 * Saison nebeneinander, Notenverlauf je Bereich und die
 * einzelnen Feedbacks. Laedt seine Daten selbst, damit die
 * Schwimmerseite auch ohne supabase/wettkampf_feedback.sql
 * funktioniert.
 */

type StartRow = CompetitionStart & { competitions: { name: string } | null };

const CATEGORY_COLORS: Record<string, string> = {
  rating_start: "var(--chart-25)",
  rating_turns: "var(--chart-50)",
  rating_underwater: "var(--cat-training)",
  rating_technique: "var(--cat-camp)",
  rating_pacing: "var(--cat-meeting)",
  rating_finish: "var(--app-good)",
};

export default function SwimmerSeasonReport({ swimmerId }: { swimmerId: string }) {
  const [starts, setStarts] = useState<StartRow[] | null>(null);
  const [season, setSeason] = useState<number | null>(null);

  useEffect(() => {
    supabase
      .from("competition_starts")
      .select(`${START_COLUMNS}, competitions(name)`)
      .eq("swimmer_id", swimmerId)
      .order("start_date", { ascending: false })
      .then(({ data, error }) => setStarts(error ? [] : ((data ?? []) as unknown as StartRow[])));
  }, [swimmerId]);

  const seasons = useMemo(
    () => [...new Set((starts ?? []).map((start) => seasonStartYear(start.start_date)))].sort((a, b) => b - a),
    [starts]
  );
  const activeSeason = season ?? seasons[0] ?? null;
  const seasonStarts = useMemo(
    () => (starts ?? []).filter((start) => seasonStartYear(start.start_date) === activeSeason),
    [starts, activeSeason]
  );
  const names = useMemo(
    () => Object.fromEntries((starts ?? []).map((start) => [start.competition_id, start.competitions?.name ?? "Wettkampf"])),
    [starts]
  );
  const matrix = useMemo(() => buildSeasonMatrix(seasonStarts, names), [seasonStarts, names]);
  const trend = useMemo(() => ratingTrend(seasonStarts, matrix.columns), [seasonStarts, matrix.columns]);
  const ratedCategories = RATING_CATEGORIES.filter((category) => trend.some((row) => row[category.key] !== null));

  if (starts === null) {
    return <p className="mt-6 text-sm text-app-muted">Wird geladen...</p>;
  }

  if (starts.length === 0) {
    return (
      <div className="mt-6">
        <Card>
          <EmptyState icon="trophy" title="Noch kein Wettkampf-Feedback">
            Öffne einen Wettkampf und klicke auf „Auswertung & Feedback“.
          </EmptyState>
        </Card>
      </div>
    );
  }

  const valid = seasonStarts.filter((start) => start.status === "ok" && start.time_ms);
  const withGoal = valid.filter((start) => start.goal_time_ms);
  const goalsReached = withGoal.filter((start) => start.time_ms! <= start.goal_time_ms!).length;
  const averages = seasonStarts.map(averageRating).filter((value): value is number => value !== null);

  const kpis = [
    { label: "Wettkämpfe", value: `${matrix.columns.length}` },
    { label: "Starts", value: `${seasonStarts.length}`, hint: `${seasonStarts.length - valid.length} nicht gewertet` },
    { label: "Zielzeiten erreicht", value: withGoal.length ? `${goalsReached} / ${withGoal.length}` : "–" },
    {
      label: "Ø Note",
      value: averages.length ? (averages.reduce((a, b) => a + b, 0) / averages.length).toFixed(1).replace(".", ",") : "–",
    },
  ];

  return (
    <div className="mt-6 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">Saison-Auswertung</h2>
        <select
          value={activeSeason ?? ""}
          onChange={(event) => setSeason(Number(event.target.value))}
          aria-label="Saison"
          className={`${inputClass} w-auto py-2`}
        >
          {seasons.map((year) => (
            <option key={year} value={year}>
              Saison {formatSeason(year)}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {kpis.map((kpi) => (
          <div key={kpi.label} className="rounded-3xl border border-app-border bg-app-surface shadow-app p-4 shadow-app">
            <p className="text-xs font-medium text-app-muted">{kpi.label}</p>
            <p className="mt-1 text-2xl font-bold text-app-heading">{kpi.value}</p>
            {kpi.hint && <p className="text-[11px] text-app-faint">{kpi.hint}</p>}
          </div>
        ))}
      </div>

      <Card title="Alle Wettkämpfe nebeneinander" description="★ = schnellste Zeit der Saison auf dieser Strecke">
        {matrix.rows.length === 0 ? (
          <p className="p-5 text-sm text-app-muted">Keine gewerteten Zeiten in dieser Saison.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-app-border bg-app-bg/50 text-app-muted">
                <tr>
                  <th className="sticky left-0 bg-app-surface px-4 py-3 font-medium">Strecke</th>
                  {matrix.columns.map((column) => (
                    <th key={column.id} className="min-w-28 px-4 py-3 font-medium">
                      <Link href={`/coach/competitions/${column.id}/auswertung`} className="hover:text-app-accent">
                        {column.name}
                      </Link>
                      <span className="block text-[11px] font-normal text-app-faint">{formatDate(column.date)}</span>
                    </th>
                  ))}
                  <th className="px-4 py-3 font-medium">Entwicklung</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-app-border">
                {matrix.rows.map((row) => {
                  const times = matrix.columns.map((column) => row.cells[column.id]?.time_ms ?? null);
                  const present = times.filter((time): time is number => time !== null);
                  const best = Math.min(...present);
                  const change = present.length >= 2 ? present[present.length - 1] - present[0] : null;

                  return (
                    <tr key={`${row.pool}-${row.distance}-${row.stroke}`}>
                      <td className="sticky left-0 bg-app-surface px-4 py-2.5 font-medium text-app-heading">
                        {formatEvent(row)} <span className="text-xs text-app-faint">{row.pool}m</span>
                      </td>
                      {matrix.columns.map((column, index) => {
                        const time = times[index];
                        const cell = row.cells[column.id];
                        const isBest = time !== null && time === best && present.length > 1;

                        return (
                          <td key={column.id} className="px-4 py-2.5">
                            {time !== null ? (
                              <span className={isBest ? "font-bold text-app-good" : "text-app-heading"}>
                                {formatTime(time)}
                                {isBest && " ★"}
                                {cell?.round && <span className="block text-[10px] font-normal text-app-faint">{cell.round}</span>}
                              </span>
                            ) : (
                              <span className="text-app-faint">–</span>
                            )}
                          </td>
                        );
                      })}
                      <td className="px-4 py-2.5">
                        {change === null ? (
                          <span className="text-app-faint">–</span>
                        ) : (
                          <span className={change < 0 ? "text-app-good" : change > 0 ? "text-app-bad" : "text-app-muted"}>
                            {formatTimeDifference(change)} ({formatPercent(percentDiff(present[present.length - 1], present[0]))})
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card title="Verlauf der Noten" description="Durchschnitt je Bereich pro Wettkampf (1 = schwach … 5 = sehr gut)">
        {ratedCategories.length === 0 || trend.length === 0 ? (
          <p className="p-5 text-sm text-app-muted">Noch keine Noten vergeben.</p>
        ) : (
          <div className="h-72 w-full p-4">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trend} margin={{ top: 10, right: 20, left: -20, bottom: 0 }}>
                <CartesianGrid stroke="var(--app-border)" strokeDasharray="3 3" />
                <XAxis dataKey="competition" stroke="var(--app-muted)" tick={{ fill: "var(--app-muted)", fontSize: 11 }} />
                <YAxis domain={[1, 5]} ticks={[1, 2, 3, 4, 5]} stroke="var(--app-muted)" tick={{ fill: "var(--app-muted)", fontSize: 11 }} />
                <Tooltip contentStyle={{ backgroundColor: "var(--app-surface)", border: "1px solid var(--app-border)", borderRadius: "12px" }} />
                <Legend />
                {ratedCategories.map((category) => (
                  <Line
                    key={category.key}
                    type="monotone"
                    dataKey={category.key}
                    name={category.label}
                    stroke={CATEGORY_COLORS[category.key]}
                    strokeWidth={2.5}
                    dot={{ r: 4 }}
                    connectNulls
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </Card>

      <Card title="Einzelne Starts" description="Klick öffnet die Auswertung des Wettkampfs">
        <ul className="divide-y divide-app-border">
          {seasonStarts.map((start) => {
            const average = averageRating(start);

            return (
              <li key={start.id}>
                <Link
                  href={`/coach/competitions/${start.competition_id}/auswertung`}
                  className="flex flex-wrap items-center gap-x-4 gap-y-1 px-5 py-3 transition hover:bg-app-elevated"
                >
                  <span className="w-24 shrink-0 text-sm text-app-muted">{formatDate(start.start_date)}</span>
                  <span className="min-w-40 flex-1">
                    <span className="block font-medium text-app-heading">{formatEvent(start)}</span>
                    <span className="block text-xs text-app-muted">{start.competitions?.name ?? "Wettkampf"}</span>
                  </span>
                  <span className="w-24 font-semibold text-app-heading">
                    {start.status === "ok" && start.time_ms ? formatTime(start.time_ms) : STATUS_LABELS[start.status]}
                  </span>
                  <span className="w-24 text-xs text-app-muted">
                    {average !== null ? `Ø Note ${average.toFixed(1).replace(".", ",")}` : ""}
                  </span>
                  <span className="w-full text-sm text-app-text sm:w-auto sm:flex-1">
                    {start.to_improve ? `Daran arbeiten: ${start.to_improve}` : start.went_well ?? ""}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </Card>
    </div>
  );
}
