"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarEntry } from "@/lib/community";
import { describeCompetition, loadNonFinishes, loadUpcomingCompetitions } from "@/lib/nextCompetition";
import AthleteFocusEditor from "@/components/AthleteFocusEditor";
import { RoleBadge } from "@/components/FocusBadge";
import { NonFinish, QualifyingStandard, QualifyingTime, Swimmer, SwimmerResult, formatEvent, formatEventShort, formatTime } from "@/lib/swim";
import { AthleteFocus, FocusKind, focusRole, recentResults, strokeProfile, topFocus, trainingFocus } from "@/lib/trainingFocus";
import { Card, inputClass } from "@/components/ui";

const KIND_LABEL: Record<FocusKind, { label: string; className: string }> = {
  dq: { label: "Disqualifikation", className: "bg-app-bad/10 text-app-bad" },
  quali: { label: "Pflichtzeit", className: "bg-app-warn/15 text-app-warn" },
  stroke: { label: "Lage", className: "bg-app-accent/12 text-app-accent" },
  missing: { label: "fehlt", className: "bg-app-elevated text-app-muted" },
  distance: { label: "Distanz", className: "bg-app-good/10 text-app-good" },
  stagnation: { label: "Stagnation", className: "bg-app-bad/10 text-app-bad" },
};

const LEVEL = {
  close: { label: "sehr knapp", advice: "oberste Priorität – beim nächsten Start realistisch", className: "bg-app-warn/15 text-app-warn" },
  reach: { label: "in Reichweite", advice: "Schwerpunkt, in 1–2 Wettkämpfen erreichbar", className: "bg-app-accent/12 text-app-accent" },
  open: { label: "Start fehlt", advice: "Start einplanen", className: "bg-app-elevated text-app-muted" },
  mid: { label: "mittelfristig", advice: "kontinuierlich aufbauen", className: "bg-app-elevated text-app-text" },
  far: { label: "langfristig", advice: "Grundlagen entwickeln", className: "bg-app-elevated text-app-faint" },
  done: { label: "erfüllt ✓", advice: "halten, Meldezeit verbessern", className: "bg-app-good/10 text-app-good" },
} as const;

function todayIso() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

