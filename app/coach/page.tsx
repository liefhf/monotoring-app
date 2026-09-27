"use client";

import Link from "next/link";
import {
  useEffect,
  useMemo,
  useState,
} from "react";
import { supabase } from "@/lib/supabase";
import {
  LatestNews,
  QuickTiles,
  Tile,
  UpcomingEntries,
} from "@/components/DashboardWidgets";

/* Kacheln im Schnellzugriff - die haeufigsten Wege */
const COACH_TILES: Tile[] = [
  { href: "/coach/kalender", label: "Kalender", icon: "calendar" },
  { href: "/coach/training", label: "Training", icon: "training" },
  { href: "/coach/schwimmer", label: "Schwimmer", icon: "swimmer" },
  { href: "/coach/pflichtzeiten", label: "Pflichtzeiten", icon: "stopwatch" },
  { href: "/coach/news", label: "News-Wall", icon: "news" },
  { href: "/coach/gruppen", label: "Gruppenräume", icon: "chat" },
  { href: "/coach/competitions", label: "Wettkämpfe", icon: "trophy" },
  { href: "/coach/analytics", label: "Analysen", icon: "chart" },
];

type Team = {
  id: string;
  name: string;
};

type TeamMember = {
  team_id: string;
  athlete_id: string;
};

type AthleteProfile = {
  id: string;
  first_name: string | null;
  last_name: string | null;
};

type BefindenEntry = {
  id: string;
  athlete_id: string;
  entry_date: string;
  sleep_quality: number;
  energy: number;
  muscle_feeling: number;
  stress: number;
  mood: number;
  created_at: string;
};

type TrainingSession = {
  id: string;
  team_id: string;
  title: string;
  session_date: string;
  start_time: string | null;
  training_type: "water" | "land";
  duration_minutes: number | null;
};

type DashboardAthlete = {
  id: string;
  name: string;
  teamNames: string[];
  score: number | null;
  status:
    | "Gut"
    | "Beobachten"
    | "Auffällig"
    | "Keine Daten";
  lastEntry: string;
};

type DashboardTeam = {
  id: string;
  name: string;
  athleteCount: number;
  nextTraining: string;
};

