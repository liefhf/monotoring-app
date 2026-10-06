"use client";

import { FormEvent, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Card, FormField, Notice, buttonPrimary, buttonSecondary, inputClass } from "@/components/ui";
import {
  NON_FINISH_LABELS,
  NonFinish,
  NonFinishStatus,
  PoolLength,
  STROKES,
  Stroke,
  Swimmer,
  formatEvent,
  getSwimmerName,
} from "@/lib/swim";

/*
 * Starts ohne Zeit (DS/AB/NA) eines Wettkampfs - mit Grund.
 * Wird im Trainingsfokus als Schwerpunkt aufgegriffen.
 */
export default function NonFinishCard({
  meet,
  swimmers,
  entries,
  missingTable,
  onChanged,
}: {
  meet: { location: string; firstDate: string; pool: number };
  swimmers: Swimmer[];
  entries: NonFinish[];
  missingTable: boolean;
  onChanged: () => void;
}) {
  const [swimmerId, setSwimmerId] = useState("");
  const [distance, setDistance] = useState("100");
  const [stroke, setStroke] = useState<Stroke>("backstroke");
  const [status, setStatus] = useState<NonFinishStatus>("DS");
  const [reason, setReason] = useState("");
  const [editing, setEditing] = useState<Record<string, string>>({});
  const [message, setMessage] = useState("");

  const sortedSwimmers = [...swimmers].sort((a, b) => (a.last_name ?? "").localeCompare(b.last_name ?? "", "de"));
  const nameOf = (id: string) => {
    const swimmer = swimmers.find((item) => item.id === id);
    return swimmer ? getSwimmerName(swimmer) : "?";
  };

  async function handleAdd(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!swimmerId || !Number(distance)) {
      setMessage("Bitte Athlet und Strecke wählen.");
      return;
    }
    const { error } = await supabase.from("swimmer_non_finishes").insert({
      swimmer_id: swimmerId,
      result_date: meet.firstDate,
      location: meet.location,
      pool_length: meet.pool as PoolLength,
      distance: Number(distance),
      stroke,
      status,
      reason: reason.trim() || null,
    });
    if (error) {
      setMessage(`Konnte nicht gespeichert werden: ${error.message}`);
      return;
    }
    setMessage("");
    setReason("");
    onChanged();
  }

  async function saveReason(entry: NonFinish) {
    const { error } = await supabase
      .from("swimmer_non_finishes")
      .update({ reason: editing[entry.id]?.trim() || null })
      .eq("id", entry.id);
    if (error) {
      setMessage(`Konnte nicht gespeichert werden: ${error.message}`);
      return;
    }
    setEditing((current) => {
      const next = { ...current };
      delete next[entry.id];
      return next;
    });
    onChanged();
  }

  return (
    <Card title="Ohne Zeit: disqualifiziert / abgemeldet" description="Mit Grund – fließt in den Trainingsfokus der Athleten ein.">
      <div className="space-y-4 p-5">
        {missingTable && (
          <Notice tone="warn">
            Bitte zuerst <b>disqualifikationen.sql</b> im Supabase SQL-Editor ausführen, dann die Seite neu laden.
          </Notice>
        )}
        {message && <Notice tone="bad">{message}</Notice>}

        {entries.length > 0 && (
          <ul className="divide-y divide-app-border rounded-xl border border-app-border">
            {entries.map((entry) => (
              <li key={entry.id} className="space-y-2 px-4 py-3 text-sm">
                <p>
                  <b>{nameOf(entry.swimmer_id)}</b> – {formatEvent(entry)} ·{" "}
                  <span className={entry.status === "DS" ? "font-semibold text-app-bad" : "text-app-muted"}>
                    {entry.status} ({NON_FINISH_LABELS[entry.status]})
                  </span>
                </p>
                {editing[entry.id] !== undefined ? (
                  <div className="flex flex-wrap gap-2">
                    <input
                      value={editing[entry.id]}
                      onChange={(e) => setEditing({ ...editing, [entry.id]: e.target.value })}
                      placeholder="z. B. Wende: Rückenlage vor dem Anschlag verlassen"
                      className={`${inputClass} flex-1`}
                    />
                    <button type="button" onClick={() => saveReason(entry)} className={buttonPrimary}>
                      Speichern
                    </button>
                  </div>
                ) : (
                  <p className="text-app-muted">
                    {entry.reason ? `Grund: ${entry.reason}` : <span className="text-app-warn">Grund fehlt</span>}{" "}
                    <button
                      type="button"
                      onClick={() => setEditing({ ...editing, [entry.id]: entry.reason ?? "" })}
                      className="ml-2 text-app-accent"
                    >
                      {entry.reason ? "ändern" : "eintragen"}
                    </button>
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}

        <form onSubmit={handleAdd} className="grid gap-3 md:grid-cols-6">
          <FormField label="Athlet" className="md:col-span-2">
            <select value={swimmerId} onChange={(e) => setSwimmerId(e.target.value)} className={inputClass}>
              <option value="">– wählen –</option>
              {sortedSwimmers.map((swimmer) => (
                <option key={swimmer.id} value={swimmer.id}>
                  {swimmer.last_name}, {swimmer.first_name}
                </option>
              ))}
            </select>
          </FormField>
          <FormField label="Strecke (m)">
            <input value={distance} onChange={(e) => setDistance(e.target.value)} inputMode="numeric" className={inputClass} />
          </FormField>
          <FormField label="Lage">
            <select value={stroke} onChange={(e) => setStroke(e.target.value as Stroke)} className={inputClass}>
              {STROKES.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </FormField>
          <FormField label="Status" className="md:col-span-2">
            <select value={status} onChange={(e) => setStatus(e.target.value as NonFinishStatus)} className={inputClass}>
              {(Object.keys(NON_FINISH_LABELS) as NonFinishStatus[]).map((key) => (
                <option key={key} value={key}>
                  {key} – {NON_FINISH_LABELS[key]}
                </option>
              ))}
            </select>
          </FormField>
          <FormField label="Grund" className="md:col-span-5">
            <input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="z. B. Brust: Wechselbeinschlag / Rücken: Wende nicht regelkonform"
              className={inputClass}
            />
          </FormField>
          <div className="flex items-end">
            <button type="submit" className={`${buttonSecondary} w-full`} disabled={missingTable}>
              Hinzufügen
            </button>
          </div>
        </form>
      </div>
    </Card>
  );
}
