"use client";

import { classifyError } from "@/lib/loadState";
import { toDateKey } from "@/lib/community";
import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Acwr, Flag, LoadEntry, acwr, buildFlags, readinessScore, sessionLoad, wellnessScore } from "@/lib/monitoring";
import { attendanceStats, AttendanceStatus, MIN_ATTENDANCE_BASIS } from "@/lib/attendance";
import { HealthEvent, healthFlags } from "@/lib/health";
import { attentionItems, dataGaps } from "@/lib/attention";
import { Avatar } from "@/components/ui";

/*
 * Athleten-Check fuer den Coach: wer braucht heute Aufmerksamkeit?
 * Belastungsaenderung (Session-RPE), Schmerzen, Befinden, fehlende
 * Check-ins und Anwesenheit. Jeder Hinweis sagt, was erkannt wurde,
 * warum es wichtig ist und was zu pruefen ist (lib/monitoring.ts).
 */

export type Row = {
  id: string;
  name: string;
  acwr: Acwr;
  flags: Flag[];
  estimated: boolean;
  /* Werte fuer die Tabelle */
  readiness: number | null;
  painMax: number | null;
  attendanceRate: number | null;
  /* fuer die Zusammenfassung: fehlende Daten konkret benennen */
  hasLogin: boolean;
  checkInToday: boolean;
};

const DAY = 86_400_000;
const isoDay = (ms: number) => new Date(ms).toISOString().slice(0, 10);

/*
 * Wie loadRowsChecked, aber nur die Zeilen (fuer Berichte).
 * Wirft bei Ladefehlern der Grunddaten.
 */
export async function loadRows(today: string, teamId: string | null, swimmerId: string | null = null): Promise<Row[]> {
  return (await loadRowsChecked(today, teamId, swimmerId)).rows;
}

/*
 * incomplete: Quellen, die nicht geladen werden konnten. Dann ist
 * "keine Hinweise" NICHT dasselbe wie "unauffaellig" - die Oberflaeche
 * muss das sagen. Fehlen die Grunddaten (Team, Athleten, Einheiten),
 * wird ein Fehler geworfen.
 */
