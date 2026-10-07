"use client";

import Loader from "@/components/Loader";
import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { toDateKey } from "@/lib/community";
import { AVAILABILITY_LABELS, HealthEvent, isActive } from "@/lib/health";
import { Swimmer } from "@/lib/swim";
import {
  ATTENDANCE_STATUS,
  AttendanceStatus,
  attendanceStats,
  loadAttendance,
  loadTeamSwimmersResult,
  saveAttendance,
} from "@/lib/attendance";

/*
 * Anwesenheitsliste einer Trainingseinheit: je Athlet ein Klick auf
 * anwesend / entschuldigt / krank / fehlt. Wird sofort gespeichert.
 * Am Beckenrand wichtig: wer eingeschraenkt ist oder pausiert, steht
 * direkt am Namen (aus Gesundheit, Skript 23). Grosse Knoepfe (44 px).
 */
export default function AttendanceCard({ sessionId, teamId }: { sessionId: string; teamId: string }) {
  const [swimmers, setSwimmers] = useState<Swimmer[]>([]);
  const [status, setStatus] = useState<Record<string, AttendanceStatus>>({});
  const [missingTable, setMissingTable] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [health, setHealth] = useState<HealthEvent[]>([]);

  const [pending, setPending] = useState<Record<string, boolean>>({});

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const [team, attendance] = await Promise.all([loadTeamSwimmersResult(teamId), loadAttendance(sessionId)]);
      if (cancelled) return;
      setSwimmers(team.swimmers);
      setStatus(Object.fromEntries(attendance.rows.map((row) => [row.swimmer_id, row.status])));
      setMissingTable(attendance.missingTable);
      setError(team.failed || attendance.failed ? "Anwesenheit konnte nicht geladen werden. Bitte Seite neu laden – bitte jetzt nichts eintragen." : "");
      setLoading(false);
      const teamList = team.swimmers;
      if (teamList.length) {
        const today = toDateKey(new Date());
        const { data } = await supabase
          .from("health_events")
          .select("*")
          .in("swimmer_id", teamList.map((swimmer) => swimmer.id))
          .or(`end_date.is.null,end_date.gte.${today}`);
        if (cancelled) return;
        setHealth(((data ?? []) as HealthEvent[]).filter((event) => isActive(event, today) && event.availability !== "voll"));
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [sessionId, teamId]);

  function setOne(swimmerId: string, value: AttendanceStatus | null | undefined) {
    setStatus((current) => {
      const copy = { ...current };
      if (value) copy[swimmerId] = value;
      else delete copy[swimmerId];
      return copy;
    });
  }

  async function change(swimmerId: string, next: AttendanceStatus) {
    if (pending[swimmerId]) return; // Doppel-Tipp ignorieren, bis gespeichert ist
    const before = status[swimmerId];
    const value = before === next ? null : next;
    setPending((current) => ({ ...current, [swimmerId]: true }));
    setOne(swimmerId, value);
    const message = await saveAttendance(sessionId, swimmerId, value);
    // nur diesen Athleten zuruecksetzen, nicht die ganze Liste
    if (message) {
      setOne(swimmerId, before);
      setError(message);
    } else {
      setError("");
    }
    setPending((current) => ({ ...current, [swimmerId]: false }));
  }

  async function allPresent() {
    for (const swimmer of swimmers) {
      if (!status[swimmer.id]) await change(swimmer.id, "anwesend");
    }
  }

  const stats = attendanceStats(Object.values(status).map((value) => ({ status: value })));

  return (
    <section className="mt-5 overflow-hidden rounded-[20px] border border-app-border/60 bg-app-surface shadow-app">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-app-border px-4 py-3">
        <div>
          <h2 className="text-lg font-semibold">Anwesenheit</h2>
          <p className="text-xs text-app-muted">
            {stats.present} anwesend · {stats.excused} entschuldigt · {stats.sick} krank · {stats.missing} fehlen ·{" "}
            {swimmers.length - stats.total} offen
          </p>
        </div>
        {!missingTable && swimmers.length > 0 && (
          <button type="button" onClick={allPresent} className="min-h-11 rounded-xl bg-app-elevated px-4 text-sm font-bold text-app-heading hover:bg-app-border/70">
            Alle offenen = anwesend
          </button>
        )}
      </div>

      {missingTable ? (
        <p className="p-4 text-sm text-app-warn">Bitte zuerst <b>anwesenheit.sql</b> im Supabase SQL-Editor ausführen und die Seite neu laden.</p>
      ) : loading ? (
        <p className="p-4 text-sm text-app-muted"><Loader /></p>
      ) : swimmers.length === 0 ? (
        <p className="p-4 text-sm text-app-muted">Diesem Team sind keine Athleten zugeordnet.</p>
      ) : (
        <ul className="divide-y divide-app-border">
          {swimmers.map((swimmer) => (
            <li key={swimmer.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5">
              <span className="min-w-0">
                <Link href={`/coach/schwimmer/${swimmer.id}`} className="block text-[15px] font-semibold text-app-heading hover:text-app-accent-soft">
                  {swimmer.first_name} {swimmer.last_name ?? ""}
                </Link>
                {health
                  .filter((event) => event.swimmer_id === swimmer.id)
                  .map((event) => (
                    <span key={event.id} className={`block text-xs font-semibold ${event.availability === "pause" ? "text-app-bad" : "text-app-warn"}`}>
                      {AVAILABILITY_LABELS[event.availability]}: {event.title}
                      {event.restriction ? ` – ${event.restriction}` : ""}
                    </span>
                  ))}
              </span>
              <div className="flex gap-1.5">
                {ATTENDANCE_STATUS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    title={option.label}
                    onClick={() => change(swimmer.id, option.value)}
                    disabled={Boolean(pending[swimmer.id])}
                    aria-label={option.label}
                    aria-pressed={status[swimmer.id] === option.value}
                    className={`h-11 min-w-11 rounded-xl px-2 text-sm font-bold transition ${
                      status[swimmer.id] === option.value ? option.className : "border border-app-border text-app-muted hover:bg-app-elevated"
                    }`}
                  >
                    {option.short}
                  </button>
                ))}
              </div>
            </li>
          ))}
        </ul>
      )}
      {error && <p className="border-t border-app-border px-4 py-2 text-sm text-app-bad">{error}</p>}
      <p className="border-t border-app-border px-4 py-2 text-xs text-app-faint">✓ anwesend · E entschuldigt · K krank · F fehlt · nochmal klicken = zurücksetzen</p>
    </section>
  );
}
