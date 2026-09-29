"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

/*
 * To-do-Liste auf dem Dashboard. Nutzt die vorhandenen Aufgaben/Fristen
 * (calendar_tasks) - dieselben wie in Kalender und Jahresplanung.
 * Abhaken = erledigt (gespeichert) und verschwindet aus der Liste.
 */

type Task = { id: string; title: string; description: string | null; due_date: string | null; completed: boolean; team_id: string | null };

const iso = (ms: number) => new Date(ms).toISOString().slice(0, 10);

export default function TodoCard({ teamId }: { teamId: string | null }) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState("");
  const [due, setDue] = useState("");
  const [error, setError] = useState("");
  const [today] = useState(() => iso(Date.now()));

  const load = useCallback(async () => {
    const { data } = await supabase
      .from("calendar_tasks")
      .select("id, title, description, due_date, completed, team_id")
      .eq("completed", false)
      .order("due_date", { ascending: true })
      .limit(20);
    setTasks(((data ?? []) as Task[]).filter((task) => !task.team_id || !teamId || task.team_id === teamId));
  }, [teamId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Daten beim Oeffnen laden
    load();
  }, [load]);

  async function add(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!title.trim()) return;
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return;
    const { error: insertError } = await supabase.from("calendar_tasks").insert({
      coach_id: auth.user.id,
      team_id: teamId,
      title: title.trim(),
      due_date: due || today,
      completed: false,
    });
    if (insertError) {
      setError(`Konnte nicht gespeichert werden: ${insertError.message}`);
      return;
    }
    setError("");
    setTitle("");
    setDue("");
    setAdding(false);
    await load();
  }

  /* Abhaken: kurz als erledigt zeigen, dann aus der Liste nehmen */
  async function complete(task: Task) {
    setTasks((current) => current.map((item) => (item.id === task.id ? { ...item, completed: true } : item)));
    const { error: updateError } = await supabase.from("calendar_tasks").update({ completed: true }).eq("id", task.id);
    if (updateError) {
      setError(`Konnte nicht gespeichert werden: ${updateError.message}`);
      await load();
      return;
    }
    setTimeout(() => setTasks((current) => current.filter((item) => item.id !== task.id)), 400);
  }

  const dueText = (date: string | null) => {
    if (!date) return null;
    const days = Math.round((Date.parse(date) - Date.parse(today)) / 86_400_000);
    if (days < 0) return { text: `überfällig seit ${-days} ${days === -1 ? "Tag" : "Tagen"}`, tone: "text-app-bad" };
    if (days === 0) return { text: "heute fällig", tone: "text-app-warn" };
    if (days === 1) return { text: "morgen fällig", tone: "text-app-muted" };
    return { text: `fällig am ${new Date(`${date}T12:00:00`).toLocaleDateString("de-DE", { weekday: "short", day: "2-digit", month: "2-digit" })}`, tone: "text-app-muted" };
  };

  const open = tasks.filter((task) => !task.completed).length;

  return (
    <section className="flex h-full flex-col rounded-3xl border border-app-border bg-app-surface p-5 shadow-app">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-lg font-bold text-app-heading">To-do</p>
          <p className="text-sm text-app-muted">{open === 0 ? "Alles erledigt." : `${open} offen`}</p>
        </div>
        <button
          type="button"
          onClick={() => setAdding(!adding)}
          aria-label={adding ? "Abbrechen" : "Aufgabe hinzufügen"}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-app-heading text-xl font-semibold leading-none text-app-surface transition hover:opacity-90"
        >
          {adding ? "×" : "+"}
        </button>
      </div>

      <ul className="mt-4 flex-1 space-y-2.5">
        {tasks.slice(0, 6).map((task) => {
          const due = dueText(task.due_date);
          return (
            <li key={task.id} className={`transition-opacity duration-300 ${task.completed ? "opacity-0" : "opacity-100"}`}>
              <button
                type="button"
                onClick={() => complete(task)}
                className="flex w-full items-start gap-3 rounded-xl border border-app-border px-3.5 py-3 text-left transition hover:border-app-accent"
              >
                <span
                  className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 text-xs font-bold transition ${
                    task.completed ? "border-app-heading bg-app-heading text-app-surface" : "border-app-muted"
                  }`}
                >
                  {task.completed ? "✓" : ""}
                </span>
                <span className="min-w-0">
                  <span className={`block text-sm font-semibold ${task.completed ? "text-app-muted line-through" : "text-app-heading"}`}>{task.title}</span>
                  {(task.description || due) && (
                    <span className={`block text-xs ${task.completed ? "text-app-faint" : due?.tone ?? "text-app-muted"}`}>
                      {task.description ?? due?.text}
                    </span>
                  )}
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      {adding && (
        <form onSubmit={add} className="mt-4 space-y-2">
          <input
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Was ist zu tun?"
            className="w-full rounded-xl border border-app-border bg-app-bg px-3 py-2 text-sm outline-none focus:border-app-accent"
          />
          <div className="flex gap-2">
            <input type="date" value={due} onChange={(e) => setDue(e.target.value)} className="min-w-0 flex-1 rounded-xl border border-app-border bg-app-bg px-3 py-2 text-sm" />
            <button type="submit" className="rounded-full bg-app-heading px-4 text-sm font-semibold text-app-surface">
              Speichern
            </button>
          </div>
        </form>
      )}
      {error && <p className="mt-2 text-xs text-app-bad">{error}</p>}
    </section>
  );
}
