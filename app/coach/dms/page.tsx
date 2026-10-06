"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { fetchAll } from "@/lib/fetchAll";
import { RESULT_COLUMNS, SWIM_EVENTS, SwimEvent, Swimmer, SwimmerResult, eventKey, formatEventShort, formatTime, splitResults } from "@/lib/swim";
import { candidatesFrom, optimizeLineup } from "@/lib/dmsLineup";
import { Card, FormField, PageHeader, buttonSecondary, inputClass } from "@/components/ui";

/*
 * DMS-Aufstellung: Athleten mit Einzelstarts so auf die Strecken verteilen,
 * dass die Mannschaft die meisten Punkte holt. Regeln einstellbar
 * (Ausschreibung folgt): Starts je Strecke, max. Starts je Schwimmer,
 * Streckenprogramm, Bahn, Zeitraum. Einzelne Starts lassen sich ausschliessen.
 */

/* Vorauswahl: alle Strecken ab 100 m ausser 100 Lagen (anpassbar) */
const DEFAULT_EVENTS = SWIM_EVENTS.filter((event) => event.distance >= 100 && !(event.stroke === "medley" && event.distance === 100)).map(eventKey);

const iso = (ms: number) => new Date(ms).toISOString().slice(0, 10);

export default function DmsPage() {
  const [swimmers, setSwimmers] = useState<Swimmer[]>([]);
  const [results, setResults] = useState<SwimmerResult[]>([]);
  const [gender, setGender] = useState<"male" | "female">("male");
  const [pool, setPool] = useState<"25" | "50" | "beide">("25");
  const [months, setMonths] = useState("12");
  const [startsPerEvent, setStartsPerEvent] = useState("2");
  const [maxStarts, setMaxStarts] = useState("5");
  const [events, setEvents] = useState<string[]>(DEFAULT_EVENTS);
  const [absent, setAbsent] = useState<string[]>([]);
  const [excluded, setExcluded] = useState<string[]>([]);
  const [now] = useState(() => Date.now());

  useEffect(() => {
    async function load() {
      const [swimmerRes, resultRes] = await Promise.all([
        supabase.from("swimmers").select("id, first_name, last_name, birth_year, gender"),
        fetchAll(() => supabase.from("swimmer_results").select(RESULT_COLUMNS)),
      ]);
      setSwimmers(((swimmerRes.data ?? []) as Swimmer[]).sort((a, b) => (a.last_name ?? "").localeCompare(b.last_name ?? "", "de")));
      setResults(splitResults((resultRes.data ?? []) as Record<string, unknown>[]).pool);
    }
    load();
  }, []);

  const team = useMemo(() => swimmers.filter((swimmer) => swimmer.gender === gender), [swimmers, gender]);
  const available = useMemo(() => team.filter((swimmer) => !absent.includes(swimmer.id)), [team, absent]);
  const eventList: SwimEvent[] = useMemo(() => SWIM_EVENTS.filter((event) => events.includes(eventKey(event))), [events]);
  const since = iso(now - (Number(months) || 12) * 30 * 86_400_000);

  const lineup = useMemo(() => {
    const ids = new Set(available.map((swimmer) => swimmer.id));
    const candidates = candidatesFrom(
      results.filter((result) => ids.has(result.swimmer_id)),
      eventList,
      pool === "beide" ? null : Number(pool),
      since
    );
    return optimizeLineup({
      candidates,
      events: eventList,
      swimmerIds: available.map((swimmer) => swimmer.id),
      startsPerEvent: Math.max(1, Number(startsPerEvent) || 2),
      maxStartsPerSwimmer: Math.max(1, Number(maxStarts) || 5),
      excluded,
    });
  }, [available, results, eventList, pool, since, startsPerEvent, maxStarts, excluded]);

  const nameOf = (id: string) => {
    const swimmer = swimmers.find((item) => item.id === id);
    return swimmer ? `${swimmer.first_name} ${(swimmer.last_name ?? "").slice(0, 1)}.` : "?";
  };
  const emptySlots = lineup.assignments.reduce((sum, item) => sum + item.slots.filter((slot) => !slot).length, 0);

  return (
    <main className="mx-auto max-w-6xl space-y-6">
      <PageHeader
        eyebrow="Wettkämpfe"
        title="DMS-Aufstellung"
        icon="trophy"
        description="Einzelstarts, Wertung als Mannschaft: die Verteilung mit den meisten Punkten aus den aktuellen Bestleistungen. Regeln einstellbar, bis die Ausschreibung da ist."
        actions={
          <button type="button" onClick={() => window.print()} className={`${buttonSecondary} print:hidden`}>
            Drucken / PDF
          </button>
        }
      />

      <Card padded className="print:hidden">
        <div className="grid gap-3 sm:grid-cols-5">
          <FormField label="Mannschaft">
            <select value={gender} onChange={(e) => setGender(e.target.value as "male" | "female")} className={inputClass}>
              <option value="male">männlich</option>
              <option value="female">weiblich</option>
            </select>
          </FormField>
          <FormField label="Punkte von Bahn">
            <select value={pool} onChange={(e) => setPool(e.target.value as "25" | "50" | "beide")} className={inputClass}>
              <option value="25">25 m (Kurzbahn)</option>
              <option value="50">50 m</option>
              <option value="beide">beide</option>
            </select>
          </FormField>
          <FormField label="Zeitraum (Monate)">
            <input value={months} onChange={(e) => setMonths(e.target.value)} inputMode="numeric" className={inputClass} />
          </FormField>
          <FormField label="Starts je Strecke">
            <input value={startsPerEvent} onChange={(e) => setStartsPerEvent(e.target.value)} inputMode="numeric" className={inputClass} />
          </FormField>
          <FormField label="Max. Starts je Schwimmer">
            <input value={maxStarts} onChange={(e) => setMaxStarts(e.target.value)} inputMode="numeric" className={inputClass} />
          </FormField>
        </div>

        <p className="mb-1.5 mt-4 text-xs font-medium text-app-muted">Streckenprogramm</p>
        <div className="flex flex-wrap gap-1.5">
          {SWIM_EVENTS.map((event) => {
            const key = eventKey(event);
            const on = events.includes(key);
            return (
              <button
                key={key}
                type="button"
                onClick={() => setEvents((current) => (on ? current.filter((item) => item !== key) : [...current, key]))}
                className={`rounded-full px-2.5 py-1 text-xs font-medium ${on ? "bg-app-accent text-app-accent-ink" : "border border-app-border text-app-muted"}`}
              >
                {formatEventShort(event)}
              </button>
            );
          })}
        </div>

        <p className="mb-1.5 mt-4 text-xs font-medium text-app-muted">Wer ist dabei? (antippen = fehlt)</p>
        <div className="flex flex-wrap gap-1.5">
          {team.map((swimmer) => {
            const away = absent.includes(swimmer.id);
            return (
              <button
                key={swimmer.id}
                type="button"
                onClick={() => setAbsent((current) => (away ? current.filter((id) => id !== swimmer.id) : [...current, swimmer.id]))}
                className={`rounded-lg px-2.5 py-1 text-sm ${away ? "border border-app-border text-app-faint line-through" : "bg-app-elevated font-medium"}`}
              >
                {swimmer.first_name} {swimmer.last_name} · {lineup.startsBySwimmer[swimmer.id] ?? 0}
              </button>
            );
          })}
        </div>
      </Card>

      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-3xl border border-app-border bg-app-surface shadow-app p-4">
          <p className="text-2xl font-bold">{lineup.total.toLocaleString("de-DE")}</p>
          <p className="text-xs text-app-muted">Punkte gesamt</p>
        </div>
        <div className="rounded-3xl border border-app-border bg-app-surface shadow-app p-4">
          <p className="text-2xl font-bold">{available.length}</p>
          <p className="text-xs text-app-muted">Schwimmer verfügbar</p>
        </div>
        <div className={`rounded-2xl border p-4 ${emptySlots ? "border-app-bad/40 bg-app-bad/5" : "border-app-border bg-app-surface"}`}>
          <p className="text-2xl font-bold">{emptySlots}</p>
          <p className="text-xs text-app-muted">unbesetzte Starts</p>
        </div>
      </div>

      <Card title="Aufstellung" description="Beste Leistung je Strecke (Punkte laut DSV-Ergebnis). ✕ schließt einen Start aus – die Aufstellung wird neu berechnet.">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-app-muted">
              <th className="px-4 py-2 font-medium">Strecke</th>
              {Array.from({ length: Math.max(1, Number(startsPerEvent) || 2) }, (_, index) => (
                <th key={index} className="px-3 py-2 font-medium">
                  Start {index + 1}
                </th>
              ))}
              <th className="px-4 py-2 text-right font-medium">Punkte</th>
            </tr>
          </thead>
          <tbody>
            {lineup.assignments.map((assignment) => (
              <tr key={eventKey(assignment.event)} className="border-t border-app-border">
                <td className="px-4 py-2 font-semibold">{formatEventShort(assignment.event)}</td>
                {assignment.slots.map((slot, index) => (
                  <td key={index} className="px-3 py-2">
                    {slot ? (
                      <span className="flex items-center gap-2">
                        <span>
                          <b>{nameOf(slot.swimmerId)}</b>
                          <span className="block text-xs text-app-muted">
                            {formatTime(slot.timeMs)} ({slot.result.pool_length}m) · {slot.points} P
                          </span>
                        </span>
                        <button
                          type="button"
                          title="Diesen Start ausschließen"
                          onClick={() => setExcluded((current) => [...current, `${slot.swimmerId}|${eventKey(assignment.event)}`])}
                          className="text-app-faint hover:text-app-bad print:hidden"
                        >
                          ✕
                        </button>
                      </span>
                    ) : (
                      <span className="text-app-bad">– unbesetzt –</span>
                    )}
                  </td>
                ))}
                <td className="px-4 py-2 text-right font-semibold tabular-nums">
                  {assignment.slots.reduce((sum, slot) => sum + (slot?.points ?? 0), 0)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {excluded.length > 0 && (
          <div className="border-t border-app-border px-4 py-2 text-xs text-app-muted print:hidden">
            {excluded.length} Starts ausgeschlossen ·{" "}
            <button type="button" onClick={() => setExcluded([])} className="text-app-accent">
              zurücksetzen
            </button>
          </div>
        )}
      </Card>

      <p className="text-xs text-app-faint">
        Rechnet mit der besten Punktzahl je Schwimmer und Strecke im gewählten Zeitraum; Strecken ohne Zeit bleiben für diesen Schwimmer unbesetzt. Punkte der
        50m-Bahn sind nur bedingt mit Kurzbahn-Punkten vergleichbar. Regeln (Programm, Starts, Zeitplan-Abstände) nach Ausschreibung prüfen.
      </p>
    </main>
  );
}
