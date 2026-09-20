"use client";

import Link from "next/link";
import {
  useEffect,
  useMemo,
  useState,
} from "react";
import { supabase } from "@/lib/supabase";

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

  const navigation = [
    {
      name: "Dashboard",
      href: "/coach",
    },
    {
      name: "Teams",
      href: "/coach/teams",
    },
    {
      name: "Athleten",
      href: "/coach/athletes",
    },
    {
      name: "Schwimmerabfrage",
      href: "/coach/swimmerabfrage",
    },
    {
      name: "Training",
      href: "/coach/training",
    },
    {
      name: "Auswertungen",
      href: "/coach/analytics",
    },
    {
      name: "Einstellungen",
      href: "/coach/settings",
    },
  ];

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

  function getStatusStyle(
    status: DashboardAthlete["status"]
  ) {
    if (status === "Gut") {
      return "bg-emerald-950 text-emerald-300";
    }

    if (
      status === "Beobachten"
    ) {
      return "bg-amber-950 text-amber-300";
    }

    if (
      status === "Auffällig"
    ) {
      return "bg-red-950 text-red-300";
    }

    return "bg-slate-800 text-slate-300";
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

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="flex min-h-screen">
        <aside className="hidden w-64 shrink-0 border-r border-slate-800 bg-slate-900 lg:flex lg:flex-col">
          <div className="border-b border-slate-800 px-6 py-6">
            <h2 className="text-xl font-bold">
              Monitoring App
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Coach Bereich
            </p>
          </div>

          <nav className="flex-1 space-y-2 p-4">
            {navigation.map(
              (item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`block rounded-xl px-4 py-3 text-sm transition ${
                    item.name ===
                    "Dashboard"
                      ? "bg-white font-medium text-slate-950"
                      : "text-slate-300 hover:bg-slate-800 hover:text-white"
                  }`}
                >
                  {item.name}
                </Link>
              )
            )}
          </nav>
        </aside>

        <div className="min-w-0 flex-1">
          <div className="mx-auto max-w-[1600px] px-6 py-8">
            <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-sm text-slate-400">
                  Coach Bereich
                </p>

                <h1 className="mt-1 text-3xl font-bold">
                  Dashboard
                </h1>

                <p className="mt-2 text-slate-400">
                  Überblick über Athleten, Teams, Befinden und Training.
                </p>
              </div>

              <Link
                href="/coach/training/new"
                className="rounded-xl bg-white px-5 py-3 text-center text-sm font-medium text-slate-950 transition hover:bg-slate-200"
              >
                + Training erstellen
              </Link>
            </div>

            {message && (
              <div className="mt-6 rounded-xl border border-red-900 bg-red-950/30 p-4 text-sm text-red-300">
                {message}
              </div>
            )}

            {loading ? (
              <div className="mt-8 rounded-2xl border border-slate-800 bg-slate-900 p-8 text-center text-sm text-slate-400">
                Dashboard wird geladen...
              </div>
            ) : (
              <>
                <section className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
                    <p className="text-sm text-slate-400">
                      Befinden heute
                    </p>

                    <p className="mt-2 text-3xl font-bold">
                      {averageToday !== null
                        ? averageToday
                            .toFixed(1)
                            .replace(
                              ".",
                              ","
                            )
                        : "—"}
                    </p>

                    <p className="mt-2 text-sm text-slate-500">
                      {todayBefinden.length} von{" "}
                      {
                        dashboardAthletes.length
                      }{" "}
                      Athleten
                    </p>
                  </div>

                  <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
                    <p className="text-sm text-slate-400">
                      Warnungen
                    </p>

                    <p className="mt-2 text-3xl font-bold">
                      {
                        warningAthletes.length
                      }
                    </p>

                    <p className="mt-2 text-sm text-slate-500">
                      Athleten beobachten
                    </p>
                  </div>

                  <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
                    <p className="text-sm text-slate-400">
                      Trainings heute
                    </p>

                    <p className="mt-2 text-3xl font-bold">
                      {
                        todayTrainings.length
                      }
                    </p>

                    <p className="mt-2 text-sm text-slate-500">
                      Geplante Einheiten
                    </p>
                  </div>

                  <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
                    <p className="text-sm text-slate-400">
                      Athleten
                    </p>

                    <p className="mt-2 text-3xl font-bold">
                      {
                        dashboardAthletes.length
                      }
                    </p>

                    <p className="mt-2 text-sm text-slate-500">
                      In deinen Teams
                    </p>
                  </div>
                </section>

                <section className="mt-6 overflow-hidden rounded-2xl border border-slate-800 bg-slate-900">
                  <div className="flex items-center justify-between border-b border-slate-800 p-5">
                    <div>
                      <h2 className="text-xl font-semibold">
                        Athleten im Blick
                      </h2>

                      <p className="mt-1 text-sm text-slate-400">
                        Aktueller Befinden-Status
                      </p>
                    </div>

                    <Link
                      href="/coach/athletes"
                      className="text-sm text-slate-300 hover:text-white"
                    >
                      Alle Athleten →
                    </Link>
                  </div>

                  {visibleAthletes.length === 0 ? (
                    <div className="p-8 text-center text-sm text-slate-500">
                      Noch keine Athleten in deinen Teams.
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[800px] text-left">
                        <thead className="border-b border-slate-800 text-xs text-slate-500">
                          <tr>
                            <th className="px-5 py-4 font-medium">
                              Athlet
                            </th>

                            <th className="px-5 py-4 font-medium">
                              Team
                            </th>

                            <th className="px-5 py-4 font-medium">
                              Befinden
                            </th>

                            <th className="px-5 py-4 font-medium">
                              Status
                            </th>

                            <th className="px-5 py-4 font-medium">
                              Letzter Eintrag
                            </th>
                          </tr>
                        </thead>

                        <tbody>
                          {visibleAthletes.map(
                            (athlete) => (
                              <tr
                                key={
                                  athlete.id
                                }
                                className="border-b border-slate-800 last:border-b-0"
                              >
                                <td className="px-5 py-4">
                                  <Link
                                    href={`/coach/athletes/${athlete.id}`}
                                    className="font-medium hover:underline"
                                  >
                                    {
                                      athlete.name
                                    }
                                  </Link>
                                </td>

                                <td className="px-5 py-4 text-sm text-slate-400">
                                  {athlete
                                    .teamNames
                                    .length > 0
                                    ? athlete.teamNames.join(
                                        ", "
                                      )
                                    : "—"}
                                </td>

                                <td className="px-5 py-4">
                                  {athlete.score !== null ? (
                                    <>
                                      <span className="font-semibold">
                                        {athlete.score
                                          .toFixed(1)
                                          .replace(
                                            ".",
                                            ","
                                          )}
                                      </span>

                                      <span className="text-slate-500">
                                        {" "}
                                        / 10
                                      </span>
                                    </>
                                  ) : (
                                    <span className="text-slate-500">
                                      —
                                    </span>
                                  )}
                                </td>

                                <td className="px-5 py-4">
                                  <span
                                    className={`rounded-full px-3 py-1 text-xs ${getStatusStyle(
                                      athlete.status
                                    )}`}
                                  >
                                    {
                                      athlete.status
                                    }
                                  </span>
                                </td>

                                <td className="px-5 py-4 text-sm text-slate-400">
                                  {
                                    athlete.lastEntry
                                  }
                                </td>
                              </tr>
                            )
                          )}
                        </tbody>
                      </table>
                    </div>
                  )}
                </section>

                <div className="mt-6 grid gap-6 xl:grid-cols-2">
                  <section className="rounded-2xl border border-slate-800 bg-slate-900">
                    <div className="flex items-center justify-between border-b border-slate-800 p-5">
                      <div>
                        <h2 className="text-xl font-semibold">
                          Meine Teams
                        </h2>

                        <p className="mt-1 text-sm text-slate-400">
                          Gruppenübersicht
                        </p>
                      </div>

                      <Link
                        href="/coach/teams"
                        className="text-sm text-slate-300 hover:text-white"
                      >
                        Alle Teams →
                      </Link>
                    </div>

                    {dashboardTeams.length === 0 ? (
                      <div className="p-8 text-center text-sm text-slate-500">
                        Noch keine Teams vorhanden.
                      </div>
                    ) : (
                      <div className="space-y-3 p-5">
                        {dashboardTeams.map(
                          (team) => (
                            <div
                              key={
                                team.id
                              }
                              className="flex items-center justify-between gap-4 rounded-xl border border-slate-800 bg-slate-950 p-4"
                            >
                              <div>
                                <p className="font-semibold">
                                  {
                                    team.name
                                  }
                                </p>

                                <p className="mt-1 text-sm text-slate-500">
                                  {
                                    team.athleteCount
                                  }{" "}
                                  {team.athleteCount === 1
                                    ? "Athlet"
                                    : "Athleten"}
                                </p>
                              </div>

                              <div className="text-right">
                                <p className="text-xs text-slate-500">
                                  Nächstes Training
                                </p>

                                <p className="mt-1 text-sm">
                                  {
                                    team.nextTraining
                                  }
                                </p>
                              </div>
                            </div>
                          )
                        )}
                      </div>
                    )}
                  </section>

                  <section className="rounded-2xl border border-slate-800 bg-slate-900">
                    <div className="flex items-center justify-between border-b border-slate-800 p-5">
                      <div>
                        <h2 className="text-xl font-semibold">
                          Training heute
                        </h2>

                        <p className="mt-1 text-sm text-slate-400">
                          Geplante Einheiten
                        </p>
                      </div>

                      <Link
                        href="/coach/training"
                        className="text-sm text-slate-300 hover:text-white"
                      >
                        Trainingsplanung →
                      </Link>
                    </div>

                    {todayTrainings.length === 0 ? (
                      <div className="p-8 text-center text-sm text-slate-500">
                        Für heute ist kein Training geplant.
                      </div>
                    ) : (
                      <div className="space-y-3 p-5">
                        {todayTrainings.map(
                          (training) => (
                            <Link
                              key={
                                training.id
                              }
                              href={`/coach/training/new?session=${training.id}`}
                              className="block rounded-xl border border-slate-800 bg-slate-950 p-4 transition hover:border-slate-600"
                            >
                              <div className="flex items-start justify-between gap-4">
                                <div>
                                  <div className="flex flex-wrap items-center gap-2">
                                    <span
                                      className={`rounded-full px-2 py-1 text-[10px] font-medium ${
                                        training.training_type === "water"
                                          ? "bg-blue-950 text-blue-300"
                                          : "bg-emerald-950 text-emerald-300"
                                      }`}
                                    >
                                      {training.training_type === "water"
                                        ? "Wasser"
                                        : "Land"}
                                    </span>

                                    <span className="text-xs text-slate-500">
                                      {training.start_time
                                        ? training.start_time.slice(
                                            0,
                                            5
                                          )
                                        : "—"}{" "}
                                      Uhr
                                    </span>
                                  </div>

                                  <p className="mt-3 font-semibold">
                                    {
                                      training.title
                                    }
                                  </p>

                                  <p className="mt-1 text-sm text-slate-500">
                                    {getTeamName(
                                      training.team_id
                                    )}
                                  </p>

                                  {training.duration_minutes !== null && (
                                    <p className="mt-1 text-xs text-slate-600">
                                      {
                                        training.duration_minutes
                                      }{" "}
                                      Minuten
                                    </p>
                                  )}
                                </div>
                              </div>
                            </Link>
                          )
                        )}
                      </div>
                    )}
                  </section>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}