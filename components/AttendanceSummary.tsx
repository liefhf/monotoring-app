"use client";

import { toDateKey } from "@/lib/community";
import { useEffect, useState } from "react";
import { AttendanceStatus, attendanceStats, loadSwimmerAttendance } from "@/lib/attendance";

/* Anwesenheitsquote eines Athleten: letzte 4 Wochen und gesamt */
export default function AttendanceSummary({ swimmerId }: { swimmerId: string }) {
  const [rows, setRows] = useState<{ status: AttendanceStatus; date: string }[] | null>(null);
  const [since] = useState(() => new Date(Date.parse(toDateKey(new Date())) - 28 * 86_400_000).toISOString().slice(0, 10));

  useEffect(() => {
    loadSwimmerAttendance(swimmerId).then(({ rows: loaded, missingTable }) => setRows(missingTable ? [] : loaded));
  }, [swimmerId]);

  if (rows === null) return null;
  const recent = attendanceStats(rows.filter((row) => row.date >= since));
  const all = attendanceStats(rows);
  const line = (stats: ReturnType<typeof attendanceStats>) =>
    stats.total
      ? `${stats.rate} % (${stats.present} von ${stats.total}${stats.excused + stats.sick ? ` · ${stats.excused} entsch. · ${stats.sick} krank` : ""}${stats.missing ? ` · ${stats.missing} unentsch.` : ""})`
      : "noch keine Einträge";

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