function getLocalDateString(date: Date) {
  const year = date.getFullYear();

  const month = String(
    date.getMonth() + 1
  ).padStart(2, "0");

  const day = String(
    date.getDate()
  ).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export default function CoachPage() {
  const [teams, setTeams] =
    useState<Team[]>([]);

  const [memberships, setMemberships] =
    useState<TeamMember[]>([]);

  const [profiles, setProfiles] =
    useState<AthleteProfile[]>([]);

  const [befindenEntries, setBefindenEntries] =
    useState<BefindenEntry[]>([]);

  const [trainings, setTrainings] =
    useState<TrainingSession[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [message, setMessage] =
    useState("");

  useEffect(() => {
    loadDashboard();
  }, []);

  async function loadDashboard() {
    setLoading(true);
    setMessage("");

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setMessage(
        "Coach konnte nicht geladen werden."
      );

      setLoading(false);
      return;
    }

    const {
      data: teamData,
      error: teamError,
    } = await supabase
      .from("teams")
      .select("id, name")
      .eq("coach_id", user.id)
      .order("name");

    if (teamError) {
      setMessage(
        `Teams konnten nicht geladen werden: ${teamError.message}`
      );

      setLoading(false);
      return;
    }

    const loadedTeams =
      (teamData ?? []) as Team[];

    setTeams(loadedTeams);

    if (loadedTeams.length === 0) {
      setMemberships([]);
      setProfiles([]);
      setBefindenEntries([]);

      const {
        data: trainingData,
        error: trainingError,
      } = await supabase
        .from("training_sessions")
        .select(
          `
            id,
            team_id,
            title,
            session_date,
            start_time,
            training_type,
            duration_minutes
          `
        )
        .eq("coach_id", user.id)
        .gte(
          "session_date",
          getLocalDateString(
            new Date()
          )
        )
        .order("session_date", {
          ascending: true,
        })
        .order("start_time", {
          ascending: true,
        });

      if (trainingError) {
        setMessage(
          `Trainings konnten nicht geladen werden: ${trainingError.message}`
        );
      } else {
        setTrainings(
          (trainingData ??
            []) as TrainingSession[]
        );
      }

      setLoading(false);
      return;
    }

    const teamIds =
      loadedTeams.map(
        (team) => team.id
      );

    const {
      data: membershipData,
      error: membershipError,
    } = await supabase
      .from("team_members")
      .select(
        `
          team_id,
          athlete_id
        `
      )
      .in("team_id", teamIds);

    if (membershipError) {
      setMessage(
        `Teamzuordnungen konnten nicht geladen werden: ${membershipError.message}`
      );

      setLoading(false);
      return;
    }

    const loadedMemberships =
      (membershipData ??
        []) as TeamMember[];

    setMemberships(
      loadedMemberships
    );

    const athleteIds = [
      ...new Set(
        loadedMemberships.map(
          (membership) =>
            membership.athlete_id
        )
      ),
    ];

    if (athleteIds.length > 0) {
      const {
        data: profileData,
        error: profileError,
      } = await supabase
        .from("profiles")
        .select(
          `
            id,
            first_name,
            last_name
          `
        )
        .eq("role", "athlete")
        .in("id", athleteIds);

      if (profileError) {
        setMessage(
          `Athleten konnten nicht geladen werden: ${profileError.message}`
        );

        setLoading(false);
        return;
      }

      setProfiles(
        (profileData ??
          []) as AthleteProfile[]
      );

      const {
        data: befindenData,
        error: befindenError,
      } = await supabase
        .from("befinden_entries")
        .select(
          `
            id,
            athlete_id,
            entry_date,
            sleep_quality,
            energy,
            muscle_feeling,
            stress,
            mood,
            created_at
          `
        )
        .in(
          "athlete_id",
          athleteIds
        )
        .order("entry_date", {
          ascending: false,
        })
        .order("created_at", {
          ascending: false,
        });

      if (befindenError) {
        setMessage(
          `Befinden konnte nicht geladen werden: ${befindenError.message}`
        );

        setLoading(false);
        return;
      }

      setBefindenEntries(
        (befindenData ??
          []) as BefindenEntry[]
      );
    } else {
      setProfiles([]);
      setBefindenEntries([]);
    }

    const today =
      getLocalDateString(
        new Date()
      );

    const {
      data: trainingData,
      error: trainingError,
    } = await supabase
      .from("training_sessions")
      .select(
        `
          id,
          team_id,
          title,
          session_date,
          start_time,
          training_type,
          duration_minutes
        `
      )
      .eq("coach_id", user.id)
      .gte(
        "session_date",
        today
      )
      .order("session_date", {
        ascending: true,
      })
      .order("start_time", {
        ascending: true,
      });

    if (trainingError) {
      setMessage(
        `Trainings konnten nicht geladen werden: ${trainingError.message}`
      );

      setLoading(false);
      return;
    }

    setTrainings(
      (trainingData ??
        []) as TrainingSession[]
    );

    setLoading(false);
  }

  const today =
    getLocalDateString(
      new Date()
    );

  function calculateScore(
    entry: BefindenEntry
  ) {
    return (
      entry.sleep_quality +
      entry.energy +
      entry.muscle_feeling +
      entry.stress +
      entry.mood
    ) / 5;
  }

  function getStatus(
    score: number | null
  ): DashboardAthlete["status"] {
    if (score === null) {
      return "Keine Daten";
    }

    if (score >= 8) {
      return "Gut";
    }

    if (score >= 6) {
      return "Beobachten";
    }

    return "Auffällig";
  }

  /*
   * Farbe steht hier fuer einen Zustand, nicht fuer Deko.
   * Die Farbwerte selbst stehen in app/globals.css.
   */
  function statusText(
    status: DashboardAthlete["status"]
  ) {
    if (status === "Gut") return "text-app-good";
    if (status === "Beobachten") return "text-app-warn";
    if (status === "Auffällig") return "text-app-bad";
    return "text-app-faint";
  }

  function statusBar(
    status: DashboardAthlete["status"]
  ) {
    if (status === "Gut") return "bg-app-good";
    if (status === "Beobachten") return "bg-app-warn";
    if (status === "Auffällig") return "bg-app-bad";
    return "bg-app-elevated";
  }


  function getTeamName(
    teamId: string
  ) {
    return (
      teams.find(
        (team) =>
          team.id === teamId
      )?.name ?? "Unbekanntes Team"
    );
  }

  function formatLastEntry(
    entry: BefindenEntry | null
  ) {
    if (!entry) {
      return "Noch kein Eintrag";
    }

    const createdDate =
      new Date(entry.created_at);

    const time =
      createdDate.toLocaleTimeString(
        "de-DE",
        {
          hour: "2-digit",
          minute: "2-digit",
        }
      );

    if (
      entry.entry_date === today
    ) {
      return `Heute, ${time}`;
    }

    const yesterday =
      new Date();

    yesterday.setDate(
      yesterday.getDate() - 1
    );

    if (
      entry.entry_date ===
      getLocalDateString(yesterday)
    ) {
      return `Gestern, ${time}`;
    }

    const formattedDate =
      new Date(
        `${entry.entry_date}T12:00:00`
      ).toLocaleDateString(
        "de-DE"
      );

    return `${formattedDate}, ${time}`;
  }

  const dashboardAthletes =
    useMemo<DashboardAthlete[]>(() => {
      return profiles.map(
        (profile) => {
          const athleteMemberships =
            memberships.filter(
              (membership) =>
                membership.athlete_id ===
                profile.id
            );

          const teamNames =
            athleteMemberships
              .map(
                (membership) =>
                  teams.find(
                    (team) =>
                      team.id ===
                      membership.team_id
                  )?.name
              )
              .filter(
                (
                  teamName
                ): teamName is string =>
                  Boolean(teamName)
              );

          const latestEntry =
            befindenEntries.find(
              (entry) =>
                entry.athlete_id ===
                profile.id
            ) ?? null;

          const score =
            latestEntry
              ? calculateScore(
                  latestEntry
                )
              : null;

          const fullName = [
            profile.first_name,
            profile.last_name,
          ]
            .filter(Boolean)
            .join(" ");

          return {
            id: profile.id,
            name:
              fullName ||
              "Athlet",
            teamNames,
            score,
            status:
              getStatus(score),
            lastEntry:
              formatLastEntry(
                latestEntry
              ),
          };
        }
      );
    }, [
      profiles,
      memberships,
      teams,
      befindenEntries,
      today,
    ]);

  const todayBefinden =
    useMemo(() => {
      return befindenEntries.filter(
        (entry) =>
          entry.entry_date ===
          today
      );
    }, [
      befindenEntries,
      today,
    ]);

  const averageToday =
    useMemo(() => {
      if (
        todayBefinden.length === 0
      ) {
        return null;
      }

      const total =
        todayBefinden.reduce(
          (sum, entry) =>
            sum +
            calculateScore(entry),
          0
        );

      return (
        total /
        todayBefinden.length
      );
    }, [todayBefinden]);

  const warningAthletes =
    dashboardAthletes.filter(
      (athlete) =>
        athlete.status ===
          "Beobachten" ||
        athlete.status ===
          "Auffällig"
    );

  const todayTrainings =
    useMemo(() => {
      return trainings.filter(
        (training) =>
          training.session_date ===
          today
      );
    }, [trainings, today]);

  const dashboardTeams =
    useMemo<DashboardTeam[]>(() => {
      return teams.map((team) => {
        const athleteIdsInTeam = [
          ...new Set(
            memberships
              .filter(
                (membership) =>
                  membership.team_id ===
                  team.id
              )
              .map(
                (membership) =>
                  membership.athlete_id
              )
          ),
        ];

        const nextTraining =
          trainings.find(
            (training) =>
              training.team_id ===
              team.id
          );

        let nextTrainingText =
          "Kein Training geplant";

        if (nextTraining) {
          const time =
            nextTraining.start_time
              ? nextTraining.start_time.slice(
                  0,
                  5
                )
              : "—";

          if (
            nextTraining.session_date ===
            today
          ) {
            nextTrainingText =
              `Heute · ${time}`;
          } else {
            const tomorrow =
              new Date();

            tomorrow.setDate(
              tomorrow.getDate() + 1
            );

            if (
              nextTraining.session_date ===
              getLocalDateString(
                tomorrow
              )
            ) {
              nextTrainingText =
                `Morgen · ${time}`;
            } else {
              const formattedDate =
                new Date(
                  `${nextTraining.session_date}T12:00:00`
                ).toLocaleDateString(
                  "de-DE"
                );

              nextTrainingText =
                `${formattedDate} · ${time}`;
            }
          }
        }

        return {
          id: team.id,
          name: team.name,
          athleteCount:
            athleteIdsInTeam.length,
          nextTraining:
            nextTrainingText,
        };
      });
    }, [
      teams,
      memberships,
      trainings,
      today,
    ]);

  const visibleAthletes =
    dashboardAthletes.slice(
      0,
      6
    );

  const todayLabel =
    new Date().toLocaleDateString(
      "de-DE",
      {
        weekday: "long",
        day: "numeric",
        month: "long",
      }
    );

  function formatScore(value: number) {
    return value
      .toFixed(1)
      .replace(".", ",");
  }

  return (
    <div className="mx-auto w-full max-w-[1600px]">
      {/* Kopf */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-app-heading">
            Dashboard
          </h1>

          <p className="mt-0.5 text-sm text-app-muted">
            {todayLabel}
          </p>
        </div>

        <Link
          href="/coach/training/new"
          className="rounded-lg bg-app-accent px-4 py-2.5 text-sm font-semibold text-app-accent-ink transition hover:brightness-110"
        >
          + Training erstellen
        </Link>
      </div>

      {/* Schnellzugriff und was als Naechstes ansteht */}
      <section className="mt-6">
        <QuickTiles tiles={COACH_TILES} />
      </section>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <UpcomingEntries href="/coach/kalender" />
        <LatestNews href="/coach/news" />
      </div>

      {message && (
        <div className="mt-5 rounded-lg border border-app-bad/40 bg-app-bad/10 px-4 py-3 text-sm text-app-bad">
          {message}
        </div>
      )}

      {loading ? (
        <div className="mt-6 rounded-xl border border-app-border bg-app-surface p-8 text-center text-sm text-app-muted">
          Dashboard wird geladen...
        </div>
      ) : (
        <>
          {/*
            Kennzahlen: eine Flaeche mit Haarlinien statt
            vier einzelner Karten - liest sich als ein Objekt.
          */}
          <section className="mt-6 grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-app-border bg-app-border sm:grid-cols-4">
            <div className="bg-app-surface px-4 py-3.5">
              <p className="text-[11px] font-medium uppercase tracking-wider text-app-muted">
                Befinden heute
              </p>

              <p className="mt-1.5 text-2xl font-semibold text-app-heading">
                {averageToday !== null
                  ? formatScore(averageToday)
                  : "—"}
              </p>

              <p className="mt-0.5 text-xs text-app-faint">
                {todayBefinden.length} von{" "}
                {dashboardAthletes.length} Athleten
              </p>
            </div>

            <div className="bg-app-surface px-4 py-3.5">
              <p className="text-[11px] font-medium uppercase tracking-wider text-app-muted">
                Warnungen
              </p>

              <p
                className={`mt-1.5 text-2xl font-semibold ${
                  warningAthletes.length > 0
                    ? "text-app-warn"
                    : "text-app-heading"
                }`}
              >
                {warningAthletes.length}
              </p>

              <p className="mt-0.5 text-xs text-app-faint">
                Athleten beobachten
              </p>
            </div>

            <div className="bg-app-surface px-4 py-3.5">
              <p className="text-[11px] font-medium uppercase tracking-wider text-app-muted">
                Trainings heute
              </p>

              <p className="mt-1.5 text-2xl font-semibold text-app-heading">
                {todayTrainings.length}
              </p>

              <p className="mt-0.5 text-xs text-app-faint">
                Geplante Einheiten
              </p>
            </div>

            <div className="bg-app-surface px-4 py-3.5">
              <p className="text-[11px] font-medium uppercase tracking-wider text-app-muted">
                Athleten
              </p>

              <p className="mt-1.5 text-2xl font-semibold text-app-heading">
                {dashboardAthletes.length}
              </p>

              <p className="mt-0.5 text-xs text-app-faint">
                In deinen Teams
              </p>
            </div>
          </section>

          {/* Athletenliste */}
          <section className="mt-5 overflow-hidden rounded-xl border border-app-border bg-app-surface">
            <div className="flex items-center justify-between gap-4 border-b border-app-border px-4 py-3">
              <h2 className="text-sm font-semibold text-app-heading">
                Athleten im Blick
              </h2>

              <Link
                href="/coach/athletes"
                className="text-xs text-app-muted transition hover:text-app-heading"
              >
                Alle Athleten →
              </Link>
            </div>

            {visibleAthletes.length === 0 ? (
              <div className="px-4 py-10 text-center text-sm text-app-faint">
                Noch keine Athleten in deinen Teams.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[720px] text-left">
                  <thead>
                    <tr className="border-b border-app-border text-[11px] uppercase tracking-wider text-app-faint">
                      <th className="px-4 py-2.5 font-medium">
                        Athlet
                      </th>

                      <th className="px-4 py-2.5 font-medium">
                        Team
                      </th>

                      <th className="px-4 py-2.5 font-medium">
                        Befinden
                      </th>

                      <th className="px-4 py-2.5 font-medium">
                        Status
                      </th>

                      <th className="px-4 py-2.5 font-medium">
                        Letzter Eintrag
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-app-border">
                    {visibleAthletes.map(
                      (athlete) => (
                        <tr
                          key={athlete.id}
                          className="transition hover:bg-app-elevated/40"
                        >
                          <td className="px-4 py-2.5">
                            <Link
                              href={`/coach/athletes/${athlete.id}`}
                              className="text-sm font-medium text-app-heading hover:underline"
                            >
                              {athlete.name}
                            </Link>
                          </td>

                          <td className="px-4 py-2.5 text-sm text-app-muted">
                            {athlete.teamNames.length > 0
                              ? athlete.teamNames.join(", ")
                              : "—"}
                          </td>

                          <td className="px-4 py-2.5">
                            {athlete.score !== null ? (
                              <div className="flex items-center gap-2.5">
                                <span className="w-7 text-sm font-semibold text-app-heading">
                                  {formatScore(athlete.score)}
                                </span>

                                {/*
                                  Balken statt nur Zahl - beim
                                  Ueberfliegen erkennt man Ausreisser
                                  schneller als beim Lesen.
                                */}
                                <span className="block h-1.5 w-16 overflow-hidden rounded-full bg-app-elevated">
                                  <span
                                    className={`block h-full rounded-full ${statusBar(
                                      athlete.status
                                    )}`}
                                    style={{
                                      width: `${Math.min(
                                        100,
                                        athlete.score * 10
                                      )}%`,
                                    }}
                                  />
                                </span>
                              </div>
                            ) : (
                              <span className="text-sm text-app-faint">
                                —
                              </span>
                            )}
                          </td>

                          <td className="px-4 py-2.5">
                            <span className="inline-flex items-center gap-2">
                              <span
                                className={`h-1.5 w-1.5 shrink-0 rounded-full ${statusBar(
                                  athlete.status
                                )}`}
                              />

                              <span
                                className={`text-sm ${statusText(
                                  athlete.status
                                )}`}
                              >
                                {athlete.status}
                              </span>
                            </span>
                          </td>

                          <td className="px-4 py-2.5 text-sm text-app-muted">
                            {athlete.lastEntry}
                          </td>
                        </tr>
                      )
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <div className="mt-5 grid gap-5 xl:grid-cols-2">
            {/* Teams */}
            <section className="overflow-hidden rounded-xl border border-app-border bg-app-surface">
              <div className="flex items-center justify-between gap-4 border-b border-app-border px-4 py-3">
                <h2 className="text-sm font-semibold text-app-heading">
                  Meine Teams
                </h2>

                <Link
                  href="/coach/teams"
                  className="text-xs text-app-muted transition hover:text-app-heading"
                >
                  Alle Teams →
                </Link>
              </div>

              {dashboardTeams.length === 0 ? (
                <div className="px-4 py-10 text-center text-sm text-app-faint">
                  Noch keine Teams vorhanden.
                </div>
              ) : (
                <ul className="divide-y divide-app-border">
                  {dashboardTeams.map(
                    (team) => (
                      <li
                        key={team.id}
                        className="flex items-center justify-between gap-4 px-4 py-3"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-app-heading">
                            {team.name}
                          </p>

                          <p className="mt-0.5 text-xs text-app-faint">
                            {team.athleteCount}{" "}
                            {team.athleteCount === 1
                              ? "Athlet"
                              : "Athleten"}
                          </p>
                        </div>

                        <div className="shrink-0 text-right">
                          <p className="text-[11px] uppercase tracking-wider text-app-faint">
                            Nächstes Training
                          </p>

                          <p className="mt-0.5 text-sm text-app-text">
                            {team.nextTraining}
                          </p>
                        </div>
                      </li>
                    )
                  )}
                </ul>
              )}
            </section>

            {/* Training heute */}
            <section className="overflow-hidden rounded-xl border border-app-border bg-app-surface">
              <div className="flex items-center justify-between gap-4 border-b border-app-border px-4 py-3">
                <h2 className="text-sm font-semibold text-app-heading">
                  Training heute
                </h2>

                <Link
                  href="/coach/training"
                  className="text-xs text-app-muted transition hover:text-app-heading"
                >
                  Trainingsplanung →
                </Link>
              </div>

              {todayTrainings.length === 0 ? (
                <div className="px-4 py-10 text-center text-sm text-app-faint">
                  Für heute ist kein Training geplant.
                </div>
              ) : (
                <ul className="divide-y divide-app-border">
                  {todayTrainings.map(
                    (training) => (
                      <li key={training.id}>
                        <Link
                          href={`/coach/training/new?session=${training.id}`}
                          className="flex items-center gap-4 px-4 py-3 transition hover:bg-app-elevated/40"
                        >
                          <span className="w-12 shrink-0 text-sm font-semibold text-app-heading">
                            {training.start_time
                              ? training.start_time.slice(0, 5)
                              : "—"}
                          </span>

                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-medium text-app-heading">
                              {training.title}
                            </span>

                            <span className="mt-0.5 block truncate text-xs text-app-faint">
                              {getTeamName(training.team_id)}
                              {training.duration_minutes !== null &&
                                ` · ${training.duration_minutes} min`}
                            </span>
                          </span>

                          <span
                            className={`shrink-0 rounded px-2 py-0.5 text-[11px] font-medium ${
                              training.training_type === "water"
                                ? "bg-app-accent/15 text-app-accent"
                                : "bg-app-good/15 text-app-good"
                            }`}
                          >
                            {training.training_type === "water"
                              ? "Wasser"
                              : "Land"}
                          </span>
                        </Link>
                      </li>
                    )
                  )}
                </ul>
              )}
            </section>
          </div>
        </>
      )}
    </div>
  );
}