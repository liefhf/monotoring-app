"use client";

import { useState } from "react";
import { Stroke } from "@/lib/swim";
import {
  FAULT_PHASES,
  FaultPhase,
  StartFault,
  faultByCode,
  faultsForStroke,
  phaseForSegment,
  raceSegments,
  segmentLabel,
} from "@/lib/faultCatalog";

/*
 * Fehler per Klick erfassen: 1. Abschnitt antippen (Start, Bahn, Wende, Ziel),
 * 2. Fehler antippen. Grosse Flaechen fuer nasse Finger, kein Tippen noetig.
 */
export default function FaultPicker({
  stroke,
  distance,
  poolLength,
  value,
  onChange,
}: {
  stroke: Stroke;
  distance: number;
  poolLength: number;
  value: StartFault[];
  onChange: (faults: StartFault[]) => void;
}) {
  const segments = raceSegments(distance, poolLength);
  const [segment, setSegment] = useState("gesamt");
  const [phase, setPhase] = useState<FaultPhase>("tempo");
  const options = faultsForStroke(stroke).filter((fault) => fault.phase === phase);

  function pickSegment(next: string) {
    setSegment(next);
    const suggested = phaseForSegment(next);
    if (suggested) setPhase(suggested);
  }

  function toggle(code: string) {
    const exists = value.some((item) => item.code === code && item.segment === segment);
    onChange(exists ? value.filter((item) => !(item.code === code && item.segment === segment)) : [...value, { code, segment }]);
  }

  return (
    <div className="space-y-3">
      <div>
        <p className="mb-1.5 text-xs font-medium text-app-muted">1. Wo? (Abschnitt)</p>
        <div className="flex flex-wrap gap-1.5">
          {segments.map((item) => (
            <button
              key={item.value}
              type="button"
              onClick={() => pickSegment(item.value)}
              className={`min-h-10 rounded-lg px-3 text-sm font-medium transition ${
                segment === item.value ? "bg-app-accent text-app-accent-ink" : "border border-app-border bg-app-bg text-app-text"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="mb-1.5 text-xs font-medium text-app-muted">2. Was? (Fehler)</p>
        <div className="mb-2 flex flex-wrap gap-1">
          {FAULT_PHASES.map((item) => (
            <button
              key={item.value}
              type="button"
              onClick={() => setPhase(item.value)}
              className={`rounded-full px-2.5 py-1 text-xs ${phase === item.value ? "bg-app-elevated font-semibold text-app-heading" : "text-app-muted"}`}
            >
              {item.label}
            </button>
          ))}
        </div>
        <div className="grid gap-1.5 sm:grid-cols-2">
          {options.map((fault) => {
            const active = value.some((item) => item.code === fault.code && item.segment === segment);
            return (
              <button
                key={fault.code}
                type="button"
                onClick={() => toggle(fault.code)}
                className={`min-h-11 rounded-lg px-3 py-2 text-left text-sm transition ${
                  active
                    ? "bg-app-bad text-white"
                    : fault.rule
                      ? "border border-app-bad/40 bg-app-bad/5 text-app-text"
                      : "border border-app-border bg-app-bg text-app-text"
                }`}
              >
                {fault.rule && "⚠ "}
                {fault.label}
              </button>
            );
          })}
        </div>
      </div>

      {value.length > 0 && (
        <div className="flex flex-wrap gap-1.5 border-t border-app-border pt-2">
          {value.map((item) => (
            <button
              key={`${item.code}-${item.segment}`}
              type="button"
              onClick={() => onChange(value.filter((entry) => entry !== item))}
              className="rounded-full bg-app-bad/10 px-2.5 py-1 text-xs font-medium text-app-bad"
              title="Entfernen"
            >
              {faultByCode.get(item.code)?.label ?? item.code} · {segmentLabel(item.segment, poolLength)} ✕
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
