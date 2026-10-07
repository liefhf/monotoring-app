"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { isMissingTable, supabase } from "@/lib/supabase";
import { buttonGhost, buttonPrimary, inputClass } from "@/components/ui";

/*
 * Interne Trainernotizen je Athlet ("Wende Brust verbessern").
 * Bewusst einfach: Text + anheften. Keine Aufgabenverwaltung.
 * Nur fuer Trainer sichtbar (RLS, Skript 24).
 */

type Note = { id: string; body: string; pinned: boolean; created_at: string };

export default function NotesPanel({ swimmerId, limit }: { swimmerId: string; limit?: number }) {
  const [notes, setNotes] = useState<Note[] | null>(null);
  const [missing, setMissing] = useState(false);
  const [text, setText] = useState("");
  const [showAll, setShowAll] = useState(false);

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from("athlete_notes")
      .select("id, body, pinned, created_at")
      .eq("swimmer_id", swimmerId)
      .order("pinned", { ascending: false })
      .order("created_at", { ascending: false });
    if (error) {
      setMissing(isMissingTable(error.code));
      setNotes([]);
      return;
    }
    setNotes((data ?? []) as Note[]);
  }, [swimmerId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Daten beim Oeffnen laden
    load();
  }, [load]);

  async function add(event: FormEvent) {
    event.preventDefault();
    if (!text.trim()) return;
    const { error } = await supabase.from("athlete_notes").insert({ swimmer_id: swimmerId, body: text.trim() });
    if (!error) {
      setText("");
      load();
    }
  }

  async function togglePin(note: Note) {
    await supabase.from("athlete_notes").update({ pinned: !note.pinned }).eq("id", note.id);
    load();
  }

  async function remove(note: Note) {
    if (!window.confirm("Notiz löschen?")) return;
    await supabase.from("athlete_notes").delete().eq("id", note.id);
    load();
  }

  if (notes === null || missing) return null;

  const shown = limit && !showAll ? notes.slice(0, limit) : notes;

  return (
    <section className="rounded-[20px] border border-app-border/60 bg-app-surface p-4 shadow-app sm:p-[22px]">
      <h2 className="text-[15px] font-bold text-app-heading">Trainernotizen</h2>
      <p className="text-[13px] text-app-muted">nur für Trainer sichtbar</p>
      <form onSubmit={add} className="mt-3 flex gap-2">
        <input className={inputClass} value={text} onChange={(e) => setText(e.target.value)} placeholder="z. B. Wende Brust verbessern" aria-label="Neue Notiz" />
        <button type="submit" className={buttonPrimary} disabled={!text.trim()}>
          +
        </button>
      </form>
      {shown.length > 0 && (
        <ul className="mt-3 divide-y divide-app-border/60">
          {shown.map((note) => (
            <li key={note.id} className="flex items-start gap-2 py-2">
              <span className="min-w-0 flex-1 text-sm text-app-heading">
                {note.pinned && <span className="mr-1" aria-label="angeheftet">📌</span>}
                {note.body}
                <span className="block text-xs text-app-faint">{new Date(note.created_at).toLocaleDateString("de-DE")}</span>
              </span>
              <button type="button" onClick={() => togglePin(note)} className={`${buttonGhost} text-xs`}>
                {note.pinned ? "Lösen" : "Anheften"}
              </button>
              <button type="button" onClick={() => remove(note)} className={`${buttonGhost} text-xs hover:text-app-bad`} aria-label="Notiz löschen">
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}
      {limit && notes.length > limit && (
        <button type="button" onClick={() => setShowAll((value) => !value)} className={`${buttonGhost} mt-1`}>
          {showAll ? "Weniger" : `Alle ${notes.length} Notizen`}
        </button>
      )}
    </section>
  );
}
