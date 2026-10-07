"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { teamNotice, useSelectedTeam } from "@/lib/useSelectedTeam";
import { fetchAll } from "@/lib/fetchAll";
import { toDateKey } from "@/lib/community";
import { ATTENDANCE_STATUS, AttendanceStatus, attendanceStats, loadTeamSwimmers } from "@/lib/attendance";
import { Swimmer } from "@/lib/swim";
import { PageHeader } from "@/components/ui";
import TeamSwitcher from "@/components/TeamSwitcher";

/*
 * Anwesenheitsuebersicht: Athleten x Einheiten der Mannschaft in einem
 * Zeitraum (4 Wochen, blaetterbar). Quote je Athlet, Zaehlung je Einheit.
 * Klick auf eine Spalte oeffnet die Einheit zum Abhaken.
 */

type Session = { id: string; title: string; session_date: string; start_time: string | null };
type Entry = { training_session_id: string; swimmer_id: string; status: AttendanceStatus };

const DAY = 86_400_000;
const STYLE = Object.fromEntries(ATTENDANCE_STATUS.map((item) => [item.value, item]));

export default function AnwesenheitPage() {
  const { teams, teamId, chooseTeam, status: teamStatus } = useSelectedTeam();
  const teamHint = teamNotice(teamStatus, teamId);
  const [swimmers, setSwimmers] = useState<Swimmer[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [today] = useState(() => toDateKey(new Date()));
  /* Ende des Zeitraums; 4 Wochen zurueck */
  const [until, setUntil] = useState(today);
  const from = toDateKey(new Date(Date.parse(until) - 27 * DAY));


  useEffect(() => {
    if (!teamId) return;
    async function load() {
      const [team, sessionRes] = await Promise.all([
        loadTeamSwimmers(teamId!),
        fetchAll(() =>
          supabase
            .from("training_sessions")
            .select("id, title, session_date, start_time")
            .eq("team_id", teamId!)
            .gte("session_date", from)
            .lte("session_date", until)
            .order("session_date")
            .order("start_time")
        ),
      ]);
      const list = (sessionRes.data ?? []) as Session[];
      setSwimmers(team);
      setSessions(list);
      if (list.length) {
        const { data } = await fetchAll(() =>
          supabase.from("training_attendance").select("training_session_id, swimmer_id, status").in("training_session_id", list.map((s) => s.id))
        );
        setEntries((data ?? []) as Entry[]);
      } else {
        setEntries([]);
      }
    }
    load();
  }, [teamId, from, until]);

  const statusOf = useMemo(() => {
    const map = new Map<string, AttendanceStatus>();
    for (const entry of entries) map.set(`${entry.swimmer_id}|${entry.training_session_id}`, entry.status);
    return map;
  }, [entries]);

  const rows = swimmers
    .map((swimmer) => {
      const own = entries.filter((entry) => entry.swimmer_id === swimmer.id);
      return { swimmer, stats: attendanceStats(own) };
    })
    .sort((a, b) => (a.stats.rate ?? 101) - (b.stats.rate ?? 101) || (a.swimmer.last_name ?? "").localeCompare(b.swimmer.last_name ?? "", "de"));

  const total = attendanceStats(entries);
  const shift = (weeks: number) => setUntil(toDateKey(new Date(Date.parse(until) + weeks * 7 * DAY)));
  const fmt = (date: string) => new Date(`${date}T12:00:00`).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" });

  return (
    <main className="mx-auto max-w-[1500px] space-y-5">
      <PageHeader
        eyebrow="Team"
        title="Anwesenheit"
        icon="calendar"
        actions={
          <div className="flex items-center gap-2">
            {teams.length > 1 && teamId && <TeamSwitcher teams={teams} teamId={teamId} onChange={chooseTeam} />}
            <button type="button" onClick={() => shift(-4)} className="h-9 w-9 rounded-full border border-app-border text-app-muted hover:text-app-heading" aria-label="Frühere 4 Wochen">
              ‹
            </button>
            <span className="text-sm font-semibold">
              {fmt(from)} – {fmt(until)}
            </span>
            <button
              type="button"
              onClick={() => shift(4)}
              disabled={until >= today}
              className="h-9 w-9 rounded-full border border-app-border text-app-muted hover:text-app-heading disabled:opacity-30"
              aria-label="Spätere 4 Wochen"
            >
              ›
            </button>
          </div>
        }
      />

      {teamHint && (
        <p role="status" className="rounded-[14px] border border-app-warn/40 bg-app-warn/10 px-4 py-3 text-sm text-app-text">
          {teamHint}
        </p>
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <div className="rounded-[20px] border border-app-border bg-app-surface p-4 shadow-app">
          <p className="text-3xl font-bold text-app-heading">{total.rate === null ? "–" : `${total.rate}%`}</p>
          <p className="text-xs text-app-muted">anwesend gesamt</p>
        </div>
        {ATTENDANCE_STATUS.map((item) => (
          <div key={item.value} className="rounded-[20px] border border-app-border bg-app-surface p-4 shadow-app">
            <p className="flex items-center gap-2 text-3xl font-bold text-app-heading">
              <span className={`flex h-7 w-7 items-center justify-center rounded-lg text-sm ${item.className}`}>{item.short}</span>
              {entries.filter((entry) => entry.status === item.value).length}
            </p>
            <p className="text-xs text-app-muted">{item.label}</p>
          </div>
        ))}
      </div>

      <section className="overflow-hidden rounded-[20px] border border-app-border bg-app-surface shadow-app">
        {sessions.length === 0 ? (
          <p className="p-6 text-sm text-app-muted">Keine Einheiten in diesem Zeitraum.</p>
        ) : (
          <>
          {/* Handy: Liste je Athlet statt breiter Matrix */}
          <ul className="divide-y divide-app-border/60 md:hidden">
            {rows.map(({ swimmer, stats }) => (
              <li key={swimmer.id}>
                <Link href={`/coach/schwimmer/${swimmer.id}`} className="flex min-h-14 items-center gap-3 px-4 py-2.5">
                  <span className="min-w-0 flex-1 truncate font-semibold text-app-heading">
                    {swimmer.first_name} {swimmer.last_name ?? ""}
                  </span>
                  <span className="text-xs text-app-muted">
                    {stats.present}/{stats.total}
                  </span>
                  <span className={`num w-12 text-right font-bold ${stats.rate !== null && stats.rate < 70 ? "text-app-warn" : "text-app-heading"}`}>
                    {stats.rate === null ? "–" : `${stats.rate} %`}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-app-border text-xs text-app-muted">
                  <th className="sticky left-0 bg-app-surface px-5 py-3 text-left font-medium">Athlet</th>
                  <th className="px-3 py-3 text-right font-medium">Quote</th>
                  {sessions.map((session) => (
                    <th key={session.id} className="px-1.5 py-3 text-center font-medium">
                      <Link href={`/coach/training/session/${session.id}`} title={session.title} className="block hover:text-app-accent">
                        <span className="block">{new Date(`${session.session_date}T12:00:00`).toLocaleDateString("de-DE", { weekday: "short" })}</span>
                        <span className="block">{fmt(session.session_date)}</span>
                      </Link>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map(({ swimmer, stats }) => (
                  <tr key={swimmer.id} className="border-b border-app-border last:border-b-0">
                    <td className="sticky left-0 whitespace-nowrap bg-app-surface px-5 py-2.5 font-semibold text-app-heading">
                      <Link href={`/coach/schwimmer/${swimmer.id}`} className="hover:text-app-accent">
                        {swimmer.last_name}, {swimmer.first_name}
                      </Link>
                    </td>
                    <td className="px-3 py-2.5 text-right font-bold tabular-nums">{stats.rate === null ? "–" : `${stats.rate}%`}</td>
                    {sessions.map((session) => {
                      const status = statusOf.get(`${swimmer.id}|${session.id}`);
                      return (
                        <td key={session.id} className="px-1.5 py-2.5 text-center">
                          {status ? (
                            <span className={`mx-auto flex h-7 w-7 items-center justify-center rounded-lg text-xs font-bold ${STYLE[status].className}`} title={STYLE[status].label}>
                              {STYLE[status].short}
                            </span>
                          ) : (
                            <span className="mx-auto block h-7 w-7 rounded-lg border border-dashed border-app-border" title="nicht erfasst" />
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-app-border text-xs text-app-muted">
                  <td className="sticky left-0 bg-app-surface px-5 py-2.5">anwesend</td>
                  <td />
                  {sessions.map((session) => {
                    const present = entries.filter((entry) => entry.training_session_id === session.id && entry.status === "anwesend").length;
                    return (
                      <td key={session.id} className="px-1.5 py-2.5 text-center font-semibold text-app-text">
                        {present}/{swimmers.length}
                      </td>
                    );
                  })}
                </tr>
              </tfoot>
            </table>
          </div>
          </>
        )}
      </section>
    </main>
  );
}