export default function TrainingFocusPanel({
  results,
  swimmer,
  standards,
  qualifyingTimes,
  focus,
  missingColumns,
  onFocusSaved,
}: {
  results: SwimmerResult[];
  swimmer: Swimmer;
  standards: QualifyingStandard[];
  qualifyingTimes: QualifyingTime[];
  focus: AthleteFocus;
  missingColumns: boolean;
  onFocusSaved: (focus: AthleteFocus) => void;
}) {
  const [standardId, setStandardId] = useState(standards[0]?.id ?? "");
  const [today] = useState(todayIso);
  const [nonFinishes, setNonFinishes] = useState<NonFinish[]>([]);
  const [upcoming, setUpcoming] = useState<CalendarEntry[]>([]);

  useEffect(() => {
    loadNonFinishes(swimmer.id).then(({ rows }) => setNonFinishes(rows));
    loadUpcomingCompetitions().then(setUpcoming);
  }, [swimmer.id]);

  const standard = standards.find((item) => item.id === standardId) ?? null;
  const standardTimes = useMemo(
    () => qualifyingTimes.filter((time) => time.standard_id === standardId),
    [qualifyingTimes, standardId]
  );

  const items = useMemo(
    () => trainingFocus({ results, swimmer, standard, standardTimes, today, nonFinishes, focus }),
    [results, swimmer, standard, standardTimes, today, nonFinishes, focus]
  );
  const profile = useMemo(() => strokeProfile(recentResults(results, today)), [results, today]);
  const hasFocus = Boolean(focus.events?.length || focus.strokes?.length || focus.distances?.length);
  /* Pflichtzeiten-Empfehlung fuer jede (Fokus-)Strecke, naechste Ziele zuerst */
  const qualiItems = items.filter((item) => item.kind === "quali");
  /* In der To-do-Liste nur, woran jetzt gearbeitet werden muss */
  const todo = items.filter((item) => item.level !== "done" && item.level !== "far");
  const maxPoints = Math.max(1, ...profile.map((item) => item.points ?? 0));

  return (
    <div className="mt-6 space-y-6">
      <AthleteFocusEditor
        key={`${swimmer.id}-${(focus.events ?? []).join()}`}
        swimmerId={swimmer.id}
        focus={focus}
        missingColumns={missingColumns}
        onSaved={onFocusSaved}
      >
        <div className="border-t border-app-border">
          <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5">
            <p className="text-sm font-semibold">Empfehlung anhand der Pflichtzeiten</p>
            <select
              value={standardId}
              onChange={(e) => setStandardId(e.target.value)}
              className={`${inputClass} w-auto py-1.5 text-xs`}
            >
              <option value="">– keine Pflichtzeiten –</option>
              {standards.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </div>

          {standard &&
            (qualiItems.length === 0 ? (
              <p className="px-4 pb-4 text-sm text-app-muted">Keine Pflichtzeit für diese Strecken, Jahrgang und Geschlecht.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-y border-app-border text-left text-xs text-app-muted">
                      <th className="px-4 py-1.5">Strecke</th>
                      <th className="px-3 py-1.5 text-right">Bestzeit</th>
                      <th className="px-3 py-1.5 text-right">Pflichtzeit</th>
                      <th className="px-3 py-1.5 text-right">Abstand</th>
                      <th className="px-3 py-1.5">Stand</th>
                      <th className="px-4 py-1.5">Empfehlung</th>
                    </tr>
                  </thead>
                  <tbody>
                    {qualiItems.map((item) => {
                      const level = LEVEL[item.level ?? "open"];
                      const gap = item.bestMs != null && item.requiredMs ? item.bestMs - item.requiredMs : null;
                      return (
                        <tr key={item.title} className="border-b border-app-border last:border-b-0">
                          <td className="whitespace-nowrap px-4 py-1.5 font-medium">
                            {formatEventShort(item.event!)}
                            <RoleBadge role={item.role} />
                          </td>
                          <td className="whitespace-nowrap px-3 py-1.5 text-right">{item.bestMs != null ? formatTime(item.bestMs) : "–"}</td>
                          <td className="whitespace-nowrap px-3 py-1.5 text-right text-app-muted">{formatTime(item.requiredMs!)}</td>
                          <td className={`whitespace-nowrap px-3 py-1.5 text-right font-semibold ${gap === null ? "text-app-faint" : gap <= 0 ? "text-app-good" : "text-app-heading"}`}>
                            {gap === null ? "–" : gap <= 0 ? `−${formatTime(-gap)}` : `+${formatTime(gap)}`}
                          </td>
                          <td className="whitespace-nowrap px-3 py-1.5">
                            <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${level.className}`}>{level.label}</span>
                          </td>
                          <td className="px-4 py-1.5 text-xs text-app-muted">{level.advice}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ))}
        </div>
      </AthleteFocusEditor>

      <Card
        title="Bis zum nächsten Wettkampf"
        description={hasFocus ? "Ausgerichtet auf eure Fokus-Strecken." : "Kein Fokus festgelegt – alle Strecken werden ausgewertet."}
      >
        {upcoming[0] && (
          <p className="border-b border-app-border bg-app-accent/8 px-5 py-3 text-sm text-app-text">
            <b>Nächster Wettkampf:</b> {describeCompetition(upcoming[0])}
            {upcoming[1] && <span className="block text-app-muted">danach: {describeCompetition(upcoming[1])}</span>}
          </p>
        )}

        {todo.length === 0 ? (
          <p className="p-5 text-sm text-app-muted">Keine dringenden Schwerpunkte.</p>
        ) : (
          <ol className="divide-y divide-app-border">
            {topFocus(todo, 5).map((item, index) => (
              <li key={`${item.kind}-${item.title}`} className={`flex gap-4 px-5 py-3 ${item.kind === "dq" ? "bg-app-bad/8" : ""}`}>
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-app-elevated text-sm font-bold text-app-heading">
                  {index + 1}
                </span>
                <div className="min-w-0">
                  <p className="flex flex-wrap items-center gap-2 font-semibold text-app-heading">
                    {item.title}
                    {item.event && <RoleBadge role={item.role ?? focusRole(item.event, focus)} />}
                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${KIND_LABEL[item.kind].className}`}>
                      {KIND_LABEL[item.kind].label}
                    </span>
                  </p>
                  <p className="mt-0.5 text-sm text-app-muted">{item.detail}</p>
                </div>
              </li>
            ))}
          </ol>
        )}
      </Card>

      <Card title="Lagen-Profil" description="Beste Punktzahl je Lage in den letzten 12 Monaten.">
        <div className="space-y-2.5 p-5">
          {profile.map((item) => (
            <div key={item.stroke} className="grid grid-cols-[110px_1fr_auto] items-center gap-3 text-sm">
              <span className="font-medium">{item.label}</span>
              <div className="h-2.5 overflow-hidden rounded-full bg-app-elevated">
                <div className="h-full rounded-full bg-app-accent" style={{ width: `${((item.points ?? 0) / maxPoints) * 100}%` }} />
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
