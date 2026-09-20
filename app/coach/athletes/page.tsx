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
  id: string;
  team_id: string;
  athlete_id: string;
};

type AthleteProfile = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  role: "athlete";
};

type AthleteRow = {
  id: string;
  fullName: string;
  teams: string[];
};

export default function CoachAthletesPage() {
  const [teams, setTeams] =
    useState<Team[]>([]);

  const [members, setMembers] =
    useState<TeamMember[]>([]);

  const [athletes, setAthletes] =
    useState<AthleteProfile[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [message, setMessage] =
    useState("");

  const [search, setSearch] =
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
    loadAthletes();
  }, []);

  async function loadAthletes() {
    setLoading(true);
    setMessage("");

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setMessage(
        "Benutzer konnte nicht geladen werden."
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
      teamData ?? [];

    setTeams(loadedTeams);

    if (
      loadedTeams.length === 0
    ) {
      setMembers([]);
      setAthletes([]);
      setLoading(false);
      return;
    }

    const teamIds =
      loadedTeams.map(
        (team) => team.id
      );

    const {
      data: memberData,
      error: memberError,
    } = await supabase
      .from("team_members")
      .select(
        "id, team_id, athlete_id"
      )
      .in("team_id", teamIds);

    if (memberError) {
      setMessage(
        `Team-Zuordnungen konnten nicht geladen werden: ${memberError.message}`
      );

      setLoading(false);
      return;
    }

    const loadedMembers =
      memberData ?? [];

    setMembers(
      loadedMembers
    );

    if (
      loadedMembers.length === 0
    ) {
      setAthletes([]);
      setLoading(false);
      return;
    }

    const athleteIds = [
      ...new Set(
        loadedMembers.map(
          (member) =>
            member.athlete_id
        )
      ),
    ];

    const {
      data: athleteData,
      error: athleteError,
    } = await supabase
      .from("profiles")
      .select(
        "id, first_name, last_name, role"
      )
      .in("id", athleteIds)
      .eq("role", "athlete")
      .order("last_name");

    if (athleteError) {
      setMessage(
        `Athleten konnten nicht geladen werden: ${athleteError.message}`
      );

      setLoading(false);
      return;
    }

    setAthletes(
      (athleteData ??
        []) as AthleteProfile[]
    );

    setLoading(false);
  }

  const athleteRows =
    useMemo<
      AthleteRow[]
    >(() => {
      return athletes.map(
        (athlete) => {
          const athleteMemberships =
            members.filter(
              (member) =>
                member.athlete_id ===
                athlete.id
            );

          const athleteTeamNames =
            athleteMemberships
              .map(
                (membership) => {
                  const team =
                    teams.find(
                      (item) =>
                        item.id ===
                        membership.team_id
                    );

                  return team?.name;
                }
              )
              .filter(
                (
                  teamName
                ): teamName is string =>
                  Boolean(teamName)
              );

          const fullName =
            [
              athlete.first_name,
              athlete.last_name,
            ]
              .filter(Boolean)
              .join(" ") ||
            "Athlet";

          return {
            id: athlete.id,
            fullName,
            teams:
              athleteTeamNames,
          };
        }
      );
    }, [
      athletes,
      members,
      teams,
    ]);

  const filteredAthletes =
    useMemo(() => {
      const query =
        search
          .trim()
          .toLowerCase();

      if (!query) {
        return athleteRows;
      }

      return athleteRows.filter(
        (athlete) => {
          const teamText =
            athlete.teams
              .join(" ")
              .toLowerCase();

          return (
            athlete.fullName
              .toLowerCase()
              .includes(query) ||
            teamText.includes(
              query
            )
          );
        }
      );
    }, [
      athleteRows,
      search,
    ]);

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="flex min-h-screen">
        {/* SIDEBAR */}

        <aside className="hidden w-64 shrink-0 border-r border-slate-800 bg-slate-900 lg:flex lg:flex-col">
          <div className="border-b border-slate-800 px-5 py-5">
            <h2 className="text-lg font-bold">
              Monitoring App
            </h2>

            <p className="mt-1 text-xs text-slate-500">
              Coach Bereich
            </p>
          </div>

          <nav className="flex-1 space-y-1 p-3">
            {navigation.map(
              (item) => (
                <Link
                  key={
                    item.name
                  }
                  href={
                    item.href
                  }
                  className={`block rounded-lg px-4 py-2.5 text-sm transition ${
                    item.name ===
                    "Athleten"
                      ? "bg-white font-medium text-slate-950"
                      : "text-slate-300 hover:bg-slate-800 hover:text-white"
                  }`}
                >
                  {
                    item.name
                  }
                </Link>
              )
            )}
          </nav>
        </aside>

        {/* INHALT */}

        <div className="min-w-0 flex-1">
          <div className="mx-auto max-w-[1400px] px-4 py-6 sm:px-6">
            {/* HEADER */}

            <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-sm text-slate-400">
                  Coach Bereich
                </p>

                <h1 className="mt-1 text-3xl font-bold tracking-tight">
                  Athleten
                </h1>

                <p className="mt-1.5 text-sm text-slate-400 sm:text-base">
                  Hier siehst du nur
                  Athleten, die deinen
                  Teams zugeordnet sind.
                </p>
              </div>

              <Link
                href="/coach/teams"
                className="w-fit rounded-xl border border-slate-700 bg-slate-900 px-4 py-2.5 text-center text-sm font-medium text-slate-200 transition hover:bg-slate-800 hover:text-white"
              >
                Teamzuordnung verwalten
              </Link>
            </header>

            {/* KPI */}

            <section className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-slate-800 bg-slate-900 px-4 py-3">
                <p className="text-xs font-medium text-slate-500">
                  Athleten
                </p>

                <p className="mt-1 text-2xl font-bold text-white">
                  {
                    athleteRows.length
                  }
                </p>
              </div>

              <div className="rounded-xl border border-slate-800 bg-slate-900 px-4 py-3">
                <p className="text-xs font-medium text-slate-500">
                  Teams
                </p>

                <p className="mt-1 text-2xl font-bold text-white">
                  {
                    teams.length
                  }
                </p>
              </div>

              <div className="rounded-xl border border-slate-800 bg-slate-900 px-4 py-3">
                <p className="text-xs font-medium text-slate-500">
                  Zuordnungen
                </p>

                <p className="mt-1 text-2xl font-bold text-white">
                  {
                    members.length
                  }
                </p>
              </div>
            </section>

            {/* SUCHE */}

            <section className="mt-4 flex flex-col gap-3 rounded-xl border border-slate-800 bg-slate-900 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="w-full sm:max-w-[400px]">
                <label
                  htmlFor="athlete-search"
                  className="sr-only"
                >
                  Athlet oder Team suchen
                </label>

                <input
                  id="athlete-search"
                  type="text"
                  value={search}
                  onChange={(
                    event
                  ) =>
                    setSearch(
                      event.target.value
                    )
                  }
                  placeholder="Athlet oder Team suchen…"
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-slate-500"
                />
              </div>

              <p className="text-xs text-slate-500">
                {
                  filteredAthletes.length
                }{" "}
                von{" "}
                {
                  athleteRows.length
                }{" "}
                Athleten
              </p>
            </section>

            {/* FEHLERMELDUNG */}

            {message && (
              <div className="mt-4 rounded-xl border border-red-900 bg-red-950/40 p-4 text-sm text-red-300">
                {
                  message
                }
              </div>
            )}

            {/* ATHLETENLISTE */}

            <section className="mt-4 overflow-hidden rounded-2xl border border-slate-800 bg-slate-900">
              <div className="border-b border-slate-800 px-4 py-3.5 sm:px-5">
                <h2 className="text-lg font-semibold">
                  Meine Athleten
                </h2>

                <p className="mt-0.5 text-xs text-slate-500">
                  Athleten deiner
                  zugeordneten Teams
                </p>
              </div>

              {loading ? (
                <div className="px-5 py-7 text-sm text-slate-400">
                  Athleten werden geladen...
                </div>
              ) : filteredAthletes.length ===
                0 ? (
                <div className="px-5 py-8 text-center">
                  <h3 className="font-semibold text-slate-300">
                    Keine Athleten gefunden
                  </h3>

                  <p className="mt-1 text-sm text-slate-500">
                    Prüfe deine Suche oder
                    Teamzuordnung.
                  </p>
                </div>
              ) : (
                <>
                  {/* DESKTOP */}

                  <div className="hidden md:block">
                    <table className="w-full text-left">
                      <thead className="border-b border-slate-800 bg-slate-950/40 text-[11px] uppercase tracking-wide text-slate-600">
                        <tr>
                          <th className="px-5 py-2.5 font-medium">
                            Athlet
                          </th>

                          <th className="px-5 py-2.5 font-medium">
                            Team
                          </th>

                          <th className="px-5 py-2.5 text-right font-medium">
                            Aktion
                          </th>
                        </tr>
                      </thead>

                      <tbody className="divide-y divide-slate-800">
                        {filteredAthletes.map(
                          (
                            athlete
                          ) => (
                            <tr
                              key={
                                athlete.id
                              }
                              className="transition hover:bg-slate-800/40"
                            >
                              <td className="px-5 py-3">
                                <p className="font-semibold text-white">
                                  {
                                    athlete.fullName
                                  }
                                </p>

                                <p className="mt-0.5 text-xs text-slate-600">
                                  Athlet
                                </p>
                              </td>

                              <td className="px-5 py-3">
                                <div className="flex flex-wrap gap-1.5">
                                  {athlete
                                    .teams
                                    .length >
                                  0 ? (
                                    athlete.teams.map(
                                      (
                                        team
                                      ) => (
                                        <span
                                          key={
                                            team
                                          }
                                          className="rounded-full border border-slate-700 bg-slate-800 px-2.5 py-1 text-xs text-slate-300"
                                        >
                                          {
                                            team
                                          }
                                        </span>
                                      )
                                    )
                                  ) : (
                                    <span className="text-xs text-slate-600">
                                      Kein Team
                                    </span>
                                  )}
                                </div>
                              </td>

                              <td className="px-5 py-3 text-right">
                                <Link
                                  href={`/coach/athletes/${athlete.id}`}
                                  className="inline-flex items-center rounded-lg border border-slate-700 px-3 py-1.5 text-xs font-medium text-slate-300 transition hover:border-slate-600 hover:bg-slate-800 hover:text-white"
                                >
                                  Öffnen
                                </Link>
                              </td>
                            </tr>
                          )
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* MOBILE */}

                  <div className="divide-y divide-slate-800 md:hidden">
                    {filteredAthletes.map(
                      (
                        athlete
                      ) => (
                        <div
                          key={
                            athlete.id
                          }
                          className="px-4 py-3.5"
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="min-w-0">
                              <p className="truncate font-semibold text-white">
                                {
                                  athlete.fullName
                                }
                              </p>

                              <p className="mt-0.5 text-xs text-slate-600">
                                Athlet
                              </p>
                            </div>

                            <Link
                              href={`/coach/athletes/${athlete.id}`}
                              className="shrink-0 rounded-lg border border-slate-700 px-3 py-1.5 text-xs font-medium text-slate-300 transition hover:bg-slate-800 hover:text-white"
                            >
                              Öffnen
                            </Link>
                          </div>

                          <div className="mt-2.5 flex flex-wrap gap-1.5">
                            {athlete
                              .teams
                              .length >
                            0 ? (
                              athlete.teams.map(
                                (
                                  team
                                ) => (
                                  <span
                                    key={
                                      team
                                    }
                                    className="rounded-full border border-slate-700 bg-slate-800 px-2.5 py-1 text-xs text-slate-300"
                                  >
                                    {
                                      team
                                    }
                                  </span>
                                )
                              )
                            ) : (
                              <span className="text-xs text-slate-600">
                                Kein Team
                              </span>
                            )}
                          </div>
                        </div>
                      )
                    )}
                  </div>
                </>
              )}
            </section>
          </div>
        </div>
      </div>
    </main>
  );
}