"use client";

import { useMemo, useState } from "react";
import { CalendarEntry, formatEntryWhen } from "@/lib/community";
import { competitionPriority } from "@/lib/nextCompetition";
import { forecastEvent, reachChance } from "@/lib/forecast";
import { AthleteFocus, parseFocusKey } from "@/lib/trainingFocus";
import { QualifyingStandard, QualifyingTime, SwimEvent, Swimmer, SwimmerResult, findQualifyingTime, formatEventShort, formatTime } from "@/lib/swim";
import { RoleBadge } from "@/components/FocusBadge";
import { Card, inputClass } from "@/components/ui";

/*
 * Prognose der Fokus-Strecken zum gewaehlten Saisonhoehepunkt
 * (Wettkampf aus dem Kalender) mit Chance auf die Pflichtzeit.
 */
export default function ForecastCard({
  results,
  swimmer,
  focus,
  upcoming,
  standard,
  standardTimes,
  today,
}: {
  results: SwimmerResult[];
  swimmer: Swimmer;
  focus: AthleteFocus;
  upcoming: CalendarEntry[];
  standard: QualifyingStandard | null;
  standardTimes: QualifyingTime[];
  today: string;
}) {
  const defaultTarget = upcoming.find((entry) => competitionPriority(entry) === "A") ?? upcoming[0] ?? null;
  const [targetId, setTargetId] = useState(defaultTarget?.id ?? "");
  const [pool, setPool] = useState<25 | 50>(25);
  const target = upcoming.find((entry) => entry.id === targetId) ?? defaultTarget;
  const targetDate = target ? target.starts_at.slice(0, 10) : null;

  const events: { event: SwimEvent; role: "haupt" | "neben" | null }[] = useMemo(() => {
    if (focus.events?.length) return focus.events.map(parseFocusKey);
    const map = new Map<string, SwimEvent>();
    for (const result of results) map.set(`${result.distance}-${result.stroke}`, { distance: result.distance, stroke: result.stroke });
    return [...map.values()].map((event) => ({ event, role: null }));
  }, [focus, results]);

  const rows = useMemo(
    () =>
      targetDate
        ? events
            .map(({ event, role }) => {
              const forecast = forecastEvent(results, event, pool, today, targetDate);
              const required = standard ? findQualifyingTime(standardTimes, swimmer, event) : null;
              return { event, role, forecast, required, chance: forecast && required ? reachChance(forecast, required.time_ms) : null };
            })
            .filter((row) => row.forecast)
        : [],
    [events, results, pool, today, targetDate, standard, standardTimes, swimmer]
  );

  if (upcoming.length === 0) return null;

  return (
    <Card
      title="Prognose zum Saisonhöhepunkt"
      description="Trend aus den Monatsbestzeiten der letzten 12 Monate – vorsichtig gerechnet (max. 1 % Verbesserung pro Monat)."
    >
      <div className="flex flex-wrap gap-2 border-b border-app-border px-4 py-3">
        <select value={target?.id ?? ""} onChange={(e) => setTargetId(e.target.value)} className={`${inputClass} w-auto py-1.5 text-sm`}>
          {upcoming.map((entry) => (
            <option key={entry.id} value={entry.id}>
              {entry.title} · {formatEntryWhen(entry)}
              {competitionPriority(entry) ? ` · ${competitionPriority(entry)}` : ""}
            </option>
          ))}
        </select>
        <div className="flex overflow-hidden rounded-lg border border-app-border text-sm">
          {([25, 50] as const).map((value) => (
            <button key={value} type="button" onClick={() => setPool(value)} className={`px-3 py-1.5 ${pool === value ? "bg-app-accent text-app-accent-ink" : ""}`}>
              {value} m
            </button>
          ))}
        </div>
      </div>

      {rows.length === 0 ? (
        <p className="p-4 text-sm text-app-muted">Zu wenig Daten – für eine Prognose braucht es Zeiten aus mindestens 3 Monaten auf dieser Bahn.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-app-muted">
                <th className="px-4 py-2 font-medium">Strecke</th>
                <th className="px-3 py-2 text-right font-medium">Bestzeit</th>
                <th className="px-3 py-2 text-right font-medium">Trend/Monat</th>
                <th className="px-3 py-2 text-right font-medium">Prognose</th>
                <th className="px-3 py-2 text-right font-medium">Spanne</th>
                {standard && <th className="px-3 py-2 text-right font-medium">Pflicht</th>}
                {standard && <th className="px-4 py-2 text-right font-medium">Chance</th>}
              </tr>
            </thead>
            <tbody>
              {rows.map(({ event, role, forecast, required, chance }) => (
                <tr key={`${event.distance}-${event.stroke}`} className="border-t border-app-border">
                  <td className="whitespace-nowrap px-4 py-1.5 font-medium">
                    {formatEventShort(event)}
                    <RoleBadge role={role} />
                  </td>
                  <td className="whitespace-nowrap px-3 py-1.5 text-right">
                    {formatTime(forecast!.best.time_ms)} <span className="text-xs text-app-faint">{forecast!.best.result_date.slice(5, 7)}/{forecast!.best.result_date.slice(2, 4)}</span>
                  </td>
                  <td className={`px-3 py-1.5 text-right ${forecast!.monthlyChangePct < -0.05 ? "text-app-good" : "text-app-muted"}`}>
                    {forecast!.monthlyChangePct < -0.05 ? `${forecast!.monthlyChangePct.toFixed(1).replace(".", ",")} %` : "stagniert"}
                  </td>
                  <td className="whitespace-nowrap px-3 py-1.5 text-right font-semibold text-app-heading">{formatTime(forecast!.predictedMs)}</td>
                  <td className="whitespace-nowrap px-3 py-1.5 text-right text-xs text-app-muted">
                    {formatTime(forecast!.lowMs)}–{formatTime(forecast!.highMs)}
                  </td>
                  {standard && <td className="px-3 py-1.5 text-right text-app-muted">{required ? formatTime(required.time_ms) : "–"}</td>}
                  {standard && (
                    <td
                      className={`px-4 py-1.5 text-right font-semibold ${
                        chance === null ? "text-app-faint" : chance >= 70 ? "text-app-good" : chance >= 30 ? "text-app-warn" : "text-app-bad"
                      }`}
                    >
                      {chance === null ? "–" : chance === 100 && forecast!.best.time_ms <= (required?.time_ms ?? 0) ? "✓ erfüllt" : `${chance} %`}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
          <p className="px-4 py-2 text-xs text-app-faint">
            Die Prognose ist eine Orientierung, keine Garantie: Wachstum, Krankheit oder Trainingsänderungen fließen nicht ein.
          </p>
        </div>
      )}
    </Card>
  );
}
