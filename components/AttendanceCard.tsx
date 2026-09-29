"use client";

import { useEffect, useState } from "react";
import { Swimmer } from "@/lib/swim";
import {
  ATTENDANCE_STATUS,
  AttendanceStatus,
  attendanceStats,
  loadAttendance,
  loadTeamSwimmers,
  saveAttendance,
} from "@/lib/attendance";

/*
 * Anwesenheitsliste einer Trainingseinheit: je Athlet ein Klick auf
 * anwesend / entschuldigt / krank / fehlt. Wird sofort gespeichert.
 */
export default function AttendanceCard({ sessionId, teamId }: { sessionId: string; teamId: string }) {
  const [swimmers, setSwimmers] = useState<Swimmer[]>([]);
  const [status, setStatus] = useState<Record<string, AttendanceStatus>>({});
  const [missingTable, setMissingTable] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const [team, attendance] = await Promise.all([loadTeamSwimmers(teamId), loadAttendance(sessionId)]);
      setSwimmers(team);
      setStatus(Object.fromEntries(attendance.rows.map((row) => [row.swimmer_id, row.status])));
      setMissingTable(attendance.missingTable);
      setLoading(false);
    }
    load();
  }, [sessionId, teamId]);

  async function change(swimmerId: string, next: AttendanceStatus) {
    const value = status[swimmerId] === next ? null : next;
    const previous = status;
    setStatus((current) => {
      const copy = { ...current };
      if (value) copy[swimmerId] = value;
      else delete copy[swimmerId];
      return copy;
    });
    const message = await saveAttendance(sessionId, swimmerId, value);
    if (message) {
      setStatus(previous);
      setError(`Anwesenheit konnte nicht gespeichert werden: ${message}`);
    } else {
      setError("");
    }
  }

  async function allPresent() {
    for (const swimmer of swimmers) {
      if (!status[swimmer.id]) await change(swimmer.id, "anwesend");
    }
  }

  const stats = attendanceStats(Object.values(status).map((value) => ({ status: value })));

  return (
    <section className="mt-5 overflow-hidden rounded-2xl border border-app-border bg-app-surface">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-app-border px-4 py-3">
        <div>
          <h2 className="text-lg font-semibold">Anwesenheit</h2>
          <p className="text-xs text-app-muted">
            {stats.present} anwesend · {stats.excused} entschuldigt · {stats.sick} krank · {stats.missing} fehlen ·{" "}
            {swimmers.length - stats.total} offen
          </p>
        </div>
        {!missingTable && swimmers.length > 0 && (
          <button type="button" onClick={allPresent} className="rounded-lg border border-app-border px-3 py-1.5 text-xs font-medium hover:bg-app-elevated">
            Alle offenen = anwesend
          </button>
        )}
      </div>

      {missingTable ? (
        <p className="p-4 text-sm text-app-warn">Bitte zuerst <b>anwesenheit.sql</b> im Supabase SQL-Editor ausführen und die Seite neu laden.</p>
      ) : loading ? (
        <p className="p-4 text-sm text-app-muted">Lade …</p>
      ) : swimmers.length === 0 ? (
        <p className="p-4 text-sm text-app-muted">Diesem Team sind keine Athleten zugeordnet.</p>
      ) : (
        <ul className="divide-y divide-app-border">
          {swimmers.map((swimmer) => (
            <li key={swimmer.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-2">
              <span className="text-sm font-medium">
                {swimmer.last_name}, {swimmer.first_name}
              </span>
              <div className="flex gap-1.5">
                {ATTENDANCE_STATUS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    title={option.label}
                    onClick={() => change(swimmer.id, option.value)}
                    className={`h-9 min-w-9 rounded-lg px-2 text-sm font-bold transition ${
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
