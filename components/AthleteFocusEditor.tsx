"use client";

import { ReactNode, useState } from "react";
import { STROKES, SWIM_EVENTS } from "@/lib/swim";
import { AthleteFocus, FocusRole, focusKey, focusRole } from "@/lib/trainingFocus";
import { saveAthleteFocus } from "@/lib/nextCompetition";
import { Card, Notice, buttonPrimary, inputClass } from "@/components/ui";

/*
 * Trainer legt die Fokus-Strecken fest: 1 Klick = Hauptstrecke,
 * 2 Klicks = Nebenstrecke, 3 Klicks = nicht im Fokus.
 */
export default function AthleteFocusEditor({
  swimmerId,
  focus,
  missingColumns,
  onSaved,
  children,
}: {
  swimmerId: string;
  focus: AthleteFocus;
  missingColumns: boolean;
  onSaved: (focus: AthleteFocus) => void;
  /* z. B. die Pflichtzeiten-Empfehlung direkt im Fokus-Block */
  children?: ReactNode;
}) {
  const [events, setEvents] = useState<string[]>(focus.events ?? []);
  const [note, setNote] = useState(focus.note ?? "");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ tone: "good" | "bad"; text: string } | null>(null);
  const draft: AthleteFocus = { events, strokes: null, distances: null, note };
  const dirty = JSON.stringify(events) !== JSON.stringify(focus.events ?? []) || note !== (focus.note ?? "");

  function cycle(event: (typeof SWIM_EVENTS)[number]) {
    const role = focusRole(event, draft);
    const next: FocusRole | null = role === null ? "haupt" : role === "haupt" ? "neben" : null;
    setEvents((current) => [
      ...current.filter((key) => !key.startsWith(`${event.distance}-${event.stroke}`)),
      ...(next ? [focusKey(event, next)] : []),
    ]);
    setMessage(null);
  }

  async function save() {
    setSaving(true);
    const error = await saveAthleteFocus(swimmerId, draft);
    setSaving(false);
    if (error) {
      setMessage({ tone: "bad", text: `Konnte nicht gespeichert werden: ${error}` });
      return;
    }
    setMessage({ tone: "good", text: "Fokus gespeichert ✅" });
    onSaved(draft);
  }

  const chip = (role: FocusRole | null) =>
    `rounded-full px-2.5 py-1 text-xs font-medium transition ${
      role === "haupt"
        ? "border border-app-accent bg-app-accent text-app-accent-ink"
        : role === "neben"
          ? "border border-dashed border-app-accent bg-app-accent/10 text-app-accent"
          : "border border-app-border bg-app-bg text-app-muted hover:border-app-accent"
    }`;

  const count = (role: FocusRole) => events.filter((key) => key.endsWith(":neben") === (role === "neben")).length;

  return (
    <Card
      title="Unser Fokus"
      description="Klick: 1× Hauptstrecke · 2× Nebenstrecke · 3× entfernen. Ohne Auswahl wird alles ausgewertet."
    >
      <div className="space-y-3 p-4">
        {missingColumns && (
          <Notice tone="warn">
            Bitte zuerst <b>athleten_fokus.sql</b> und <b>athleten_fokus_strecken.sql</b> im Supabase SQL-Editor ausführen.
          </Notice>
        )}
        {message && <Notice tone={message.tone}>{message.text}</Notice>}

        <div className="grid gap-x-6 gap-y-1.5 md:grid-cols-2">
          {STROKES.map((stroke) => (
            <div key={stroke.value} className="flex flex-wrap items-center gap-1.5">
              <span className="w-24 shrink-0 text-xs font-medium text-app-text">{stroke.label}</span>
              {SWIM_EVENTS.filter((event) => event.stroke === stroke.value).map((event) => (
                <button key={event.distance} type="button" onClick={() => cycle(event)} className={chip(focusRole(event, draft))}>
                  {event.distance}
                </button>
              ))}
            </div>
          ))}
        </div>

        <div className="flex flex-wrap items-end gap-3">
          <label className="min-w-[220px] flex-1">
            <span className="mb-1 block text-xs font-medium">Notiz / Saisonziel</span>
            <input value={note} onChange={(e) => setNote(e.target.value)} className={`${inputClass} py-2`} />
          </label>
          <span className="pb-2 text-xs text-app-muted">
            {count("haupt")} Haupt · {count("neben")} Neben
          </span>
          <button type="button" onClick={save} disabled={saving || missingColumns || !dirty} className={`${buttonPrimary} py-2`}>
            {saving ? "Speichern..." : "Fokus speichern"}
          </button>
        </div>
      </div>

      {children}
    </Card>
  );
}
