"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

/*
 * To-do-Liste auf dem Dashboard. Nutzt die vorhandenen Aufgaben/Fristen
 * (calendar_tasks) - dieselben wie in Kalender und Jahresplanung.
 * Abhaken = erledigt (bleibt gespeichert, verschwindet aus der Liste).
 */

type Task = { id: string; title: string; due_date: string | null; completed: boolean; team_id: string | null };

const iso = (ms: number) => new Date(ms).toISOString().slice(0, 10);

export default function TodoCard({ teamId }: { teamId: string | null }) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [title, setTitle] = useState("");
  const [due, setDue] = useState("");
  const [error, setError] = useState("");
  const [today] = useState(() => iso(Date.now()));

  const load = useCallback(async () => {
    const { data } = await supabase
      .from("calendar_tasks")
      .select("id, title, due_date, completed, team_id")
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
    await load();
  }

  async function complete(task: Task) {
    setTasks((current) => current.filter((item) => item.id !== task.id));
    const { error: updateError } = await supabase.from("calendar_tasks").update({ completed: true }).eq("id", task.id);
    if (updateError) {
      setError(`Konnte nicht abgehakt werden: ${updateError.message}`);
      await load();
    }
  }

  const dueLabel = (date: string | null) => {
    if (!date) return "";
    const days = Math.round((Date.parse(date) - Date.parse(today)) / 86_400_000);
    if (days < 0) return "überfällig";
    if (days === 0) return "heute";
    if (days === 1) return "morgen";
    return new Date(`${date}T12:00:00`).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" });
  };

  return (
    <section className="flex h-full flex-col rounded-3xl border border-app-border bg-app-surface p-5 shadow-app">
      <p className="text-sm text-app-muted">To-do</p>
      <ul className="mt-3 flex-1 space-y-1.5">
        {tasks.length === 0 && <li className="text-sm text-app-faint">Alles erledigt.</li>}
        {tasks.slice(0, 6).map((task) => {
          const label = dueLabel(task.due_date);
          return (
            <li key={task.id} className="flex items-center gap-3 rounded-2xl bg-app-bg px-3 py-2">
              <button
                type="button"
                onClick={() => complete(task)}
                aria-label={`${task.title} erledigt`}
                className="h-5 w-5 shrink-0 rounded-md border-2 border-app-border transition hover:border-app-good hover:bg-app-good/20"
              />
              <span className="min-w-0 flex-1 truncate text-sm text-app-heading">{task.title}</span>
              {label && (
                <span className={`shrink-0 text-xs font-semibold ${label === "überfällig" ? "text-app-bad" : label === "heute" ? "text-app-warn" : "text-app-muted"}`}>
                  {label}
                </span>
              )}
            </li>
          );
        })}
      </ul>
      <form onSubmit={add} className="mt-3 flex gap-2">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Neue Aufgabe …"
          className="min-w-0 flex-1 rounded-xl border border-app-border bg-app-bg px-3 py-2 text-sm outline-none focus:border-app-accent"
        />
        <input type="date" value={due} onChange={(e) => setDue(e.target.value)} className="w-[8.5rem] rounded-xl border border-app-border bg-app-bg px-2 py-2 text-sm" />
        <button type="submit" className="rounded-xl bg-app-accent px-3 text-sm font-bold text-app-accent-ink">
          +
        </button>
      </form>
      {error && <p className="mt-2 text-xs text-app-bad">{error}</p>}
    </section>
  );
}
