"use client";

import Loader from "@/components/Loader";
import { localDateOf, CalendarEntry, formatEntryWhen } from "@/lib/community";
import { useEffect, useMemo, useState } from "react";
import { Area, CartesianGrid, ComposedChart, Legend, Line, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { competitionPriority, loadUpcomingCompetitions } from "@/lib/nextCompetition";
import { loadAthleteDailyLoads } from "@/lib/athleteLoads";
import { DailyLoad, formCurve, taperAdvice } from "@/lib/formCurve";
import { formatDate } from "@/lib/swim";
import { Card, Notice, inputClass } from "@/components/ui";

/*
 * Formkurve eines Athleten (Fitness, Ermuedung, Form) mit Vorschau
 * bis zum gewaehlten Wettkampf und Tapering-Empfehlung.
 */

const DAY = 86_400_000;
const iso = (ms: number) => new Date(ms).toISOString().slice(0, 10);

export default function FormCurvePanel({ swimmerId }: { swimmerId: string }) {
  const [today] = useState(() => iso(Date.now()));
  const [upcoming, setUpcoming] = useState<CalendarEntry[]>([]);
  const [loads, setLoads] = useState<DailyLoad[] | null>(null);
  const [targetId, setTargetId] = useState("");

  useEffect(() => {
    loadUpcomingCompetitions().then(setUpcoming);
  }, []);

  const target = upcoming.find((entry) => entry.id === targetId) ?? upcoming.find((entry) => competitionPriority(entry) === "A") ?? upcoming[0] ?? null;
  const targetDate = target ? localDateOf(target.starts_at) : iso(Date.parse(today) + 21 * DAY);
  /* 90 Tage Vorlauf, damit die Fitness (42 Tage) eingeschwungen ist */
  const from = iso(Date.parse(today) - 90 * DAY);

  useEffect(() => {
    loadAthleteDailyLoads(swimmerId, from, targetDate, today).then(setLoads);
  }, [swimmerId, from, targetDate, today]);

  const points = useMemo(() => (loads ? formCurve(loads, from, targetDate) : []), [loads, from, targetDate]);
  const advice = useMemo(() => taperAdvice(points, today, targetDate), [points, today, targetDate]);
  const shown = points.filter((point) => point.date >= iso(Date.parse(today) - 42 * DAY));
  const plannedDays = loads?.filter((entry) => entry.planned).length ?? 0;

  const tone = advice.status === "gut" ? "good" : advice.status === "keine-daten" ? "info" : "warn";

  return (
    <div className="mt-6 space-y-6">
      <Card
        title="Formkurve"
        description="Fitness-Fatigue-Modell: Fitness (42 Tage) minus Ermüdung (7 Tage) = Form. Belastung = RPE × Minuten; zukünftige Einheiten mit der geplanten Belastung. Modell mit Standardwerten, nicht individuell kalibriert – zur Orientierung bei Belastungsverlauf und Tapering, nicht als Leistungsprognose."
      >
        <div className="flex flex-wrap items-center gap-2 border-b border-app-border px-4 py-3">
          <span className="text-sm text-app-muted">Ziel:</span>
          <select value={target?.id ?? ""} onChange={(e) => setTargetId(e.target.value)} className={`${inputClass} w-auto py-1.5 text-sm`}>
            {upcoming.length === 0 && <option value="">in 3 Wochen (kein Wettkampf im Kalender)</option>}
            {upcoming.map((entry) => (
              <option key={entry.id} value={entry.id}>
                {entry.title} · {formatEntryWhen(entry)}
                {competitionPriority(entry) ? ` · ${competitionPriority(entry)}` : ""}
              </option>
            ))}
          </select>
        </div>

        {loads === null ? (
          <p className="p-5 text-sm text-app-muted"><Loader /></p>
        ) : (
          <>
            <div className="h-80 p-4">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={shown.map((point) => ({ ...point, label: formatDate(point.date).slice(0, 5) }))}>
                  <CartesianGrid stroke="var(--app-border)" strokeDasharray="3 3" />
                  <XAxis dataKey="label" stroke="var(--app-muted)" tick={{ fill: "var(--app-muted)", fontSize: 11 }} minTickGap={20} />
                  <YAxis stroke="var(--app-muted)" tick={{ fill: "var(--app-muted)", fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: "var(--app-surface)", border: "1px solid var(--app-border)", borderRadius: 12 }}
                    formatter={(value) => Math.round(Number(value))}
                  />
                  <Legend />
                  <ReferenceLine y={0} stroke="var(--app-muted)" />
                  <ReferenceLine x={formatDate(today).slice(0, 5)} stroke="var(--app-accent)" label={{ value: "heute", fill: "var(--app-accent)", fontSize: 11 }} />
                  {target && <ReferenceLine x={formatDate(targetDate).slice(0, 5)} stroke="var(--app-bad)" label={{ value: "Wettkampf", fill: "var(--app-bad)", fontSize: 11 }} />}
                  <Area type="monotone" dataKey="form" name="Form" fill="var(--app-good)" fillOpacity={0.15} stroke="var(--app-good)" strokeWidth={2} />
                  <Line type="monotone" dataKey="fitness" name="Fitness" stroke="var(--chart-25)" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="fatigue" name="Ermüdung" stroke="var(--chart-50)" strokeWidth={2} dot={false} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
            <p className="border-t border-app-border px-4 py-2 text-xs text-app-faint">
              Rechts von „heute“ ist die Vorschau aus {plannedDays} geplanten Einheiten mit Belastung. Ohne geplante Einheiten fällt die Kurve einfach ab
              (Ruhe).
            </p>
          </>
        )}
      </Card>

      {loads !== null && (
        <Notice tone={tone}>
          <b>Tapering-Hilfe{target ? ` für ${target.title}` : ""}:</b> {advice.text}
          {advice.status !== "keine-daten" && (
            <span className="mt-1 block">
              Form am Wettkampftag: <b>{Math.round(advice.formOnTarget)}</b> · Fitness bis dahin {advice.fitnessDropPct >= 0 ? "−" : "+"}
              {Math.abs(advice.fitnessDropPct).toFixed(0)} %
              {advice.reduceTo && advice.taperStart && (
                <>
                  {" "}
                  · Vorschlag: ab <b>{formatDate(advice.taperStart)}</b> Umfang auf etwa <b>{advice.reduceTo} %</b>, Intensität halten.
                </>
              )}
            </span>
          )}
        </Notice>
      )}
    </div>
  );
}
