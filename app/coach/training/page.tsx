"use client";

import Loader from "@/components/Loader";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { teamNotice, useSelectedTeam } from "@/lib/useSelectedTeam";
import { fetchAll } from "@/lib/fetchAll";
import { toDateKey } from "@/lib/community";
import { isoWeek, weekStart } from "@/lib/dashboardStats";
import { PageHeader, buttonPrimary, buttonSecondary } from "@/components/ui";
import TeamSwitcher from "@/components/TeamSwitcher";
import { copyTraining, isValidDateKey } from "@/lib/trainingPlan";
import { checkWrite, writeErrorText } from "@/lib/loadState";

/*
 * Training: EINE Seite fuer die Trainingswoche einer Mannschaft (frueher
 * getrennt als "Training" und "Wochenplan"). Mo-So mit Umfang, Dauer,
 * Fokus und geplanter Belastung, Summen, Wasser/Land und die Verteilung
 * der Meter auf die Belastungszonen. Von hier: Einheit planen, oeffnen,
 * kopieren; Saisonplanung ueber den Knopf oben. Woche per ?week=YYYY-MM-DD.
 */

type Session = {
  id: string;
  title: string;
  session_date: string;
  start_time: string | null;
  duration_minutes: number | null;
  total_meters: number | null;
  focus: string | null;
  planned_rpe?: number | null;
  training_type: string | null;
};
type ZoneRow = { zone: string | null; repetitions: number; distance: number; section_id: string };

const DAY = 86_400_000;
const DAYS = ["Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag", "Sonntag"];

