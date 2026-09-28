"use client";

import { useState } from "react";
import { STROKES, Stroke } from "@/lib/swim";
import { AthleteFocus, DISTANCE_RANGES, DistanceRange } from "@/lib/trainingFocus";
import { saveAthleteFocus } from "@/lib/nextCompetition";
import { Card, Notice, buttonPrimary, inputClass } from "@/components/ui";

/*
 * Trainer legt fest, worauf der Fokus des Athleten liegt.
 * Die Auswertung (Trainingsfokus, Wettkampf-Auswertung) richtet sich danach.
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
  const [strokes, setStrokes] = useState<Stroke[]>(focus.strokes ?? []);
  const [distances, setDistances] = useState<DistanceRange[]>(focus.distances ?? []);
  const [note, setNote] = useState(focus.note ?? "");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ tone: "good" | "bad"; text: string } | null>(null);

  function toggle<T>(list: T[], value: T) {
    return list.includes(value) ? list.filter((item) => item !== value) : [...list, value];
  }

  async function save() {
    setSaving(true);
    const next = { strokes, distances, note };
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
    `rounded-full border px-3 py-1.5 text-sm transition ${
      active ? "border-app-accent bg-app-accent text-app-accent-ink" : "border-app-border bg-app-bg text-app-text hover:border-app-accent"
    }`;

  return (
    <Card
      title="Unser Fokus für diesen Athleten"
      description="Nichts ausgewählt = alles wird ausgewertet. Disqualifikationen erscheinen immer."
    >
      <div className="space-y-4 p-5">
        {missingColumns && (
          <Notice tone="warn">
            Bitte zuerst <b>athleten_fokus.sql</b> im Supabase SQL-Editor ausführen, dann die Seite neu laden.
          </Notice>
        )}
        {message && <Notice tone={message.tone}>{message.text}</Notice>}

        <div>
          <p className="mb-2 text-sm font-medium">Lagen</p>
          <div className="flex flex-wrap gap-2">
            {STROKES.map((stroke) => (
              <button
                key={stroke.value}
                type="button"
                onClick={() => setStrokes(toggle(strokes, stroke.value))}
                className={chip(strokes.includes(stroke.value))}
              >
                {stroke.label}
              </button>
            ))}
          </div>
          {strokes.includes("medley") && (
            <p className="mt-1 text-xs text-app-faint">Mit Lagen im Fokus zählen alle vier Einzellagen für das Lagen-Profil mit.</p>
          )}
        </div>

        <div>
          <p className="mb-2 text-sm font-medium">Strecken</p>
          <div className="flex flex-wrap gap-2">
            {DISTANCE_RANGES.map((range) => (
              <button
                key={range.value}
                type="button"
                onClick={() => setDistances(toggle(distances, range.value))}
                className={chip(distances.includes(range.value))}
              >
                {range.label} <span className="opacity-70">({range.hint})</span>
              </button>
            ))}
          </div>
        </div>

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
