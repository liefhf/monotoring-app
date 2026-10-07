"use client";

import { toDateKey } from "@/lib/community";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { readinessScore, sessionLoad, wellnessScore } from "@/lib/monitoring";
import { scaleTrend } from "@/lib/wellnessTrend";
import LoadStrainPanel from "@/components/LoadStrainPanel";
import GrowthPanel from "@/components/GrowthPanel";
import { EmptyState } from "@/components/ui";

/*
 * Befinden & Training im Athletenprofil (frueher eigene Seite
 * /coach/athletes/[id]). Braucht einen verknuepften Login, weil Check-in
 * und Trainings-Rueckmeldungen vom Athleten selbst kommen.
 *
 * Bewusst knapp: Verlauf der letzten 4 Wochen, welche Skala sich
 * gegenueber den 2 Wochen davor veraendert hat, und die letzten
 * Trainings-Rueckmeldungen mit Session-RPE.
 */

type Entry = {
  id: string;
  entry_date: string;
  sleep_quality: number;
  energy: number;
  muscle_feeling: number;
  stress: number;
  mood: number;
  sleep_hours: number | null;
  has_pain: boolean | null;
  pain_area: string | null;
  comment: string | null;
};

type Feedback = {
  id: string;
  training_session_id: string;
  rpe: number | null;
  comment: string | null;
  completed: boolean | null;
};

type Session = { id: string; title: string; session_date: string; duration_minutes: number | null; training_type: string | null };

const DAY = 86_400_000;
const isoDay = (ms: number) => new Date(ms).toISOString().slice(0, 10);
const fmt = (date: string) => new Date(`${date}T12:00:00`).toLocaleDateString("de-DE", { weekday: "short", day: "2-digit", month: "2-digit" });

const LEVEL_TONE = { bereit: "bg-app-good", vorsicht: "bg-app-warn", regeneration: "bg-app-bad" } as const;

