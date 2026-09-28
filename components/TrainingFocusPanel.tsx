"use client";

import { useMemo, useState } from "react";
import { QualifyingStandard, QualifyingTime, Swimmer, SwimmerResult, formatEvent, formatTime } from "@/lib/swim";
import { FocusKind, recentResults, strokeProfile, trainingFocus } from "@/lib/trainingFocus";
import { Card, FormField, inputClass } from "@/components/ui";

const KIND_LABEL: Record<FocusKind, { label: string; className: string }> = {
  quali: { label: "Pflichtzeit", className: "bg-app-warn/15 text-app-warn" },
  stroke: { label: "Lage", className: "bg-app-accent/12 text-app-accent" },
  missing: { label: "fehlt", className: "bg-app-elevated text-app-muted" },
  distance: { label: "Distanz", className: "bg-app-good/10 text-app-good" },
  stagnation: { label: "Stagnation", className: "bg-app-bad/10 text-app-bad" },
};

function todayIso() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

export default function TrainingFocusPanel({
  results,
  swimmer,
  standards,
  qualifyingTimes,
}: {
  results: SwimmerResult[];
  swimmer: Swimmer;
  standards: QualifyingStandard[];
  qualifyingTimes: QualifyingTime[];
}) {
  const [standardId, setStandardId] = useState(standards[0]?.id ?? "");
  const [today] = useState(todayIso);
  const standard = standards.find((item) => item.id === standardId) ?? null;
  const standardTimes = useMemo(
    () => qualifyingTimes.filter((time) => time.standard_id === standardId),
    [qualifyingTimes, standardId]
  );

  const items = useMemo(
    () => trainingFocus({ results, swimmer, standard, standardTimes, today }),
    [results, swimmer, standard, standardTimes, today]
  );
  const profile = useMemo(() => strokeProfile(recentResults(results, today)), [results, today]);
  const maxPoints = Math.max(1, ...profile.map((item) => item.points ?? 0));

  return (
    <div className="mt-6 space-y-6">
      <Card
        title="Trainingsfokus bis zum nächsten Wettkampf"
        description="Abgeleitet aus den Bestzeiten der letzten 12 Monate. Die Punkte machen Lagen und Strecken vergleichbar."
      >
        <div className="border-b border-app-border p-5">
          <FormField label="Pflichtzeiten berücksichtigen" className="max-w-md">
            <select value={standardId} onChange={(e) => setStandardId(e.target.value)} className={inputClass}>
              <option value="">– keine –</option>
              {standards.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </FormField>
        </div>

        {items.length === 0 ? (
          <p className="p-5 text-sm text-app-muted">
            Keine klaren Schwerpunkte erkennbar – das Leistungsbild ist ausgeglichen oder es gibt noch zu wenige aktuelle Zeiten
            mit Punkten.
          </p>
        ) : (
          <ol className="divide-y divide-app-border">
            {items.slice(0, 6).map((item, index) => (
              <li key={`${item.kind}-${item.title}`} className="flex gap-4 px-5 py-4">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-app-elevated text-sm font-bold text-app-heading">
                  {index + 1}
                </span>
                <div className="min-w-0">
                  <p className="flex flex-wrap items-center gap-2 font-semibold text-app-heading">
                    {item.title}
                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${KIND_LABEL[item.kind].className}`}>
                      {KIND_LABEL[item.kind].label}
                    </span>
                  </p>
                  <p className="mt-1 text-sm text-app-muted">{item.detail}</p>
                </div>
              </li>
            ))}
          </ol>
        )}
      </Card>

      <Card title="Lagen-Profil" description="Beste Punktzahl je Lage in den letzten 12 Monaten.">
        <div className="space-y-3 p-5">
          {profile.map((item) => (
            <div key={item.stroke} className="grid grid-cols-[110px_1fr_auto] items-center gap-3 text-sm">
              <span className="font-medium">{item.label}</span>
              <div className="h-3 overflow-hidden rounded-full bg-app-elevated">
                <div
                  className="h-full rounded-full bg-app-accent"
                  style={{ width: `${((item.points ?? 0) / maxPoints) * 100}%` }}
                />
              </div>
              <span className="whitespace-nowrap text-app-muted">
                {item.points !== null && item.best
                  ? `${item.points} Pkt. · ${formatEvent(item.best)} ${formatTime(item.best.time_ms)}`
                  : "keine Zeit"}
              </span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
