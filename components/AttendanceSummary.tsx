"use client";

import { toDateKey } from "@/lib/community";
import { useEffect, useState } from "react";
import { AttendanceStatus, attendanceDisplay, attendanceStats, loadSwimmerAttendance } from "@/lib/attendance";

/* Anwesenheitsquote eines Athleten: letzte 4 Wochen und gesamt */
export default function AttendanceSummary({ swimmerId }: { swimmerId: string }) {
  const [today] = useState(() => toDateKey(new Date()));
  const [since] = useState(() => new Date(Date.parse(toDateKey(new Date())) - 28 * 86_400_000).toISOString().slice(0, 10));
  const [entry, setEntry] = useState<{ id: string; rows: { status: AttendanceStatus; date: string }[] | null } | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadSwimmerAttendance(swimmerId).then(({ rows: loaded, missingTable, failed }) => {
      if (!cancelled) setEntry({ id: swimmerId, rows: failed ? null : missingTable ? [] : loaded });
    });
    return () => {
      cancelled = true;
    };
  }, [swimmerId]);

  if (!entry || entry.id !== swimmerId) return null;
  if (entry.rows === null) return <p className="px-5 py-3 text-sm text-app-bad">Anwesenheit konnte nicht geladen werden.</p>;
  /* gleiche Regel wie Dashboard und Anwesenheitsseite: nur erfasste Eintraege bis heute */
  const past = entry.rows.filter((row) => row.date && row.date <= today);
  const recent = attendanceStats(past.filter((row) => row.date >= since));
  const all = attendanceStats(past);
  const line = (stats: ReturnType<typeof attendanceStats>) => {
    if (!stats.total) return "noch keine Einträge";
    const shown = attendanceDisplay(stats.present, stats.total);
    const extra = `${stats.excused + stats.sick ? ` · ${stats.excused} entsch. · ${stats.sick} krank` : ""}${stats.missing ? ` · ${stats.missing} unentsch.` : ""}`;
    return shown.enough ? `${shown.main} (${stats.present} von ${stats.total}${extra})` : `${stats.present} von ${stats.total} anwesend · noch wenig Daten${extra}`;
  };

  return (
    <div className="divide-y divide-app-border text-sm">
      <div className="flex justify-between gap-4 px-5 py-3">
        <span className="text-app-muted">Letzte 4 Wochen</span>
        <span className="text-right font-medium">{line(recent)}</span>
      </div>
      <div className="flex justify-between gap-4 px-5 py-3">
        <span className="text-app-muted">Gesamt</span>
        <span className="text-right font-medium">{line(all)}</span>
      </div>
    </div>
  );
}