export default function AthleteWellnessPanel({ profileId }: { profileId: string | null }) {
  const [today] = useState(() => toDateKey(new Date()));
  const [entries, setEntries] = useState<Entry[] | null>(null);
  const [feedback, setFeedback] = useState<(Feedback & { session: Session | null })[]>([]);

  useEffect(() => {
    if (!profileId) return;
    const since = isoDay(Date.parse(today) - 28 * DAY);
    Promise.all([
      supabase
        .from("befinden_entries")
        .select("id, entry_date, sleep_quality, energy, muscle_feeling, stress, mood, sleep_hours, has_pain, pain_area, comment")
        .eq("athlete_id", profileId)
        .gte("entry_date", since)
        .order("entry_date", { ascending: false }),
      supabase
        .from("training_feedback")
        .select("id, training_session_id, rpe, comment, completed")
        .eq("athlete_id", profileId)
        .order("created_at", { ascending: false })
        .limit(10),
    ]).then(async ([entryRes, feedbackRes]) => {
      setEntries((entryRes.data ?? []) as Entry[]);
      const list = (feedbackRes.data ?? []) as Feedback[];
      const ids = list.map((item) => item.training_session_id);
      const { data: sessions } = ids.length
        ? await supabase.from("training_sessions").select("id, title, session_date, duration_minutes, training_type").in("id", ids)
        : { data: [] };
      const byId = new Map(((sessions ?? []) as Session[]).map((session) => [session.id, session]));
      setFeedback(list.map((item) => ({ ...item, session: byId.get(item.training_session_id) ?? null })));
    });
  }, [profileId, today]);

  const scored = useMemo(
    () =>
      (entries ?? []).map((entry, index, all) => {
        const earlier = all.slice(index + 1);
        const baseline = earlier.length >= 3 ? earlier.reduce((sum, item) => sum + wellnessScore(item), 0) / earlier.length : null;
        return { entry, readiness: readinessScore(entry, baseline) };
      }),
    [entries]
  );
  const trend = useMemo(() => scaleTrend(entries ?? [], today), [entries, today]);

  if (!profileId) {
    return (
      <EmptyState icon="heart" title="Kein Login verknüpft">
        Befinden und Trainings-Rückmeldungen kommen vom Athleten selbst. Verknüpfe unter „Stammdaten“ einen Login, damit sie hier erscheinen.
      </EmptyState>
    );
  }

  if (entries === null) {
    return <div className="mt-6 h-48 animate-pulse rounded-[20px] bg-app-elevated" aria-label="Wird geladen" />;
  }

  const last28 = Array.from({ length: 28 }, (_, index) => isoDay(Date.parse(today) - (27 - index) * DAY));
  const byDate = new Map(scored.map((item) => [item.entry.entry_date, item]));
  const checkInRate = Math.round((scored.length / 28) * 100);

  return (
    <div className="mt-6 space-y-4 sm:space-y-5">
      <section className="rounded-[20px] border border-app-border/60 bg-app-surface p-4 shadow-app sm:p-[22px]">
        <div className="flex flex-wrap items-baseline gap-x-3">
          <h2 className="flex-1 text-[15px] font-bold text-app-heading">Befinden · letzte 4 Wochen</h2>
          <span className="text-[13px] text-app-muted">
            <span className="num">{scored.length}</span> Check-ins ({checkInRate} % der Tage)
          </span>
        </div>

        {/* Ein Kaestchen je Tag: Farbe = Einstufung, leer = kein Check-in */}
        <div className="mt-3 grid grid-cols-14 gap-1" role="img" aria-label="Befinden je Tag der letzten 28 Tage">
          {last28.map((date) => {
            const item = byDate.get(date);
            return (
              <span
                key={date}
                title={item ? `${fmt(date)}: ${item.readiness.score}/100` : `${fmt(date)}: kein Check-in`}
                className={`h-6 rounded-md ${item ? LEVEL_TONE[item.readiness.level] : "border border-dashed border-app-border"}`}
                style={item ? { opacity: 0.35 + (item.readiness.score / 100) * 0.65 } : undefined}
              />
            );
          })}
        </div>
        <p className="mt-2 flex flex-wrap gap-x-4 text-xs text-app-muted">
          <span><span className="mr-1 inline-block h-2 w-2 rounded-full bg-app-good" />gut</span>
          <span><span className="mr-1 inline-block h-2 w-2 rounded-full bg-app-warn" />eingeschränkt</span>
          <span><span className="mr-1 inline-block h-2 w-2 rounded-full bg-app-bad" />deutlich reduziert</span>
        </p>

        {trend.length > 0 && (
          <div className="mt-4">
            <p className="label-caps mb-2">Veränderung ggü. den 2 Wochen davor</p>
            <ul className="flex flex-wrap gap-2">
              {trend.map((item) => (
                <li
                  key={item.key}
                  className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                    item.change <= -1.5 ? "bg-app-bad/15 text-app-bad" : item.change <= -0.8 ? "bg-app-warn/15 text-app-warn" : item.change >= 0.8 ? "bg-app-good/15 text-app-good" : "bg-app-elevated text-app-muted"
                  }`}
                >
                  {item.label} {item.change > 0 ? "+" : item.change < 0 ? "−" : "±"}
                  {Math.abs(item.change).toLocaleString("de-DE", { maximumFractionDigits: 1 })}
                </li>
              ))}
            </ul>
          </div>
        )}

        {scored.length === 0 ? (
          <p className="mt-4 text-sm text-app-muted">In den letzten 4 Wochen kein Check-in.</p>
        ) : (
          <ul className="mt-4 divide-y divide-app-border/60">
            {scored.slice(0, 7).map(({ entry, readiness }) => (
              <li key={entry.id} className="flex flex-wrap items-baseline gap-x-3 gap-y-1 py-2.5">
                <span className="w-20 shrink-0 text-[13px] text-app-muted">{fmt(entry.entry_date)}</span>
                <span className="num w-14 font-semibold text-app-heading">{readiness.score}</span>
                <span className="min-w-0 flex-1 text-[13px] text-app-text">
                  {[
                    entry.sleep_hours != null ? `${String(entry.sleep_hours).replace(".", ",")} h Schlaf` : null,
                    entry.has_pain ? `Schmerz${entry.pain_area ? `: ${entry.pain_area}` : ""}` : null,
                    readiness.hints.filter((hint) => !hint.startsWith("wenig Schlaf") && hint !== "Schmerzen gemeldet").join(" · ") || null,
                  ]
                    .filter(Boolean)
                    .join(" · ") || "unauffällig"}
                  {entry.comment && <span className="block text-app-muted">„{entry.comment}“</span>}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-[20px] border border-app-border/60 bg-app-surface p-4 shadow-app sm:p-[22px]">
        <h2 className="text-[15px] font-bold text-app-heading">Trainings-Rückmeldungen</h2>
        <p className="text-[13px] text-app-muted">Session-RPE = Anstrengung (1–10) × Dauer in Minuten</p>
        {feedback.length === 0 ? (
          <p className="mt-4 text-sm text-app-muted">Noch keine Rückmeldungen.</p>
        ) : (
          <ul className="mt-3 divide-y divide-app-border/60">
            {feedback.map((item) => (
              <li key={item.id} className="flex flex-wrap items-baseline gap-x-3 gap-y-1 py-2.5">
                <span className="w-20 shrink-0 text-[13px] text-app-muted">{item.session ? fmt(item.session.session_date) : "–"}</span>
                <span className="min-w-0 flex-1">
                  {item.session ? (
                    <Link href={`/coach/training/session/${item.session.id}`} className="font-semibold text-app-heading hover:text-app-accent-soft">
                      {item.session.title}
                    </Link>
                  ) : (
                    <span className="text-app-muted">Einheit gelöscht</span>
                  )}
                  {item.completed === false && <span className="ml-2 text-xs font-bold text-app-warn">abgebrochen</span>}
                  {item.comment && <span className="block text-[13px] text-app-muted">„{item.comment}“</span>}
                </span>
                <span className="num text-[13px] text-app-muted">
                  RPE <span className="font-semibold text-app-heading">{item.rpe ?? "–"}</span>
                  {item.rpe && item.session?.duration_minutes ? ` · ${sessionLoad(item.rpe, item.session.duration_minutes)} AU` : ""}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <LoadStrainPanel athleteId={profileId} />
      <GrowthPanel athleteId={profileId} />
    </div>
  );
}