export async function loadRowsChecked(
  today: string,
  teamId: string | null,
  swimmerId: string | null = null
): Promise<{ rows: Row[]; incomplete: string[] }> {
  const since35 = isoDay(Date.parse(today) - 35 * DAY);
  const since28 = isoDay(Date.parse(today) - 28 * DAY);
  const since3 = new Date(Date.parse(today) - 3 * DAY).toISOString();
  const since21 = isoDay(Date.parse(today) - 21 * DAY);

  /* Optional nur eine Mannschaft: ihre Athleten und ihre Einheiten */
  const memberRes = teamId ? await supabase.from("team_swimmers").select("swimmer_id").eq("team_id", teamId) : null;
  if (memberRes?.error) throw new Error("team");
  const memberIds = memberRes ? new Set(((memberRes.data ?? []) as { swimmer_id: string }[]).map((row) => row.swimmer_id)) : null;
  const sessionQuery = supabase.from("training_sessions").select("*").gte("session_date", since35).lte("session_date", today);
  const swimmerQuery = supabase.from("swimmers").select("*");
  const [swimmerRes, sessionRes] = await Promise.all([
    swimmerId ? swimmerQuery.eq("id", swimmerId) : swimmerQuery,
    teamId ? sessionQuery.eq("team_id", teamId) : sessionQuery,
  ]);
  if (swimmerRes.error || sessionRes.error) throw new Error("grunddaten");
  const swimmers = ((swimmerRes.data ?? []) as { id: string }[]).filter((swimmer) => !memberIds || memberIds.has(swimmer.id)) as { id: string; first_name: string; last_name: string | null; profile_id?: string | null }[];
  const sessions = (sessionRes.data ?? []) as { id: string; session_date: string; duration_minutes: number | null; planned_rpe?: number | null }[];
  const sessionIds = sessions.map((session) => session.id);
  const profileIds = swimmers.map((swimmer) => swimmer.profile_id).filter(Boolean) as string[];

  const swimmerIds = swimmers.map((swimmer) => swimmer.id);
  const [feedbackRes, attendanceRes, wellnessRes, painRes, healthRes] = await Promise.all([
    sessionIds.length
      ? supabase.from("training_feedback").select("training_session_id, athlete_id, rpe, completed").in("training_session_id", sessionIds)
      : Promise.resolve({ data: [] }),
    sessionIds.length
      ? supabase.from("training_attendance").select("training_session_id, swimmer_id, status").in("training_session_id", sessionIds)
      : Promise.resolve({ data: [] }),
    profileIds.length
      ? supabase.from("befinden_entries").select("athlete_id, entry_date, sleep_quality, energy, muscle_feeling, stress, mood, sleep_hours, has_pain").in("athlete_id", profileIds).gte("entry_date", since21)
      : Promise.resolve({ data: [] }),
    profileIds.length
      ? supabase.from("pain_reports").select("athlete_id, created_at, pain_level, spot_label, body_region").in("athlete_id", profileIds).gte("created_at", since3)
      : Promise.resolve({ data: [] }),
    /* Gesundheit (Skript 23) - fehlt die Tabelle, bleibt die Liste einfach leer */
    swimmerIds.length
      ? supabase.from("health_events").select("*").in("swimmer_id", swimmerIds).or(`end_date.is.null,end_date.gte.${today},clearance.eq.offen`)
      : Promise.resolve({ data: [] }),
  ]);
  const health = (healthRes.data ?? []) as HealthEvent[];
  /* fehlende Tabelle (Skript nicht ausgefuehrt) ist kein Ladefehler */
  const incomplete = (
    [
      ["Rückmeldungen", feedbackRes],
      ["Anwesenheit", attendanceRes],
      ["Befinden", wellnessRes],
      ["Schmerzmeldungen", painRes],
      ["Gesundheit", healthRes],
    ] as [string, { error?: { code?: string } | null }][]
  )
    .filter(([, res]) => classifyError(res.error) === "error")
    .map(([label]) => label);

  const feedback = (feedbackRes.data ?? []) as { training_session_id: string; athlete_id: string; rpe: number | null; completed: boolean | null }[];
  const attendance = (attendanceRes.data ?? []) as { training_session_id: string; swimmer_id: string; status: AttendanceStatus }[];
  const wellness = (wellnessRes.data ?? []) as { athlete_id: string; entry_date: string; sleep_quality: number; energy: number; muscle_feeling: number; stress: number; mood: number; sleep_hours: number | null; has_pain: boolean | null }[];
  const pain = (painRes.data ?? []) as { athlete_id: string; created_at: string; pain_level: number; spot_label: string | null; body_region: string | null }[];
  const sessionById = new Map(sessions.map((session) => [session.id, session]));

  const rows = swimmers.map((swimmer) => {
    const loads: LoadEntry[] = [];
    for (const session of sessions) {
      const own = feedback.find((item) => item.training_session_id === session.id && item.athlete_id === swimmer.profile_id);
      const present = attendance.find((item) => item.training_session_id === session.id && item.swimmer_id === swimmer.id);
      if (own?.rpe && own.completed !== false) {
        loads.push({ date: session.session_date, load: sessionLoad(own.rpe, session.duration_minutes), estimated: false });
      } else if (present?.status === "anwesend" && session.planned_rpe) {
        loads.push({ date: session.session_date, load: sessionLoad(session.planned_rpe, session.duration_minutes), estimated: true });
      }
    }
    const load = acwr(loads, today);
    const ownAttendance = attendance.filter(
      (item) => item.swimmer_id === swimmer.id && (sessionById.get(item.training_session_id)?.session_date ?? "") >= since28
    );
    const ownPain = pain.filter((item) => item.athlete_id === swimmer.profile_id);
    const readinessList = (() => {
      const own = wellness.filter((item) => item.athlete_id === swimmer.profile_id).sort((a, b) => b.entry_date.localeCompare(a.entry_date));
      /* eigener Durchschnitt der Vortage als Vergleich */
      return own.map((item, index) => {
        const earlier = own.slice(index + 1);
        const baseline = earlier.length >= 3 ? earlier.reduce((sum, entry) => sum + wellnessScore(entry), 0) / earlier.length : null;
        return {
          entry_date: item.entry_date,
          score: readinessScore(item, index === 0 ? baseline : null).score,
          belowBaseline: baseline !== null && wellnessScore(item) <= baseline - 1.5,
        };
      });
    })();
    /* letzter Check-in innerhalb von 3 Wochen; nur bei Athleten mit Login sinnvoll */
    const lastCheckIn = swimmer.profile_id ? (readinessList[0]?.entry_date ?? null) : null;
    /* gleiche Grundlage wie die Anzeige: erst ab MIN_ATTENDANCE_BASIS erfassten Eintraegen */
    const attendanceRate = ownAttendance.length >= MIN_ATTENDANCE_BASIS ? attendanceStats(ownAttendance).rate : null;
    const flags = [
      ...healthFlags(health.filter((item) => item.swimmer_id === swimmer.id), today).map((flag) => ({ ...flag, kind: "gesundheit" as const })),
      ...buildFlags({ acwr: load, painReports: ownPain, wellness: readinessList, attendanceRate, lastCheckIn, today }),
    ].sort((a, b) => (a.level === b.level ? 0 : a.level === "rot" ? -1 : 1));
    const latestReadiness = readinessList.find((item) => (Date.parse(today) - Date.parse(item.entry_date)) / DAY <= 2);
    return {
      hasLogin: Boolean(swimmer.profile_id),
      checkInToday: Boolean(swimmer.profile_id) && readinessList[0]?.entry_date === today,
      id: swimmer.id,
      name: `${swimmer.first_name} ${swimmer.last_name ?? ""}`.trim(),
      acwr: load,
      flags,
      estimated: loads.some((entry) => entry.estimated),
      readiness: latestReadiness?.score ?? null,
      painMax: ownPain.length ? Math.max(...ownPain.map((item) => item.pain_level)) : null,
      attendanceRate,
    };
  });
  return { rows, incomplete };
}


