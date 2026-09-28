"use client";

import { useState } from "react";
import { STROKES, SWIM_EVENTS, eventKey } from "@/lib/swim";
import { AthleteFocus } from "@/lib/trainingFocus";
import { saveAthleteFocus } from "@/lib/nextCompetition";
import { Card, Notice, buttonPrimary, inputClass } from "@/components/ui";

/*
 * Trainer legt fest, welche Strecken im Fokus des Athleten stehen
 * (beliebig viele Lagen und Distanzen). Die Auswertung richtet sich danach.
 */
export default function AthleteFocusEditor({
  swimmerId,
  focus,
  missingColumns,
  onSaved,
}: {
  swimmerId: string;
  focus: AthleteFocus;
  missingColumns: boolean;
  onSaved: (focus: AthleteFocus) => void;
}) {
  const [events, setEvents] = useState<string[]>(focus.events ?? []);
  const [note, setNote] = useState(focus.note ?? "");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ tone: "good" | "bad"; text: string } | null>(null);

  function toggle(key: string) {
    setEvents((current) => (current.includes(key) ? current.filter((item) => item !== key) : [...current, key]));
    setMessage(null);
  }

  async function save() {
    setSaving(true);
    const next: AthleteFocus = { events, strokes: null, distances: null, note };
    const error = await saveAthleteFocus(swimmerId, next);
    setSaving(false);
    if (error) {
      setMessage({ tone: "bad", text: `Konnte nicht gespeichert werden: ${error}` });
      return;
    }
    setMessage({ tone: "good", text: "Fokus gespeichert ✅ – die Auswertung richtet sich jetzt danach." });
    onSaved(next);
  }

  const chip = (active: boolean) =>
    `min-w-[64px] rounded-full border px-3 py-1.5 text-sm font-medium transition ${
      active
        ? "border-app-accent bg-app-accent text-app-accent-ink"
        : "border-app-border bg-app-bg text-app-text hover:border-app-accent"
    }`;

  return (
    <Card
      title="Unser Fokus für diesen Athleten"
      description="Alle Strecken anklicken, auf die ihr hinarbeitet – beliebig viele Lagen und Distanzen. Nichts ausgewählt = alles wird ausgewertet. Disqualifikationen erscheinen immer."
    >
      <div className="space-y-4 p-5">
        {missingColumns && (
          <Notice tone="warn">
            Bitte zuerst <b>athleten_fokus.sql</b> und <b>athleten_fokus_strecken.sql</b> im Supabase SQL-Editor ausführen,
            dann die Seite neu laden.
          </Notice>
        )}
        {message && <Notice tone={message.tone}>{message.text}</Notice>}

        <div className="space-y-2">
          {STROKES.map((stroke) => (
            <div key={stroke.value} className="flex flex-wrap items-center gap-2">
              <span className="w-28 shrink-0 text-sm font-medium">{stroke.label}</span>
              {SWIM_EVENTS.filter((event) => event.stroke === stroke.value).map((event) => {
                const key = eventKey(event);
                return (
                  <button key={key} type="button" onClick={() => toggle(key)} className={chip(events.includes(key))}>
                    {event.distance} m
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        <p className="text-sm text-app-muted">
          {events.length === 0 ? "Keine Strecke ausgewählt." : `${events.length} Strecken im Fokus.`}
        </p>

        <label className="block">
          <span className="mb-1.5 block text-sm font-medium">Notiz (z. B. Saisonziel)</span>
          <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} className={inputClass} />
        </label>

        <button type="button" onClick={save} disabled={saving || missingColumns} className={buttonPrimary}>
          {saving ? "Speichern..." : "Fokus speichern"}
        </button>
      </div>
    </Card>
  );
}