function WochenplanView() {
  const params = useSearchParams();
  const [today] = useState(() => toDateKey(new Date()));
  const [week, setWeek] = useState(() => weekStart(params.get("week") ?? toDateKey(new Date())));
  const { teams, teamId, chooseTeam, status: teamStatus } = useSelectedTeam();
  const teamHint = teamNotice(teamStatus, teamId);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [zoneRows, setZoneRows] = useState<ZoneRow[]>([]);
  const [reloadKey, setReloadKey] = useState(0);


  useEffect(() => {
    if (!teamId) return;
    async function load() {
      const { data } = await fetchAll(() =>
        supabase
          .from("training_sessions")
          .select("*")
          .eq("team_id", teamId!)
          .gte("session_date", week)
          .lte("session_date", toDateKey(new Date(Date.parse(week) + 6 * DAY + 12 * 3600_000)))
          .order("session_date")
          .order("start_time")
      );
      const list = (data ?? []) as Session[];
      setSessions(list);
      if (!list.length) {
        setZoneRows([]);
        return;
      }
      const { data: sections } = await supabase.from("training_sections").select("id").in("training_session_id", list.map((s) => s.id));
      const sectionIds = ((sections ?? []) as { id: string }[]).map((section) => section.id);
      if (!sectionIds.length) {
        setZoneRows([]);
        return;
      }
      const { data: rows } = await fetchAll(() => supabase.from("training_rows").select("zone, repetitions, distance, section_id").in("section_id", sectionIds));
      setZoneRows((rows ?? []) as ZoneRow[]);
    }
    load();
  }, [teamId, week, reloadKey]);

  const days = DAYS.map((name, index) => {
    const date = toDateKey(new Date(Date.parse(`${week}T12:00:00`) + index * DAY));
    return { name, date, list: sessions.filter((session) => session.session_date === date) };
  });

  const minutes = sessions.reduce((sum, session) => sum + (session.duration_minutes ?? 0), 0);

  const zones = useMemo(() => {
    const map = new Map<string, number>();
    for (const row of zoneRows) {
      const key = row.zone ?? "ohne Zone";
      map.set(key, (map.get(key) ?? 0) + row.repetitions * row.distance);
    }
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0], "de", { numeric: true }));
  }, [zoneRows]);
  const zoneTotal = zones.reduce((sum, [, value]) => sum + value, 0);

  const waterMeters = sessions.filter((session) => session.training_type !== "land").reduce((sum, session) => sum + (session.total_meters ?? 0), 0);
  const landCount = sessions.filter((session) => session.training_type === "land").length;

  const [copying, setCopying] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  /* Einheit kopieren: Standard ist derselbe Wochentag eine Woche spaeter */
  async function copySession(session: Session) {
    const suggestion = toDateKey(new Date(Date.parse(`${session.session_date}T12:00:00`) + 7 * DAY));
    const target = window.prompt("Kopieren auf welches Datum? (JJJJ-MM-TT)", suggestion);
    if (!target) return;
    if (!isValidDateKey(target.trim())) {
      setNotice("Bitte ein gültiges Datum als JJJJ-MM-TT eingeben.");
      return;
    }
    if (copying) return;
    setCopying(session.id);
    const result = await copyTraining(session.id, target.trim());
    setCopying(null);
    if ("error" in result) {
      setNotice(result.error);
      return;
    }
    setNotice(`„${session.title}“ wurde auf den ${fmt(target)} kopiert.`);
    setReloadKey((key) => key + 1);
  }

  /* Einheit verschieben (z. B. Hallenzeit faellt aus): nur das Datum aendert sich */
  async function moveSession(session: Session) {
    const target = window.prompt("Auf welches Datum verschieben? (JJJJ-MM-TT)", session.session_date);
    if (!target || target.trim() === session.session_date) return;
    if (!isValidDateKey(target.trim())) {
      setNotice("Bitte ein gültiges Datum als JJJJ-MM-TT eingeben.");
      return;
    }
    if (copying) return;
    setCopying(session.id);
    const res = await supabase.from("training_sessions").update({ session_date: target.trim() }).eq("id", session.id).select("id");
    setCopying(null);
    const check = checkWrite(res);
    setNotice(check.ok ? `„${session.title}“ liegt jetzt am ${fmt(target.trim())}.` : writeErrorText(check, "Verschieben"));
    setReloadKey((key) => key + 1);
  }

  const shift = (count: number) => setWeek(toDateKey(new Date(Date.parse(`${week}T12:00:00`) + count * 7 * DAY)));
  const fmt = (date: string) => new Date(`${date}T12:00:00`).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" });
  const sunday = days[6].date;

  return (
    <main className="mx-auto max-w-[1500px] space-y-4 sm:space-y-5">
      <PageHeader
        eyebrow={`Training · ${fmt(week)} – ${fmt(sunday)}`}
        title={`KW ${isoWeek(week)}`}
        actions={
          <>
            {teams.length > 1 && teamId && <TeamSwitcher teams={teams} teamId={teamId} onChange={chooseTeam} />}
            <Link href="/coach/training/season" className={buttonSecondary}>
              Saison
            </Link>
            <Link href={`/coach/training/new?day=${week >= weekStart(today) ? (week === weekStart(today) ? today : week) : week}`} className={buttonPrimary}>
              + Einheit
            </Link>
          </>
        }
      />

      {teamHint && (
        <p role="status" className="rounded-[14px] border border-app-warn/40 bg-app-warn/10 px-4 py-3 text-sm text-app-text">
          {teamHint}
        </p>
      )}

      {notice && (
        <p role="status" className="rounded-[14px] border border-app-accent/30 bg-app-accent/10 px-4 py-3 text-sm text-app-text">
          {notice}
        </p>
      )}

      <div className="flex items-center gap-2">
        <button type="button" onClick={() => shift(-1)} className="flex h-11 w-11 items-center justify-center rounded-xl bg-app-elevated text-app-heading hover:bg-app-border/70" aria-label="Vorige Woche">
          ‹
        </button>
        <button
          type="button"
          onClick={() => setWeek(weekStart(today))}
          disabled={week === weekStart(today)}
          className="h-11 rounded-xl bg-app-elevated px-4 text-sm font-bold text-app-heading hover:bg-app-border/70 disabled:opacity-50"
        >
          Diese Woche
        </button>
        <button type="button" onClick={() => shift(1)} className="flex h-11 w-11 items-center justify-center rounded-xl bg-app-elevated text-app-heading hover:bg-app-border/70" aria-label="Nächste Woche">
          ›
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
        {[
          { value: `${(waterMeters / 1000).toLocaleString("de-DE", { maximumFractionDigits: 1 })} km`, label: "Wasser" },
          { value: sessions.length, label: "Einheiten" },
          { value: landCount, label: "davon Land" },
          { value: `${Math.floor(minutes / 60)}:${String(minutes % 60).padStart(2, "0")} h`, label: "Trainingszeit" },
        ].map((kpi) => (
          <div key={kpi.label} className="rounded-[14px] bg-app-elevated/60 px-3.5 py-3">
            <p className="label-caps">{kpi.label}</p>
            <p className="num mt-1 text-xl font-semibold text-app-heading">{kpi.value}</p>
          </div>
        ))}
      </div>

      {zoneTotal > 0 && (
        <section className="rounded-[20px] border border-app-border/60 bg-app-surface p-4 shadow-app sm:p-[22px]">
          <p className="text-[15px] font-bold text-app-heading">Intensitätsverteilung · Meter je Zone</p>
          <ul className="mt-3 space-y-2">
            {zones.map(([zone, value]) => (
              <li key={zone} className="grid grid-cols-[7rem_1fr_5.5rem] items-center gap-3 text-xs">
                <span className="font-semibold text-app-text">{zone}</span>
                <span className="h-2.5 overflow-hidden rounded-full bg-app-elevated">
                  <span className="block h-full rounded-full bg-app-accent" style={{ width: `${(value / Math.max(...zones.map(([, v]) => v))) * 100}%` }} />
                </span>
                <span className="text-right tabular-nums text-app-muted">
                  {value.toLocaleString("de-DE")} m · {Math.round((value / zoneTotal) * 100)} %
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {zoneTotal === 0 && sessions.length > 0 && (
        <p className="text-[13px] text-app-muted">Für die Intensitätsverteilung in den Einheiten Zonen bei den Serien angeben.</p>
      )}

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-7">
        {days.map((day) => (
          <section
            key={day.date}
            className={`flex flex-col rounded-[20px] border bg-app-surface p-3 shadow-app xl:min-h-[220px] ${day.date === today ? "border-app-accent" : "border-app-border/60"}`}
          >
            <p className={`px-1 text-sm font-bold ${day.date === today ? "text-app-soon" : "text-app-heading"}`}>
              {day.name} <span className="font-normal text-app-muted">{fmt(day.date)}</span>
            </p>
            <div className="mt-2 flex-1 space-y-2">
              {day.list.map((session) => (
                <div key={session.id} className="rounded-[14px] bg-app-elevated/60 p-3">
                <Link href={`/coach/training/session/${session.id}`} className="block transition hover:text-app-accent-soft">
                  <p className="text-sm font-semibold text-app-heading">{session.title}</p>
                  <p className="mt-0.5 text-xs text-app-muted">
                    {[
                      session.start_time?.slice(0, 5),
                      session.duration_minutes ? `${session.duration_minutes} min` : null,
                      session.total_meters ? `${session.total_meters.toLocaleString("de-DE")} m` : null,
                      session.training_type === "land" ? "Land" : null,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                  {session.focus && <p className="mt-1 text-xs text-app-text">{session.focus}</p>}
                  {session.planned_rpe ? <p className="mt-1 text-[11px] text-app-faint">geplant RPE {session.planned_rpe}</p> : null}
                </Link>
                <div className="mt-2 flex flex-wrap gap-x-3 gap-y-2 text-xs font-semibold">
                  <Link href={`/coach/training/new?session=${session.id}`} className="text-app-muted hover:text-app-heading">
                    Bearbeiten
                  </Link>
                  <button type="button" onClick={() => copySession(session)} disabled={copying === session.id} className="text-app-muted hover:text-app-heading disabled:opacity-50">
                    {copying === session.id ? "Kopiert …" : "Kopieren"}
                  </button>
                  <button type="button" onClick={() => moveSession(session)} disabled={copying === session.id} className="text-app-muted hover:text-app-heading disabled:opacity-50">
                    Verschieben
                  </button>
                </div>
                </div>
              ))}
            </div>
            <Link
              href={`/coach/training/new?day=${day.date}`}
              className="mt-2 flex min-h-11 items-center justify-center rounded-[14px] border border-dashed border-app-border text-sm text-app-muted transition hover:border-app-accent hover:text-app-accent-soft"
            >
              + Einheit
            </Link>
          </section>
        ))}
      </div>
    </main>
  );
}

export default function TrainingPage() {
  return (
    <Suspense fallback={<p className="text-sm text-app-muted"><Loader /></p>}>
      <WochenplanView />
    </Suspense>
  );
}
