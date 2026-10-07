"use client";

import Loader from "@/components/Loader";
import { useEffect, useMemo, useState } from "react";
import { loadTeamSwimmers } from "@/lib/attendance";
import { formatTime, formatTimeDifference, Swimmer } from "@/lib/swim";
import {
  formatInterval,
  formatTimesInput,
  loadPreviousSetTimes,
  loadSessionSetTimes,
  parseIntervalSeconds,
  parseTimesInput,
  saveSetTimes,
  setStats,
  SetTimeRow,
} from "@/lib/setTimes";

const STROKES = ["", "F", "R", "B", "S", "L"];

type Draft = { stroke: string; interval: string; times: string };
type Previous = Awaited<ReturnType<typeof loadPreviousSetTimes>>[number];

/*
 * Serienzeiten einer Trainingseinheit (z. B. 10x100 Hauptlage): je Athlet
 * Lage, Abgang und die Zeiten der Wiederholungen. Auswertung je Athlet und
 * Vergleich mit dem letzten Mal, als dieselbe Serie geschwommen wurde.
 */
export default function SetTimesCard({ sessionId, teamId, sessionDate }: { sessionId: string; teamId: string; sessionDate: string }) {
  const [swimmers, setSwimmers] = useState<Swimmer[]>([]);
  const [rows, setRows] = useState<SetTimeRow[]>([]);
  const [previous, setPrevious] = useState<Previous[]>([]);
  const [labels, setLabels] = useState<string[]>([]);
  const [active, setActive] = useState("");
  const [newLabel, setNewLabel] = useState("");
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [missingTable, setMissingTable] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const [team, result] = await Promise.all([loadTeamSwimmers(teamId), loadSessionSetTimes(sessionId)]);
      const sessionLabels = [...new Set(result.rows.map((row) => row.set_label))];
      setSwimmers(team);
      setRows(result.rows);
      setLabels(sessionLabels);
      setActive(sessionLabels[0] ?? "");
      setMissingTable(result.missingTable);
      setLoading(false);
    }
    load();
  }, [sessionId, teamId]);

  useEffect(() => {
    if (!active || swimmers.length === 0) return;
    loadPreviousSetTimes(swimmers.map((s) => s.id), [active], sessionDate).then(setPrevious);
  }, [active, swimmers, sessionDate]);

  // Eingabe je Serie + Athlet; ohne Bearbeitung die gespeicherten Werte
  function getDraft(swimmerId: string): Draft {
    const edited = drafts[`${active}|${swimmerId}`];
    if (edited) return edited;
    const row = rows.find((r) => r.swimmer_id === swimmerId && r.set_label === active);
    return {
      stroke: row?.stroke ?? "",
      interval: row?.interval_seconds ? formatInterval(row.interval_seconds) : "",
      times: row ? formatTimesInput(row.times_ms) : "",
    };
  }

  function addSet() {
    const label = newLabel.trim();
    if (!label) return;
    if (!labels.includes(label)) setLabels((current) => [...current, label]);
    setActive(label);
    setNewLabel("");
  }

  async function save(swimmerId: string) {
    const draft = getDraft(swimmerId);
    const existing = rows.find((r) => r.swimmer_id === swimmerId && r.set_label === active);
    const parsed = parseTimesInput(draft.times);
    if (parsed.invalid.length) {
      setError(`Ungültige Zeit: ${parsed.invalid.join(", ")} (Format z. B. 1:41 oder 1:31,5, „-“ = nicht geschwommen)`);
      return;
    }
    // Nichts eingetragen und noch nichts gespeichert: keine leere Zeile anlegen
    if (!existing && parsed.times.length === 0) return;
    const row: SetTimeRow = {
      training_session_id: sessionId,
      swimmer_id: swimmerId,
      set_label: active,
      stroke: draft.stroke || null,
      interval_seconds: parseIntervalSeconds(draft.interval),
      times_ms: parsed.times,
      note: existing?.note ?? null,
    };
    if (existing && JSON.stringify({ ...existing }) === JSON.stringify(row)) return;
    const message = await saveSetTimes(row);
    if (message) {
      setError(`Zeiten konnten nicht gespeichert werden: ${message}`);
      return;
    }
    setError("");
    setRows((current) => [...current.filter((r) => !(r.swimmer_id === swimmerId && r.set_label === active)), row]);
  }

  const evaluation = useMemo(
    () =>
      swimmers
        .map((swimmer) => {
          const row = rows.find((r) => r.swimmer_id === swimmer.id && r.set_label === active);
          if (!row || row.times_ms.length === 0) return null;
          const stats = setStats(row.times_ms, row.interval_seconds);
          const prev = previous.find((p) => p.swimmer_id === swimmer.id);
          const prevStats = prev ? setStats(prev.times_ms, prev.interval_seconds) : null;
          return { swimmer, row, stats, prev, prevStats };
        })
        .filter((entry) => entry !== null),
    [swimmers, rows, previous, active]
  );

  const input = "min-h-11 rounded-lg border border-app-border bg-app-bg px-2 text-base sm:text-sm";

  return (
    <section className="mt-5 overflow-hidden rounded-[20px] border border-app-border bg-app-surface shadow-app">
      <div className="border-b border-app-border px-4 py-3">
        <h2 className="text-lg font-semibold">Serienzeiten</h2>
        <p className="text-xs text-app-muted">
          Zeiten einer Serie je Athlet eintragen. Der Vergleich nutzt das letzte Training mit einer Serie gleichen Namens.
        </p>
      </div>

      {missingTable ? (
        <p className="p-4 text-sm text-app-warn">Bitte zuerst <b>serienzeiten.sql</b> im Supabase SQL-Editor ausführen und die Seite neu laden.</p>
      ) : loading ? (
        <p className="p-4 text-sm text-app-muted"><Loader /></p>
      ) : swimmers.length === 0 ? (
        <p className="p-4 text-sm text-app-muted">Diesem Team sind keine Athleten zugeordnet.</p>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-2 border-b border-app-border px-4 py-3">
            {labels.map((label) => (
              <button
                key={label}
                type="button"
                onClick={() => setActive(label)}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
                  label === active ? "bg-app-accent text-app-accent-ink" : "border border-app-border hover:bg-app-elevated"
                }`}
              >
                {label}
              </button>
            ))}
            <input
              value={newLabel}
              onChange={(event) => setNewLabel(event.target.value)}
              onKeyDown={(event) => event.key === "Enter" && addSet()}
              placeholder="z. B. 10x100 Hauptlage"
              className={`${input} w-48`}
            />
            <button type="button" onClick={addSet} className="min-h-11 rounded-lg border border-app-border px-3 text-sm font-medium hover:bg-app-elevated">
              + Serie
            </button>
          </div>

          {!active ? (
            <p className="p-4 text-sm text-app-muted">Lege oben eine Serie an. Nimm für den Vergleich beim nächsten Mal denselben Namen.</p>
          ) : (
            <>
              <ul className="divide-y divide-app-border">
                {swimmers.map((swimmer) => {
                  const draft = getDraft(swimmer.id);
                  const update = (patch: Partial<Draft>) =>
                    setDrafts((current) => ({ ...current, [`${active}|${swimmer.id}`]: { ...draft, ...patch } }));
                  return (
                    <li key={swimmer.id} className="grid gap-2 px-4 py-2 md:grid-cols-[180px_70px_80px_1fr] md:items-center">
                      <span className="text-sm font-medium">
                        {swimmer.last_name}, {swimmer.first_name}
                      </span>
                      <select
                        value={draft.stroke}
                        onChange={(event) => update({ stroke: event.target.value })}
                        onBlur={() => save(swimmer.id)}
                        title="Lage: F Freistil, R Rücken, B Brust, S Schmetterling, L Lagen"
                        className={input}
                      >
                        {STROKES.map((stroke) => (
                          <option key={stroke} value={stroke}>
                            {stroke || "Lage"}
                          </option>
                        ))}
                      </select>
                      <input
                        value={draft.interval}
                        onChange={(event) => update({ interval: event.target.value })}
                        onBlur={() => save(swimmer.id)}
                        placeholder="Abgang"
                        inputMode="decimal"
                        className={input}
                      />
                      <input
                        value={draft.times}
                        onChange={(event) => update({ times: event.target.value })}
                        onBlur={() => save(swimmer.id)}
                        placeholder="1:41 1:40 1:51 - 1:50 …"
                        className={input}
                      />
                    </li>
                  );
                })}
              </ul>

              {evaluation.length > 0 && (
                <div className="overflow-x-auto border-t border-app-border">
                  <table className="w-full min-w-[640px] text-sm">
                    <thead className="bg-app-bg/50 text-left text-xs uppercase tracking-wide text-app-faint">
                      <tr>
                        <th className="px-4 py-2">Athlet</th>
                        <th className="px-2 py-2">Ø Zeit</th>
                        <th className="px-2 py-2">Beste</th>
                        <th className="px-2 py-2" title="Mittel 2. Hälfte minus Mittel 1. Hälfte">Abfall</th>
                        <th className="px-2 py-2">Im Abgang</th>
                        <th className="px-2 py-2">Letztes Mal</th>
                        <th className="px-4 py-2">Veränderung Ø</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-app-border">
                      {evaluation.map(({ swimmer, row, stats, prev, prevStats }) => {
                        const diff = stats.averageMs !== null && prevStats?.averageMs != null ? stats.averageMs - prevStats.averageMs : null;
                        return (
                          <tr key={swimmer.id}>
                            <td className="px-4 py-2 font-medium">
                              {swimmer.first_name} {row.stroke && <span className="text-app-faint">({row.stroke})</span>}
                            </td>
                            <td className="px-2 py-2">{stats.averageMs !== null ? formatTime(stats.averageMs) : "—"}</td>
                            <td className="px-2 py-2">{stats.bestMs !== null ? formatTime(stats.bestMs) : "—"}</td>
                            <td className={`px-2 py-2 ${stats.dropOffMs !== null && stats.dropOffMs > 3000 ? "text-app-warn" : ""}`}>
                              {stats.dropOffMs !== null ? formatTimeDifference(stats.dropOffMs) : "—"}
                            </td>
                            <td className="px-2 py-2">
                              {stats.withinInterval !== null ? `${stats.withinInterval} / ${stats.planned}` : "—"}
                            </td>
                            <td className="px-2 py-2 text-app-muted">
                              {prev && prevStats?.averageMs != null
                                ? `${formatTime(prevStats.averageMs)} (${prev.date.split("-").reverse().join(".")})`
                                : "—"}
                            </td>
                            <td className={`px-4 py-2 font-semibold ${diff === null ? "text-app-faint" : diff < 0 ? "text-app-good" : diff > 0 ? "text-app-bad" : ""}`}>
                              {diff === null ? "erstes Mal" : `${formatTimeDifference(diff)} ${diff < 0 ? "besser" : diff > 0 ? "langsamer" : ""}`}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </>
      )}
      {error && <p className="border-t border-app-border px-4 py-2 text-sm text-app-bad">{error}</p>}
      <p className="border-t border-app-border px-4 py-2 text-xs text-app-faint">
        Zeiten mit Leerzeichen trennen, „-“ = nicht geschwommen · Lage: F Freistil, R Rücken, B Brust, S Schmetterling, L Lagen · Speichert beim Verlassen des Feldes
      </p>
    </section>
  );
}
