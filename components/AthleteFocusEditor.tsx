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
  suggestion,
  children,
}: {
  /* Vorschlag aus den Ergebnissen; ist noch kein Fokus gespeichert, wird er vorausgefuellt */
  suggestion?: { events: string[]; reasons: Record<string, string> };
  swimmerId: string;
  focus: AthleteFocus;
  missingColumns: boolean;
  onSaved: (focus: AthleteFocus) => void;
  /* z. B. die Pflichtzeiten-Empfehlung direkt im Fokus-Block */
  children?: ReactNode;
}) {
  const savedEvents = focus.events ?? [];
  const prefill = savedEvents.length === 0 && Boolean(suggestion?.events.length);
  const [events, setEvents] = useState<string[]>(prefill ? suggestion!.events : savedEvents);
  const [fromSuggestion, setFromSuggestion] = useState(prefill);
  const [note, setNote] = useState(focus.note ?? "");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ tone: "good" | "bad"; text: string } | null>(null);
  const draft: AthleteFocus = { events, strokes: null, distances: null, note };
  const dirty = JSON.stringify(events) !== JSON.stringify(savedEvents) || note !== (focus.note ?? "");

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
    setFromSuggestion(false);
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

        {suggestion && suggestion.events.length > 0 && (
          <div className="rounded-xl border border-app-accent/30 bg-app-accent/8 px-3 py-2 text-xs text-app-text">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-semibold">
                {fromSuggestion ? "Mein Vorschlag – noch nicht gespeichert, bitte prüfen und ggf. anpassen:" : "Vorschlag aus den Ergebnissen:"}
              </span>
              {!fromSuggestion && (
                <button
                  type="button"
                  onClick={() => {
                    setEvents(suggestion.events);
                    setFromSuggestion(true);
                    setMessage(null);
                  }}
                  className="font-semibold text-app-accent"
                >
                  Vorschlag übernehmen
                </button>
              )}
            </div>
            <p className="mt-1 text-app-muted">
              {suggestion.events
                .map((key) => {
                  const [eventPart, role] = key.split(":");
                  const [distance, stroke] = eventPart.split("-");
                  const short = STROKES.find((item) => item.value === stroke)?.short ?? stroke;
                  return `${distance} ${short} ${role === "neben" ? "Neben" : "Haupt"} (${suggestion.reasons[eventPart]})`;
                })
                .join(" · ")}
            </p>
          </div>
        )}

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
