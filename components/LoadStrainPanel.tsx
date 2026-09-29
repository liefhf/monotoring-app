"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import {
  LOAD_STRAIN_CLASS,
  LOAD_STRAIN_LABEL,
  LOAD_STRAIN_THRESHOLD,
  formatDayMonth,
  getLoadStrainStatus,
  sessionLoad,
} from "@/lib/kapitel1";

/*
 * Kapitel 1.1 - Belastung vs. Beanspruchung
 *
 * Belastung      = was der Coach plant (planned_rpe der Einheit)
 * Beanspruchung  = was beim Athleten ankommt (gemeldete RPE)
 *
 * Zwei Ansichten:
 *   athleteId -> alle Einheiten eines Athleten
 *   sessionId -> alle Athleten einer Einheit
 *
 * Die Komponente laedt ihre Daten selbst. Welche Zeilen
 * sichtbar sind, entscheidet RLS in Supabase.
 */

type Props =
  | { athleteId: string; sessionId?: never }
  | { sessionId: string; athleteId?: never };

type Session = {
  id: string;
  title: string;
  session_date: string;
  duration_minutes: number | null;
  planned_rpe: number | null;
};

type Feedback = {
  id: string;
  training_session_id: string;
  athlete_id: string;
  rpe: number | null;
};

type Row = {
  id: string;
  label: string;
  href: string;
  date: string;
  planned: number | null;
  reported: number | null;
  duration: number | null;
};

const ROW_LIMIT = 20;

