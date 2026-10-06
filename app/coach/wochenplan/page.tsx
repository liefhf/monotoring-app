"use client";

import Loader from "@/components/Loader";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { fetchAll } from "@/lib/fetchAll";
import { toDateKey } from "@/lib/community";
import { isoWeek, weekStart } from "@/lib/dashboardStats";
import { PageHeader } from "@/components/ui";

/*
 * Wochenplan-Uebersicht: alle Einheiten der Mannschaft Mo-So mit Umfang,
 * Dauer, Fokus und geplanter Belastung, dazu Summen und die Verteilung
 * der Meter auf die Belastungszonen. Woche per ?week=YYYY-MM-DD.
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
  const [teamId, setTeamId] = useState<string | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [zoneRows, setZoneRows] = useState<ZoneRow[]>([]);

  useEffect(() => {
    supabase
      .from("teams")
      .select("id")
      .order("name")
      .then(({ data }) => {
        const ids = ((data ?? []) as { id: string }[]).map((team) => team.id);
        let saved: string | null = null;
        try {
          saved = localStorage.getItem("dashboard-team");
        } catch {
          /* ohne Browser-Speicher */
        }
        setTeamId(ids.find((id) => id === saved) ?? ids[0] ?? null);
      });
  }, []);

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
  }, [teamId, week]);

  const days = DAYS.map((name, index) => {
    const date = toDateKey(new Date(Date.parse(`${week}T12:00:00`) + index * DAY));
    return { name, date, list: sessions.filter((session) => session.session_date === date) };
  });

  const meters = sessions.reduce((sum, session) => sum + (session.total_meters ?? 0), 0);
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

  const shift = (count: number) => setWeek(toDateKey(new Date(Date.parse(`${week}T12:00:00`) + count * 7 * DAY)));
  const fmt = (date: string) => new Date(`${date}T12:00:00`).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" });
  const sunday = days[6].date;

  return (
    <main className="mx-auto max-w-[1500px] space-y-5">
      <PageHeader
        eyebrow="Training"
        title={`Wochenplan · KW ${isoWeek(week)}`}
        icon="calendar"
        description={`${fmt(week)} – ${fmt(sunday)}`}
        actions={
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => shift(-1)} className="h-9 w-9 rounded-full border border-app-border text-app-muted hover:text-app-heading" aria-label="Vorige Woche">
              ‹
            </button>
            {week !== weekStart(today) && (
              <button type="button" onClick={() => setWeek(weekStart(today))} className="rounded-full border border-app-border px-3 py-1.5 text-xs font-semibold text-app-accent">
                Diese Woche
              </button>
            )}
            <button type="button" onClick={() => shift(1)} className="h-9 w-9 rounded-full border border-app-border text-app-muted hover:text-app-heading" aria-label="Nächste Woche">
              ›
            </button>
          </div>
        }
      />

      <div className="grid gap-3 sm:grid-cols-3">
        {[
          { value: `${(meters / 1000).toLocaleString("de-DE", { maximumFractionDigits: 1 })} km`, label: "Umfang" },
          { value: sessions.length, label: "Einheiten" },
          { value: `${Math.floor(minutes / 60)}:${String(minutes % 60).padStart(2, "0")} h`, label: "Trainingszeit" },
        ].map((kpi) => (
          <div key={kpi.label} className="rounded-[20px] border border-app-border bg-app-surface p-4 shadow-app">
            <p className="text-2xl font-bold text-app-heading">{kpi.value}</p>
            <p className="text-xs text-app-muted">{kpi.label}</p>
          </div>
        ))}
      </div>

      {zoneTotal > 0 && (
        <section className="rounded-[20px] border border-app-border bg-app-surface p-5 shadow-app">
          <p className="text-sm font-semibold text-app-heading">Meter je Zone</p>
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

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-7">
        {days.map((day) => (
          <section
            key={day.date}
            className={`flex min-h-[220px] flex-col rounded-[20px] border bg-app-surface p-3 shadow-app ${day.date === today ? "border-app-accent" : "border-app-border"}`}
          >
            <p className={`px-1 text-sm font-semibold ${day.date === today ? "text-app-accent" : "text-app-heading"}`}>
              {day.name} <span className="font-normal text-app-muted">{fmt(day.date)}</span>
            </p>
            <div className="mt-2 flex-1 space-y-2">
              {day.list.map((session) => (
                <Link key={session.id} href={`/coach/training/session/${session.id}`} className="block rounded-2xl bg-app-bg p-3 transition hover:ring-1 hover:ring-app-accent">
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
                  {session.planned_rpe ? <p className="mt-1 text-[11px] text-app-faint">RPE {session.planned_rpe}</p> : null}
                </Link>
              ))}
            </div>
            <Link
              href={`/coach/training/new?day=${day.date}`}
              className="mt-2 rounded-2xl border border-dashed border-app-border py-2 text-center text-sm text-app-muted transition hover:border-app-accent hover:text-app-accent"
            >
              + Einheit
            </Link>
          </section>
        ))}
      </div>
    </main>
  );
}

export default function WochenplanPage() {
  return (
    <Suspense fallback={<p className="text-sm text-app-muted"><Loader /></p>}>
      <WochenplanView />
    </Suspense>
  );
}
