"use client";

import { FormEvent, useState } from "react";
import { supabase } from "@/lib/supabase";
import { LoadResult, checkWrite, classifyError, useBusy, useKeyedLoad, writeErrorText } from "@/lib/loadState";
import { fetchAll } from "@/lib/fetchAll";
import { toDateKey } from "@/lib/community";
import { GOAL_KIND_LABELS, Goal, GoalKind, goalLabel, goalProgress, sortGoals } from "@/lib/goals";
import { RESULT_COLUMNS, STROKES, Stroke, SwimmerResult, formatTime, formatTimeDifference, parseSwimTimeToMs } from "@/lib/swim";
import { FormField, Modal, Notice, buttonGhost, buttonPrimary, inputClass } from "@/components/ui";

/*
 * Ziele je Athlet (Zeit-, Technik-, Trainingsziel). Zeitziele werden
 * automatisch mit der Bestzeit verglichen. compact = Kurzfassung fuer
 * den Ueberblick (nur offene Ziele, ohne Bearbeiten).
 */
type GoalData = { goals: Goal[]; results: SwimmerResult[]; resultsFailed: boolean };

async function fetchGoals(swimmerId: string): Promise<LoadResult<GoalData>> {
  const [goalRes, resultRes] = await Promise.all([
    supabase.from("athlete_goals").select("*").eq("swimmer_id", swimmerId).order("created_at", { ascending: false }),
    fetchAll(() => supabase.from("swimmer_results").select(RESULT_COLUMNS).eq("swimmer_id", swimmerId).eq("kind", "einzel").order("id")),
  ]);
  const kind = classifyError(goalRes.error);
  if (kind) return { status: kind };
  return {
    status: "ready",
    data: {
      goals: (goalRes.data ?? []) as Goal[],
      // Ergebnisse unvollstaendig -> lieber keinen Fortschritt zeigen als einen falschen
      results: resultRes.error ? [] : ((resultRes.data ?? []) as SwimmerResult[]),
      resultsFailed: Boolean(resultRes.error),
    },
  };
}

