"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Competition = {
  id: string;
  coach_id: string;
  name: string;
  start_date: string;
  end_date: string | null;
  location: string;
  status: string;
  created_at: string;
};

function formatCompetitionDate(
  startDate: string,
  endDate: string | null
) {
  const start = new Date(
    `${startDate}T00:00:00`
  );

  const startFormatted =
    new Intl.DateTimeFormat(
      "de-DE",
      {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      }
    ).format(start);

  if (!endDate) {
    return startFormatted;
  }

  const end = new Date(
    `${endDate}T00:00:00`
  );

  const sameYear =
    start.getFullYear() ===
    end.getFullYear();

  const sameMonth =
    sameYear &&
    start.getMonth() ===
      end.getMonth();

  if (sameMonth) {
    const startDay =
      new Intl.DateTimeFormat(
        "de-DE",
        {
          day: "2-digit",
        }
      ).format(start);

    const endFormatted =
      new Intl.DateTimeFormat(
        "de-DE",
        {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        }
      ).format(end);

    return `${startDay}–${endFormatted}`;
  }

  return `${startFormatted} – ${new Intl.DateTimeFormat(
    "de-DE",
    {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }
  ).format(end)}`;
}

function getStatusLabel(
  status: string
) {
  switch (status) {
    case "completed":
      return "Abgeschlossen";

    case "cancelled":
      return "Abgesagt";

    case "planned":
    default:
      return "Geplant";
  }
}

function getStatusClasses(
  status: string
) {
  switch (status) {
    case "completed":
      return "border-emerald-800 bg-emerald-950/40 text-emerald-300";

    case "cancelled":
      return "border-red-900 bg-red-950/40 text-red-300";

    case "planned":
    default:
      return "border-sky-800 bg-sky-950/40 text-sky-300";
  }
}

export default function CompetitionsPage() {
  const [
    competitions,
    setCompetitions,
  ] =
    useState<Competition[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  useEffect(() => {
    loadCompetitions();
  }, []);

  async function loadCompetitions() {
    setLoading(true);
    setError("");

    const {
      data,
      error: loadError,
    } =
      await supabase
        .from(
          "competitions"
        )
        .select(
          `
            id,
            coach_id,
            name,
            start_date,
            end_date,
            location,
            status,
            created_at
          `
        )
        .order(
          "start_date",
          {
            ascending: true,
          }
        );

    if (loadError) {
      setError(
        "Wettkämpfe konnten nicht geladen werden."
      );

      setLoading(false);
      return;
    }

    setCompetitions(
      data ?? []
    );

    setLoading(false);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold text-white sm:text-3xl">
          Wettkämpfe
        </h1>

        <Link
          href="/coach/competitions/new"
          className="inline-flex min-h-11 items-center justify-center rounded-xl bg-sky-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-sky-400"
        >
          + Wettkampf anlegen
        </Link>
      </div>

      {error && (
        <div className="rounded-2xl border border-red-900 bg-red-950/30 p-4 text-sm text-red-300">
          {error}
        </div>
      )}

      {loading ? (
        <div className="rounded-2xl border border-app-border bg-app-surface p-5 text-sm text-app-muted">
          Wettkämpfe werden geladen...
        </div>
      ) : competitions.length ===
        0 ? (
        <div className="rounded-2xl border border-app-border bg-app-surface p-6">
          <p className="text-app-muted">
            Noch keine Wettkämpfe
            angelegt.
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {competitions.map(
            (competition) => (
              <Link
                key={
                  competition.id
                }
                href={`/coach/competitions/${competition.id}`}
                className="group block rounded-2xl border border-app-border bg-app-surface p-5 transition hover:border-app-border hover:bg-app-surface/80"
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <h2 className="text-lg font-semibold text-white transition group-hover:text-sky-300">
                      {
                        competition.name
                      }
                    </h2>

                    <div className="mt-3 space-y-1 text-sm text-app-muted">
                      <p>
                        {formatCompetitionDate(
                          competition.start_date,
                          competition.end_date
                        )}
                      </p>

                      <p>
                        {
                          competition.location
                        }
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span
                      className={`w-fit rounded-full border px-3 py-1 text-xs font-semibold ${getStatusClasses(
                        competition.status
                      )}`}
                    >
                      {getStatusLabel(
                        competition.status
                      )}
                    </span>

                    <span className="text-app-faint transition group-hover:text-sky-300">
                      →
                    </span>
                  </div>
                </div>
              </Link>
            )
          )}
        </div>
      )}
    </div>
  );
}