export default function LoadStrainPanel(props: Props) {
  const [rows, setRows] = useState<Row[]>([]);
  const [plannedOfSession, setPlannedOfSession] =
    useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  const mode = props.sessionId ? "session" : "athlete";
  const targetId = props.sessionId ?? props.athleteId;

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setMessage("");

      const feedbackQuery = supabase
        .from("training_feedback")
        .select("id, training_session_id, athlete_id, rpe");

      const { data: feedbackData, error: feedbackError } =
        mode === "session"
          ? await feedbackQuery.eq(
              "training_session_id",
              targetId
            )
          : await feedbackQuery
              .eq("athlete_id", targetId)
              .order("created_at", { ascending: false })
              .limit(60);

      if (cancelled) return;

      if (feedbackError) {
        setMessage("Rückmeldungen konnten nicht geladen werden.");
        setLoading(false);
        return;
      }

      const feedback = (feedbackData ?? []) as Feedback[];

      const sessionIds =
        mode === "session"
          ? [targetId]
          : [
              ...new Set(
                feedback.map((f) => f.training_session_id)
              ),
            ];

      if (sessionIds.length === 0) {
        setRows([]);
        setLoading(false);
        return;
      }

      const { data: sessionData, error: sessionError } =
        await supabase
          .from("training_sessions")
          .select(
            "id, title, session_date, duration_minutes, planned_rpe"
          )
          .in("id", sessionIds);

      if (cancelled) return;

      if (sessionError) {
        setMessage(
          "Trainingsdaten konnten nicht geladen werden. Wurde das SQL-Skript für Kapitel 1 schon ausgeführt?"
        );
        setLoading(false);
        return;
      }

      const sessions = new Map(
        ((sessionData ?? []) as Session[]).map((s) => [
          s.id,
          s,
        ])
      );

      if (mode === "session") {
        const session = sessions.get(targetId) ?? null;

        setPlannedOfSession(session?.planned_rpe ?? null);

        const athleteIds = [
          ...new Set(feedback.map((f) => f.athlete_id)),
        ];

        const names = new Map<string, string>();

        if (athleteIds.length > 0) {
          const { data: profileData } = await supabase
            .from("profiles")
            .select("id, first_name, last_name")
            .in("id", athleteIds);

          (
            (profileData ?? []) as {
              id: string;
              first_name: string | null;
              last_name: string | null;
            }[]
          ).forEach((p) =>
            names.set(
              p.id,
              [p.first_name, p.last_name]
                .filter(Boolean)
                .join(" ") || "Athlet"
            )
          );
        }

        if (cancelled) return;

        setRows(
          feedback
            .map((f) => ({
              id: f.id,
              label: names.get(f.athlete_id) ?? "Athlet",
              href: `/coach/athletes/${f.athlete_id}`,
              date: session?.session_date ?? "",
              planned: session?.planned_rpe ?? null,
              reported: f.rpe,
              duration: session?.duration_minutes ?? null,
            }))
            .sort(
              (a, b) =>
                (b.reported ?? 0) - (a.reported ?? 0)
            )
        );
      } else {
        setRows(
          feedback
            .map((f) => {
              const session = sessions.get(
                f.training_session_id
              );

              return {
                id: f.id,
                label: session?.title ?? "Einheit",
                href: `/coach/training/session/${f.training_session_id}`,
                date: session?.session_date ?? "",
                planned: session?.planned_rpe ?? null,
                reported: f.rpe,
                duration:
                  session?.duration_minutes ?? null,
              };
            })
            .sort((a, b) => b.date.localeCompare(a.date))
            .slice(0, ROW_LIMIT)
        );
      }

      setLoading(false);
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [mode, targetId]);

  const summary = useMemo(() => {
    const compared = rows.filter(
      (r) => r.planned !== null && r.reported !== null
    );

    if (compared.length === 0) {
      return null;
    }

    const diffs = compared.map(
      (r) => (r.reported as number) - (r.planned as number)
    );

    const avgDiff =
      diffs.reduce((sum, d) => sum + d, 0) / diffs.length;

    const matches = compared.filter(
      (r) =>
        getLoadStrainStatus(r.planned, r.reported) ===
        "match"
    ).length;

    const harder = compared.filter(
      (r) =>
        getLoadStrainStatus(r.planned, r.reported) ===
        "harder"
    ).length;

    return {
      count: compared.length,
      avgDiff,
      matchRate: Math.round(
        (matches / compared.length) * 100
      ),
      harder,
    };
  }, [rows]);

  return (
    <section className="mt-5 overflow-hidden rounded-3xl border border-app-border bg-app-surface shadow-app">
      <div className="flex flex-col gap-1 border-b border-app-border px-4 py-3 sm:px-5">
        <h2 className="font-semibold text-app-heading">
          Belastung vs. Beanspruchung
        </h2>

        <p className="text-xs text-app-faint">
          Geplante RPE (Coach) neben gemeldeter RPE
          (Athlet). Markiert ab ±{LOAD_STRAIN_THRESHOLD}{" "}
          Punkten Abweichung. Last = RPE × Minuten (AU).
        </p>
      </div>

      {loading ? (
        <p className="px-4 py-4 text-sm text-app-muted sm:px-5">
          Wird geladen...
        </p>
      ) : message ? (
        <p className="px-4 py-4 text-sm text-app-bad sm:px-5">
          {message}
        </p>
      ) : rows.length === 0 ? (
        <p className="px-4 py-4 text-sm text-app-faint sm:px-5">
          Noch keine Rückmeldungen vorhanden.
        </p>
      ) : (
        <>
          {mode === "session" &&
            plannedOfSession === null && (
              <p className="border-b border-app-border bg-app-warn/5 px-4 py-2 text-xs text-app-warn sm:px-5">
                Für diese Einheit ist keine geplante RPE
                hinterlegt – im Trainingseditor ergänzen.
              </p>
            )}

          {summary && (
            <div className="grid grid-cols-3 gap-px border-b border-app-border bg-app-border text-center">
              <div className="bg-app-surface px-3 py-2">
                <p className="text-[11px] text-app-faint">
                  Ø Abweichung
                </p>
                <p className="text-sm font-semibold text-app-heading">
                  {summary.avgDiff > 0 ? "+" : ""}
                  {summary.avgDiff.toLocaleString("de-DE", {
                    maximumFractionDigits: 1,
                  })}
                </p>
              </div>

              <div className="bg-app-surface px-3 py-2">
                <p className="text-[11px] text-app-faint">
                  wie geplant
                </p>
                <p className="text-sm font-semibold text-app-heading">
                  {summary.matchRate} %
                </p>
              </div>

              <div className="bg-app-surface px-3 py-2">
                <p className="text-[11px] text-app-faint">
                  härter als geplant
                </p>
                <p
                  className={`text-sm font-semibold ${
                    summary.harder > 0
                      ? "text-app-bad"
                      : "text-app-heading"
                  }`}
                >
                  {summary.harder} / {summary.count}
                </p>
              </div>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-sm">
              <thead>
                <tr className="text-left text-[11px] text-app-faint">
                  <th className="px-4 py-2 font-medium sm:px-5">
                    {mode === "session" ? "Athlet" : "Einheit"}
                  </th>
                  <th className="px-2 py-2 text-right font-medium">
                    geplant
                  </th>
                  <th className="px-2 py-2 text-right font-medium">
                    gemeldet
                  </th>
                  <th className="px-2 py-2 text-right font-medium">
                    Last plan / ist
                  </th>
                  <th className="px-4 py-2 font-medium sm:px-5">
                    Bewertung
                  </th>
                </tr>
              </thead>

              <tbody>
                {rows.map((row) => {
                  const status = getLoadStrainStatus(
                    row.planned,
                    row.reported
                  );
                  const plannedLoad = sessionLoad(
                    row.planned,
                    row.duration
                  );
                  const actualLoad = sessionLoad(
                    row.reported,
                    row.duration
                  );

                  return (
                    <tr
                      key={row.id}
                      className="border-t border-app-border"
                    >
                      <td className="px-4 py-2 sm:px-5">
                        <Link
                          href={row.href}
                          className="text-app-text hover:text-app-heading"
                        >
                          {mode === "athlete" && row.date && (
                            <span className="mr-2 text-xs text-app-faint">
                              {formatDayMonth(row.date)}
                            </span>
                          )}
                          {row.label}
                        </Link>
                      </td>
                      <td className="px-2 py-2 text-right text-app-muted">
                        {row.planned ?? "–"}
                      </td>
                      <td className="px-2 py-2 text-right font-semibold text-app-heading">
                        {row.reported ?? "–"}
                      </td>
                      <td className="px-2 py-2 text-right text-xs text-app-muted">
                        {plannedLoad ?? "–"} /{" "}
                        {actualLoad ?? "–"}
                      </td>
                      <td className="px-4 py-2 sm:px-5">
                        <span
                          className={`inline-block rounded-full border px-2 py-0.5 text-[11px] ${LOAD_STRAIN_CLASS[status]}`}
                        >
                          {LOAD_STRAIN_LABEL[status]}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  );
}
