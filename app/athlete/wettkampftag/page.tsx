"use client";

import Loader from "@/components/Loader";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { START_COLUMNS, CompetitionStart } from "@/lib/competitionFeedback";
import { formatDate, formatEventShort, formatTime } from "@/lib/swim";
import { DEFAULT_ROUTINE, PlanItem, nutritionPlan } from "@/lib/raceDay";
import { Card, Notice, buttonPrimary, buttonSecondary, inputClass } from "@/components/ui";

/*
 * "Mein Wettkampf-Tag" fuer Athleten: naechster Wettkampf mit den eigenen
 * Starts (Melde-/Zielzeit), persoenliche Vor-Start-Routine zum Abhaken
 * und ein Ess- und Trinkplan aus den Startzeiten.
 */

type Info = {
  start_id: string;
  competition_id: string;
  competition_name: string;
  competition_location: string;
  section_date: string | null;
  section_start: string | null;
  event_number: number | null;
};

const KIND_ICON: Record<PlanItem["kind"], string> = { essen: "🍝", trinken: "💧", start: "🏊", regeneration: "🔄" };

export default function WettkampfTagPage() {
  const [starts, setStarts] = useState<CompetitionStart[]>([]);
  const [infos, setInfos] = useState<Info[]>([]);
  const [loading, setLoading] = useState(true);
  const [routine, setRoutine] = useState<string[]>(DEFAULT_ROUTINE);
  const [mantra, setMantra] = useState("");
  const [done, setDone] = useState<number[]>([]);
  const [editRoutine, setEditRoutine] = useState(false);
  const [routineText, setRoutineText] = useState("");
  const [routineMissing, setRoutineMissing] = useState(false);
  const [message, setMessage] = useState("");
  const [startTimes, setStartTimes] = useState<Record<string, string>>({});
  const [today] = useState(() => new Date().toISOString().slice(0, 10));

  useEffect(() => {
    async function load() {
      const { data: auth } = await supabase.auth.getUser();
      const [startRes, infoRes, routineRes] = await Promise.all([
        supabase.from("competition_starts").select(START_COLUMNS).gte("start_date", today).order("start_date"),
        supabase.rpc("my_race_day_starts"),
        auth.user ? supabase.from("athlete_routines").select("items, mantra").eq("profile_id", auth.user.id).maybeSingle() : Promise.resolve({ data: null, error: null }),
      ]);
      setStarts((startRes.data ?? []) as CompetitionStart[]);
      setInfos((infoRes.error ? [] : infoRes.data ?? []) as Info[]);
      if (routineRes.error) setRoutineMissing(true);
      const saved = routineRes.data as { items: string[]; mantra: string | null } | null;
      if (saved?.items?.length) setRoutine(saved.items);
      if (saved?.mantra) setMantra(saved.mantra);
      setLoading(false);
    }
    load();
  }, [today]);

  /* Naechster Wettkampf = fruehester Start ab heute */
  const nextCompetitionId = starts[0]?.competition_id ?? null;
  const myStarts = starts.filter((start) => start.competition_id === nextCompetitionId);
  const info = infos.find((item) => item.competition_id === nextCompetitionId) ?? null;
  const infoOf = (id: string) => infos.find((item) => item.start_id === id);

  /* Startzeit je Start: eingegeben, sonst Beginn des Abschnitts */
  const timeOf = (start: CompetitionStart) => startTimes[start.id] ?? infoOf(start.id)?.section_start?.slice(0, 5) ?? "";
  const startDays = [...new Set(myStarts.map((start) => start.start_date))];
  const [day, setDay] = useState<string | null>(null);
  const selectedDay = day ?? startDays[0] ?? null;

  const plan = useMemo(
    () =>
      nutritionPlan(
        myStarts
          .filter((start) => start.start_date === selectedDay)
          .map((start) => ({ time: timeOf(start), label: formatEventShort(start) }))
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- timeOf haengt nur an startTimes/infos
    [myStarts, selectedDay, startTimes, infos]
  );

  async function saveRoutine() {
    const items = routineText.split("\n").map((line) => line.trim()).filter(Boolean);
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return;
    const { error } = await supabase
      .from("athlete_routines")
      .upsert({ profile_id: auth.user.id, items, mantra: mantra.trim() || null, updated_at: new Date().toISOString() });
    if (error) {
      setMessage(`Routine konnte nicht gespeichert werden: ${error.message}`);
      return;
    }
    setRoutine(items);
    setDone([]);
    setEditRoutine(false);
    setMessage("Routine gespeichert ✅");
  }

  return (
    <main className="mx-auto max-w-2xl space-y-4 px-4 py-5">
      <Link href="/athlete" className="text-sm text-app-muted">
        ← Zurück
      </Link>
      <h1 className="text-2xl font-extrabold tracking-tight text-app-heading sm:text-[28px]">🏁 Mein Wettkampf-Tag</h1>
      {message && <Notice tone={message.includes("✅") ? "good" : "bad"}>{message}</Notice>}

      {loading ? (
        <p className="text-sm text-app-muted"><Loader /></p>
      ) : !nextCompetitionId ? (
        <Card padded>
          <p className="text-sm text-app-muted">Für dich ist noch kein kommender Wettkampf mit Starts eingetragen. Deine Routine kannst du trotzdem schon vorbereiten.</p>
        </Card>
      ) : (
        <Card
          title={info?.competition_name ?? "Nächster Wettkampf"}
          description={`${formatDate(myStarts[0].start_date)}${info?.competition_location ? ` · ${info.competition_location}` : ""}`}
        >
          <ul className="divide-y divide-app-border">
            {myStarts.map((start) => (
              <li key={start.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5">
                <div>
                  <p className="font-semibold text-app-heading">
                    {formatEventShort(start)} {start.round && <span className="text-xs text-app-muted">{start.round}</span>}
                  </p>
                  <p className="text-xs text-app-muted">
                    {formatDate(start.start_date)}
                    {infoOf(start.id)?.event_number ? ` · Wk ${infoOf(start.id)!.event_number}` : ""}
                    {start.entry_time_ms ? ` · Meldezeit ${formatTime(start.entry_time_ms)}` : ""}
                    {start.goal_time_ms ? ` · Ziel ${formatTime(start.goal_time_ms)}` : ""}
                  </p>
                </div>
                <label className="flex items-center gap-1 text-xs text-app-muted">
                  ca.
                  <input
                    type="time"
                    value={timeOf(start)}
                    onChange={(e) => setStartTimes((current) => ({ ...current, [start.id]: e.target.value }))}
                    className={`${inputClass} w-28 py-1.5`}
                  />
                </label>
              </li>
            ))}
          </ul>
          <p className="border-t border-app-border px-4 py-2 text-xs text-app-faint">Die Uhrzeit ist der Beginn des Abschnitts – trag deine ungefähre Startzeit ein, dann passt der Plan.</p>
        </Card>
      )}

      <Card
        title="Meine Routine"
        description="Abhaken am Wettkampftag – gibt Sicherheit und Ruhe."
        action={
          !routineMissing && (
            <button
              type="button"
              onClick={() => {
                setRoutineText(routine.join("\n"));
                setEditRoutine(!editRoutine);
              }}
              className="min-h-11 px-2 text-sm font-semibold text-app-accent-soft"
            >
              {editRoutine ? "Abbrechen" : "anpassen"}
            </button>
          )
        }
      >
        {editRoutine ? (
          <div className="space-y-2 p-4">
            <textarea value={routineText} onChange={(e) => setRoutineText(e.target.value)} rows={8} className={inputClass} />
            <input value={mantra} onChange={(e) => setMantra(e.target.value)} placeholder="Mein Satz vor dem Start, z. B. „Schnell raus, stark zurück.“" className={inputClass} />
            <button type="button" onClick={saveRoutine} className={buttonPrimary}>
              Speichern
            </button>
          </div>
        ) : (
          <ul className="divide-y divide-app-border">
            {routine.map((item, index) => (
              <li key={index}>
                <button
                  type="button"
                  onClick={() => setDone((current) => (current.includes(index) ? current.filter((i) => i !== index) : [...current, index]))}
                  className="flex w-full items-center gap-3 px-4 py-3 text-left"
                >
                  <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border-2 ${done.includes(index) ? "border-app-good bg-app-good text-app-signal-ink" : "border-app-border"}`}>
                    {done.includes(index) ? "✓" : ""}
                  </span>
                  <span className={done.includes(index) ? "text-app-muted line-through" : ""}>{item}</span>
                </button>
              </li>
            ))}
            {mantra && <li className="px-4 py-3 text-center text-lg font-bold text-app-accent">„{mantra}“</li>}
          </ul>
        )}
        {routineMissing && <p className="px-4 pb-3 text-xs text-app-faint">Eigene Routine speichern ist möglich, sobald der Trainer das Update eingespielt hat.</p>}
      </Card>

      <Card title="Essen & Trinken" description="Allgemeine Empfehlungen rund um die Starts – bekannte Lebensmittel, nichts Neues am Wettkampftag.">
        {startDays.length > 1 && (
          <div className="flex gap-2 px-4 pt-3">
            {startDays.map((date) => (
              <button key={date} type="button" onClick={() => setDay(date)} className={selectedDay === date ? buttonPrimary : buttonSecondary}>
                {formatDate(date)}
              </button>
            ))}
          </div>
        )}
        {plan.length === 0 ? (
          <p className="p-4 text-sm text-app-muted">Trag oben ungefähre Startzeiten ein, dann entsteht hier dein Plan.</p>
        ) : (
          <ol className="divide-y divide-app-border">
            {plan.map((item, index) => (
              <li key={index} className={`flex gap-3 px-4 py-2.5 ${item.kind === "start" ? "bg-app-accent/8" : ""}`}>
                <span className="w-12 shrink-0 font-mono text-sm font-bold tabular-nums">{item.time}</span>
                <span className="text-lg">{KIND_ICON[item.kind]}</span>
                <span>
                  <b className="text-app-heading">{item.title}</b>
                  {item.detail && <span className="block text-sm text-app-muted">{item.detail}</span>}
                </span>
              </li>
            ))}
          </ol>
        )}
      </Card>
    </main>
  );
}
