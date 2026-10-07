"use client";

import { FormEvent, useState } from "react";
import { supabase } from "@/lib/supabase";
import { LoadResult, checkWrite, toLoadResult, useBusy, useKeyedLoad, writeErrorText } from "@/lib/loadState";
import { buttonGhost, buttonPrimary, inputClass } from "@/components/ui";

/*
 * Interne Trainernotizen je Athlet ("Wende Brust verbessern").
 * Bewusst einfach: Text + anheften. Keine Aufgabenverwaltung.
 * Nur fuer Trainer sichtbar (RLS, Skript 24).
 */

type Note = { id: string; body: string; pinned: boolean; created_at: string };

async function fetchNotes(swimmerId: string): Promise<LoadResult<Note[]>> {
  const res = await supabase
    .from("athlete_notes")
    .select("id, body, pinned, created_at")
    .eq("swimmer_id", swimmerId)
    .order("pinned", { ascending: false })
    .order("created_at", { ascending: false });
  return toLoadResult(res as { data: Note[] | null; error: { code?: string } | null }, []);
}

export default function NotesPanel({ swimmerId, limit }: { swimmerId: string; limit?: number }) {
  const { state, reload } = useKeyedLoad(swimmerId, fetchNotes);
  const [text, setText] = useState("");
  const [showAll, setShowAll] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { busy, run } = useBusy();

  async function add(event: FormEvent) {
    event.preventDefault();
    if (!text.trim()) return;
    await run(async () => {
      const res = await supabase.from("athlete_notes").insert({ swimmer_id: swimmerId, body: text.trim() }).select("id");
      const check = checkWrite(res);
      if (!check.ok) {
        setError(writeErrorText(check, "Notiz"));
        return;
      }
      setError(null);
      setText("");
      await reload();
    });
  }

  async function togglePin(note: Note) {
    await run(async () => {
      const check = checkWrite(await supabase.from("athlete_notes").update({ pinned: !note.pinned }).eq("id", note.id).select("id"));
      setError(check.ok ? null : writeErrorText(check, "Notiz"));
      await reload();
    });
  }

  async function remove(note: Note) {
    if (!window.confirm("Notiz löschen?")) return;
    await run(async () => {
      const check = checkWrite(await supabase.from("athlete_notes").delete().eq("id", note.id).select("id"));
      setError(check.ok ? null : writeErrorText(check, "Löschen"));
      await reload();
    });
  }

  if (state.status === "loading" || state.status === "missing") return null;
  if (state.status === "error")
    return (
      <p className="text-sm text-app-bad">
        Trainernotizen konnten nicht geladen werden.{" "}
        <button type="button" className="underline" onClick={() => void reload()}>
          Erneut laden
        </button>
      </p>
    );
  const notes = state.data;

  const shown = limit && !showAll ? notes.slice(0, limit) : notes;

  return (
    <section className="rounded-[20px] border border-app-border/60 bg-app-surface p-4 shadow-app sm:p-[22px]">
      <h2 className="text-[15px] font-bold text-app-heading">Trainernotizen</h2>
      <p className="text-[13px] text-app-muted">nur für Trainer sichtbar</p>
      <form onSubmit={add} className="mt-3 flex gap-2">
        <input className={inputClass} value={text} onChange={(e) => setText(e.target.value)} placeholder="z. B. Wende Brust verbessern" aria-label="Neue Notiz" />
        <button type="submit" className={buttonPrimary} disabled={busy || !text.trim()} aria-label="Notiz speichern">
          +
        </button>
      </form>
      {error && <p className="mt-2 text-sm text-app-bad" role="alert">{error}</p>}
      {shown.length > 0 && (
        <ul className="mt-3 divide-y divide-app-border/60">
          {shown.map((note) => (
            <li key={note.id} className="flex items-start gap-2 py-2">
              <span className="min-w-0 flex-1 text-sm text-app-heading">
                {note.pinned && <span className="mr-1" aria-label="angeheftet">📌</span>}
                {note.body}
                <span className="block text-xs text-app-faint">{new Date(note.created_at).toLocaleDateString("de-DE")}</span>
              </span>
              <button type="button" disabled={busy} onClick={() => togglePin(note)} className={`${buttonGhost} min-h-11 text-xs`}>
                {note.pinned ? "Lösen" : "Anheften"}
              </button>
              <button type="button" disabled={busy} onClick={() => remove(note)} className={`${buttonGhost} min-h-11 min-w-11 text-xs hover:text-app-bad`} aria-label="Notiz löschen">
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