export default function GoalsPanel({ swimmerId, compact = false }: { swimmerId: string; compact?: boolean }) {
  const { state, reload } = useKeyedLoad(swimmerId, fetchGoals);
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<GoalKind>("zeit");
  const [distance, setDistance] = useState("100");
  const [stroke, setStroke] = useState<Stroke>("freestyle");
  const [pool, setPool] = useState<"25" | "50" | "">("25");
  const [target, setTarget] = useState("");
  const [title, setTitle] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<{ tone: "good" | "bad"; text: string } | null>(null);
  const { busy, run } = useBusy();

  async function handleSave(event: FormEvent) {
    event.preventDefault();
    setError(null);
    const targetMs = kind === "zeit" ? parseSwimTimeToMs(target) : null;
    if (kind === "zeit" && !targetMs) {
      setError("Zielzeit bitte als 1:09,50 oder 33,10 eingeben.");
      return;
    }
    if (kind !== "zeit" && !title.trim()) {
      setError("Bitte das Ziel kurz beschreiben.");
      return;
    }
    await run(async () => {
      const res = await supabase
        .from("athlete_goals")
        .insert({
          swimmer_id: swimmerId,
          kind,
          title: kind === "zeit" ? null : title.trim(),
          distance: kind === "zeit" ? Number(distance) : null,
          stroke: kind === "zeit" ? stroke : null,
          pool_length: kind === "zeit" && pool ? Number(pool) : null,
          target_ms: targetMs,
          due_date: dueDate || null,
        })
        .select("id");
      const check = checkWrite(res);
      if (!check.ok) {
        setError(writeErrorText(check, "Ziel"));
        return;
      }
      setOpen(false);
      setTarget("");
      setTitle("");
      setMessage({ tone: "good", text: "Ziel gespeichert." });
      await reload();
    });
  }

  async function markAchieved(goal: Goal) {
    await run(async () => {
      const res = await supabase.from("athlete_goals").update({ achieved_at: toDateKey(new Date()) }).eq("id", goal.id).select("id");
      const check = checkWrite(res);
      setMessage(check.ok ? { tone: "good", text: "Als erreicht markiert." } : { tone: "bad", text: writeErrorText(check, "Ziel") });
      await reload();
    });
  }

  async function remove(goal: Goal) {
    if (!window.confirm(`Ziel „${goalLabel(goal)}“ löschen?`)) return;
    await run(async () => {
      const res = await supabase.from("athlete_goals").delete().eq("id", goal.id).select("id");
      const check = checkWrite(res);
      setMessage(check.ok ? { tone: "good", text: "Ziel gelöscht." } : { tone: "bad", text: writeErrorText(check, "Löschen") });
      await reload();
    });
  }

  if (state.status === "loading") return <div className="h-24 animate-pulse rounded-[20px] bg-app-elevated" aria-label="Wird geladen" />;

  if (state.status === "missing") {
    return compact ? null : (
      <Notice tone="warn">
        Ziele sind noch nicht eingerichtet. Bitte <b>supabase/ziele_notizen.sql</b> ausführen (Skript 24).
      </Notice>
    );
  }

  if (state.status === "error") {
    return (
      <div className="space-y-2">
        <Notice tone="bad">Ziele konnten nicht geladen werden.</Notice>
        <button type="button" className={buttonGhost} onClick={() => void reload()}>
          Erneut laden
        </button>
      </div>
    );
  }

  const { goals, results, resultsFailed } = state.data;
  const sorted = sortGoals(goals, results);
  const shown = compact ? sorted.filter((goal) => !goalProgress(goal, results).reached).slice(0, 3) : sorted;

  return (
    <section className="rounded-[20px] border border-app-border/60 bg-app-surface p-4 shadow-app sm:p-[22px]">
      <div className="flex items-center gap-3">
        <h2 className="flex-1 text-[15px] font-bold text-app-heading">Ziele</h2>
        <button type="button" onClick={() => setOpen(true)} className={compact ? buttonGhost : buttonPrimary}>
          + Ziel
        </button>
      </div>
      {resultsFailed && (
        <div className="mt-2">
          <Notice tone="warn">Bestzeiten konnten nicht geladen werden – der Abstand zum Ziel ist gerade unbekannt.</Notice>
        </div>
      )}
      {message && (
        <div className="mt-2">
          <Notice tone={message.tone}>{message.text}</Notice>
        </div>
      )}
      {shown.length === 0 ? (
        <p className="mt-2 text-sm text-app-muted">{goals.length && !resultsFailed ? "Alle Ziele erreicht 🎉" : "Noch keine Ziele. Ein klares Ziel macht Fortschritt sichtbar – auch für den Athleten."}</p>
      ) : (
        <ul className="mt-2 divide-y divide-app-border/60">
          {shown.map((goal) => {
            const progress = goalProgress(goal, results);
            return (
              <li key={goal.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2.5">
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold text-app-heading">{goalLabel(goal)}</span>
                  <span className="block text-[13px] text-app-muted">
                    {goal.kind === "zeit" && goal.target_ms
                      ? `Ziel ${formatTime(goal.target_ms)}${progress.best ? ` · aktuell ${formatTime(progress.best.time_ms)}` : " · noch keine Zeit"}`
                      : GOAL_KIND_LABELS[goal.kind]}
                    {goal.due_date ? ` · bis ${new Date(`${goal.due_date}T12:00:00`).toLocaleDateString("de-DE")}` : ""}
                  </span>
                </span>
                {progress.reached ? (
                  <span className="rounded-full bg-app-good/15 px-2.5 py-1 text-xs font-extrabold text-app-good">erreicht</span>
                ) : progress.remainingMs !== null ? (
                  <span className="num rounded-full bg-app-elevated px-2.5 py-1 text-xs font-bold text-app-heading">noch {formatTimeDifference(progress.remainingMs).replace("+", "")}</span>
                ) : null}
                {!compact && !progress.reached && goal.kind !== "zeit" && (
                  <button type="button" disabled={busy} onClick={() => markAchieved(goal)} className={buttonGhost}>
                    Erreicht
                  </button>
                )}
                {!compact && (
                  <button type="button" disabled={busy} onClick={() => remove(goal)} className={`${buttonGhost} hover:text-app-bad`}>
                    Löschen
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <Modal open={open} title="Ziel festlegen" onClose={() => setOpen(false)}>
        <form onSubmit={handleSave} className="grid gap-3 sm:grid-cols-2">
          <FormField label="Art" className="sm:col-span-2">
            <select className={inputClass} value={kind} onChange={(e) => setKind(e.target.value as GoalKind)}>
              {(Object.keys(GOAL_KIND_LABELS) as GoalKind[]).map((value) => (
                <option key={value} value={value}>
                  {GOAL_KIND_LABELS[value]}
                </option>
              ))}
            </select>
          </FormField>
          {kind === "zeit" ? (
            <>
              <FormField label="Strecke">
                <select className={inputClass} value={distance} onChange={(e) => setDistance(e.target.value)}>
                  {[50, 100, 200, 400, 800, 1500].map((value) => (
                    <option key={value} value={value}>
                      {value} m
                    </option>
                  ))}
                </select>
              </FormField>
              <FormField label="Lage">
                <select className={inputClass} value={stroke} onChange={(e) => setStroke(e.target.value as Stroke)}>
                  {STROKES.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </FormField>
              <FormField label="Bahn">
                <select className={inputClass} value={pool} onChange={(e) => setPool(e.target.value as "25" | "50" | "")}>
                  <option value="25">25 m</option>
                  <option value="50">50 m</option>
                  <option value="">beide</option>
                </select>
              </FormField>
              <FormField label="Zielzeit" hint="z. B. 1:09,50">
                <input className={inputClass} inputMode="decimal" value={target} onChange={(e) => setTarget(e.target.value)} />
              </FormField>
            </>
          ) : (
            <FormField label="Ziel" className="sm:col-span-2">
              <input
                className={inputClass}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={kind === "technik" ? "z. B. 15 m Unterwasser stabil" : "z. B. 3 Einheiten pro Woche"}
              />
            </FormField>
          )}
          <FormField label="Bis (optional)" className="sm:col-span-2">
            <input type="date" className={inputClass} value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          </FormField>
          {error && (
            <div className="sm:col-span-2">
              <Notice tone="bad">{error}</Notice>
            </div>
          )}
          <button type="submit" disabled={busy} className={`${buttonPrimary} sm:col-span-2`}>
            {busy ? "Speichern …" : "Speichern"}
          </button>
        </form>
      </Modal>
    </section>
  );
}