/* Direkter Weg zur Ursache eines Hinweises */
export function flagHref(swimmerId: string, flag?: Flag) {
  const tab: Record<Flag["kind"], string> = {
    acwr: "befinden",
    schmerz: "gesundheit",
    befinden: "befinden",
    checkin: "befinden",
    anwesenheit: "ueberblick",
    gesundheit: "gesundheit",
  };
  return `/coach/schwimmer/${swimmerId}${flag ? `?tab=${tab[flag.kind]}` : ""}`;
}

/* Hinweis mit Erklaerung: was, warum, was pruefen */
function FlagLine({ flag, compact = false }: { flag: Flag; compact?: boolean }) {
  return (
    <li className="flex gap-2.5">
      <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${flag.level === "rot" ? "bg-app-bad" : "bg-app-warn"}`} aria-hidden="true" />
      <span className="min-w-0">
        <span className="block text-sm font-semibold text-app-heading">
          <span className="sr-only">{flag.level === "rot" ? "Kritisch: " : "Beachten: "}</span>
          {flag.text}
        </span>
        {!compact && (
          <span className="block text-[13px] text-app-muted">
            {flag.reason} <span className="text-app-text">→ {flag.check}</span>
          </span>
        )}
      </span>
    </li>
  );
}

/*
 * variant "summary": Ring mit Anteil im gruenen Bereich (Dashboard, Klick fuehrt zur Uebersicht)
 * variant "table": vollstaendige Tabelle aller Athleten
 */
export default function RedFlagsPanel({ teamId = null, variant = "table", extra = null }: { teamId?: string | null; variant?: "summary" | "table"; extra?: React.ReactNode }) {
  const [today] = useState(() => toDateKey(new Date()));
  const key = `${teamId ?? "alle"}|${today}`;
  const [result, setResult] = useState<{ key: string; rows: Row[] | null; incomplete: string[] } | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadRowsChecked(today, teamId)
      .then((loaded) => !cancelled && setResult({ key, rows: loaded.rows, incomplete: loaded.incomplete }))
      .catch(() => !cancelled && setResult({ key, rows: null, incomplete: [] }));
    return () => {
      cancelled = true;
    };
  }, [today, teamId, key]);

  /* Teamwechsel: nie die Werte des vorherigen Teams zeigen */
  if (!result || result.key !== key) {
    return <div className="h-16 animate-pulse rounded-xl bg-app-elevated" aria-label="Wird geladen" />;
  }
  if (result.rows === null) {
    return <p className="text-sm text-app-bad">Hinweise konnten nicht geladen werden. Es ist unbekannt, ob jemand Aufmerksamkeit braucht – bitte Seite neu laden.</p>;
  }
  const rows = result.rows;
  const incomplete = result.incomplete;

  const sorted = [...rows].sort(
    (x, y) =>
      y.flags.filter((flag) => flag.level === "rot").length - x.flags.filter((flag) => flag.level === "rot").length ||
      y.flags.length - x.flags.length ||
      x.name.localeCompare(y.name, "de")
  );
  const shown = sorted;

  const cell = (row: Row, kind: Flag["kind"]) => {
    const flag = row.flags.find((item) => item.kind === kind);
    const tone = flag ? (flag.level === "rot" ? "text-app-bad font-semibold" : "text-app-warn font-semibold") : "text-app-muted";
    const value =
      kind === "acwr"
        ? row.acwr.changePercent === null ? "–" : `${row.acwr.changePercent > 0 ? "+" : ""}${row.acwr.changePercent} %`
        : kind === "schmerz"
          ? row.painMax === null ? "–" : `${row.painMax}/10`
          : kind === "befinden"
            ? row.readiness === null ? "–" : String(row.readiness)
            : row.attendanceRate === null ? "–" : `${row.attendanceRate} %`;
    return (
      <td key={kind} className={`px-3 py-3 ${tone}`} title={flag?.text}>
        {value}
      </td>
    );
  };

  const flaggedCount = rows.filter((row) => row.flags.length).length;

  if (variant === "summary") {
    /* Inhalt fuer den Dashboard-Bereich "Aufmerksamkeit" (Rahmen liefert das Dashboard) */
    const items = attentionItems(rows);
    const gaps = dataGaps(rows, incomplete);
    const shownItems = items.slice(0, 4);
    return (
      <div>
        {rows.length === 0 ? (
          <p className="text-sm text-app-muted">Noch keine Athleten in diesem Team.</p>
        ) : items.length === 0 ? (
          <p className="text-sm text-app-text">{incomplete.length ? "Keine Hinweise in den geladenen Daten." : "Keine Hinweise."}</p>
        ) : (
          <ul className="space-y-1">
            {shownItems.map((item) => (
              <li key={item.id}>
                <Link href={item.href} className="group flex min-h-14 items-center gap-3 rounded-2xl px-2 py-2 hover:bg-app-accent/10">
                  <span className="relative shrink-0">
                    <Avatar name={item.name} />
                    <span aria-hidden="true" className={`absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full ring-2 ring-app-surface ${item.level === "rot" ? "bg-app-bad" : "bg-app-warn"}`} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[15px] font-bold text-app-heading">
                      {item.name}
                      <span className="sr-only">{item.level === "rot" ? " (dringend)" : " (beachten)"}</span>
                    </span>
                    <span className="block text-[13px] text-app-text">{item.short}</span>
                    <span className="block text-[13px] font-semibold text-app-accent-soft group-hover:underline">{item.linkLabel} →</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
        {items.length > shownItems.length && (
          <Link href="/coach/athleten-check" className="mt-1 inline-flex min-h-11 items-center text-sm font-semibold text-app-accent-soft hover:underline">
            Alle {items.length} Hinweise ansehen →
          </Link>
        )}
        {extra}
        {gaps.length > 0 && (
          <div className="mt-2 border-t border-app-border/70 pt-2">
            <p className="text-[13px] font-semibold text-app-text">Fehlende Daten – keine Entwarnung</p>
            <ul className="mt-1 flex flex-wrap gap-1.5">
              {gaps.map((gap) => (
                <li key={gap} className="rounded-full border border-app-warn/40 bg-app-warn/10 px-2.5 py-1 text-[13px] text-app-text">
                  {gap}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    );
  }

  return (
    <section className="h-full overflow-hidden rounded-[20px] border border-app-border bg-app-surface shadow-app">
      <div className="flex items-center justify-between gap-2 px-5 pt-5">
        <p className="text-sm text-app-muted">
          Athleten-Check <span className={flaggedCount ? "text-app-bad" : "text-app-good"}>· {flaggedCount ? `${flaggedCount} mit Hinweisen` : "keine Auffälligkeiten"}</span>
        </p>
      </div>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-app-border text-left text-xs text-app-muted">
              <th className="px-5 py-2.5 font-medium">Athlet</th>
              <th className="px-3 py-2.5 font-medium" title="Belastung der letzten 7 Tage im Vergleich zum Wochenschnitt der 3 Wochen davor">Belastung ggü. Vorwochen</th>
              <th className="px-3 py-2.5 font-medium">Schmerz</th>
              <th className="px-3 py-2.5 font-medium">Befinden</th>
              <th className="px-3 py-2.5 font-medium">Anwesenheit</th>
              <th className="px-5 py-2.5" />
            </tr>
          </thead>
          <tbody>
            {shown.map((row) => [
              <tr key={row.id} className={row.flags.length ? "" : "border-b border-app-border/60"}>
                <td className="whitespace-nowrap px-5 py-3 font-semibold text-app-heading">
                  {row.flags.length > 0 && (
                    <span className={`mr-2 inline-block h-2 w-2 rounded-full ${row.flags.some((flag) => flag.level === "rot") ? "bg-app-bad" : "bg-app-warn"}`} />
                  )}
                  {row.name}
                </td>
                {(["acwr", "schmerz", "befinden", "anwesenheit"] as Flag["kind"][]).map((kind) => cell(row, kind))}
                <td className="px-5 py-3 text-right">
                  <Link href={flagHref(row.id, row.flags[0])} className="text-sm font-semibold text-app-accent-soft">
                    Öffnen
                  </Link>
                </td>
              </tr>,
              row.flags.length > 0 && (
                <tr key={`${row.id}-flags`} className="border-b border-app-border/60 bg-app-elevated/30">
                  <td colSpan={6} className="px-5 pb-3 pt-1">
                    <ul className="space-y-1.5">
                      {row.flags.map((flag) => (
                        <FlagLine key={flag.kind + flag.text} flag={flag} />
                      ))}
                    </ul>
                  </td>
                </tr>
              ),
            ])}
          </tbody>
        </table>
      </div>
    </section>
  );
}

/*
 * Status eines einzelnen Athleten fuer das Athletenprofil:
 * dieselben Hinweise wie im Athleten-Check, mit Erklaerung.
 */
export function AthleteStatusCard({ swimmerId }: { swimmerId: string }) {
  const [today] = useState(() => toDateKey(new Date()));
  const [entry, setEntry] = useState<{ id: string; row: Row | null | "error"; incomplete: string[] } | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadRowsChecked(today, null, swimmerId)
      .then((loaded) => !cancelled && setEntry({ id: swimmerId, row: loaded.rows[0] ?? null, incomplete: loaded.incomplete }))
      .catch(() => !cancelled && setEntry({ id: swimmerId, row: "error", incomplete: [] }));
    return () => {
      cancelled = true;
    };
  }, [today, swimmerId]);
  const row = entry && entry.id === swimmerId ? entry.row : undefined;

  /* ruhige Zeile statt Kachel: Bezeichnung links, Wert rechts */
  const stat = (label: string, value: string, tone = "text-app-heading") => (
    <div className="flex min-h-11 items-baseline justify-between gap-3 border-b border-app-border/70 py-2">
      <dt className="text-sm text-app-text">{label}</dt>
      <dd className={`num text-right text-[15px] font-semibold ${tone}`}>{value}</dd>
    </div>
  );

  if (row === undefined) {
    return <div className="h-40 animate-pulse rounded-[20px] bg-app-elevated" aria-label="Status wird geladen" />;
  }
  if (row === null) return null;
  if (row === "error") {
    return <p className="rounded-[20px] border border-app-bad/40 bg-app-surface p-4 text-sm text-app-bad">Status konnte nicht geladen werden – Hinweise sind unbekannt.</p>;
  }

  const toneOf = (kind: Flag["kind"]) => {
    const flag = row.flags.find((item) => item.kind === kind);
    return flag ? (flag.level === "rot" ? "text-app-bad" : "text-app-warn") : "text-app-heading";
  };

  return (
    <section aria-label="Aktueller Status" className="rounded-2xl border border-app-border bg-app-surface px-4 py-3.5 sm:px-5 sm:py-4">
      <div className="flex items-center gap-3">
        <h2 className="flex-1 text-[15px] font-bold text-app-heading">Aktueller Status</h2>
        <span className="text-[13px] text-app-muted">letzte 7 Tage</span>
      </div>
      <dl className="mt-2 grid grid-cols-1 gap-x-6 sm:grid-cols-2">
        {stat(
          "Belastung ggü. Vorwochen",
          row.acwr.changePercent === null ? "zu wenig Daten" : `${row.acwr.changePercent > 0 ? "+" : ""}${row.acwr.changePercent} %`,
          toneOf("acwr")
        )}
        {stat("Befinden", row.readiness === null ? (row.hasLogin ? "kein aktueller Check-in" : "ohne Login") : `${row.readiness}/100`, toneOf("befinden"))}
        {stat("Schmerz (3 Tage)", row.painMax === null ? "keiner gemeldet" : `${row.painMax}/10`, toneOf("schmerz"))}
        {stat("Anwesenheit (4 Wochen)", row.attendanceRate === null ? "wenig Daten" : `${row.attendanceRate} %`, toneOf("anwesenheit"))}
      </dl>
      {row.flags.length ? (
        <ul className="mt-4 space-y-2.5">
          {row.flags.map((flag) => (
            <FlagLine key={flag.kind + flag.text} flag={flag} />
          ))}
        </ul>
      ) : (
        <p className="mt-4 text-sm text-app-muted">Keine Auffälligkeiten.</p>
      )}
      {row.acwr.zone === "zu-wenig-daten" && (
        <p className="mt-3 text-xs text-app-faint">
          Belastungsvergleich erst nach 3 Wochen mit RPE-Rückmeldungen oder geplanter Belastung möglich.
          {row.estimated ? " Teilweise aus geplanter Belastung geschätzt." : ""}
        </p>
      )}
    </section>
  );
}
