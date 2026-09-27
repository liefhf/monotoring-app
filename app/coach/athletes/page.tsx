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
    <div className="mx-auto w-full max-w-[1400px]">
      {/* Kopf */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-white">
            Athleten
          </h1>

          <p className="mt-0.5 text-sm text-app-muted">
            Nur Athleten aus deinen Teams
          </p>
        </div>

        <Link
          href="/coach/teams"
          className="rounded-lg border border-app-border px-4 py-2.5 text-sm font-medium text-app-text transition hover:bg-app-elevated hover:text-white"
        >
          Teamzuordnung verwalten
        </Link>
      </div>

      {/* Kennzahlen */}
      <section className="mt-6 grid grid-cols-3 gap-px overflow-hidden rounded-xl border border-app-border bg-app-border">
        <div className="bg-app-surface px-4 py-3.5">
          <p className="text-[11px] font-medium uppercase tracking-wider text-app-muted">
            Athleten
          </p>

          <p className="mt-1.5 text-2xl font-semibold text-white">
            {athleteRows.length}
          </p>
        </div>

        <div className="bg-app-surface px-4 py-3.5">
          <p className="text-[11px] font-medium uppercase tracking-wider text-app-muted">
            Teams
          </p>

          <p className="mt-1.5 text-2xl font-semibold text-white">
            {teams.length}
          </p>
        </div>

        <div className="bg-app-surface px-4 py-3.5">
          <p className="text-[11px] font-medium uppercase tracking-wider text-app-muted">
            Zuordnungen
          </p>

          <p className="mt-1.5 text-2xl font-semibold text-white">
            {members.length}
          </p>
        </div>
      </section>

      {message && (
        <div className="mt-5 rounded-lg border border-app-bad/40 bg-app-bad/10 px-4 py-3 text-sm text-app-bad">
          {message}
        </div>
      )}

      {/*
        Suche sitzt in der Kopfzeile der Liste, nicht in
        einer eigenen Karte - sie gehoert zu dieser Liste.
      */}
      <section className="mt-5 overflow-hidden rounded-xl border border-app-border bg-app-surface">
        <div className="flex flex-col gap-3 border-b border-app-border px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-sm font-semibold text-white">
            Meine Athleten
          </h2>

          <div className="flex items-center gap-3">
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
              onChange={(event) =>
                setSearch(event.target.value)
              }
              placeholder="Suchen…"
              className="w-full rounded-lg border border-app-border bg-app-bg px-3 py-1.5 text-sm text-white outline-none transition placeholder:text-app-faint focus:border-app-accent sm:w-56"
            />

            <span className="shrink-0 whitespace-nowrap text-xs text-app-faint">
              {filteredAthletes.length} / {athleteRows.length}
            </span>
          </div>
        </div>

        {loading ? (
          <div className="px-4 py-10 text-center text-sm text-app-muted">
            Athleten werden geladen...
          </div>
        ) : filteredAthletes.length === 0 ? (
          <div className="px-4 py-10 text-center">
            <p className="text-sm font-medium text-app-text">
              Keine Athleten gefunden
            </p>

            <p className="mt-1 text-sm text-app-faint">
              Prüfe deine Suche oder die Teamzuordnung.
            </p>
          </div>
        ) : (
          /*
            Eine Liste fuer alle Bildschirmbreiten. Frueher
            standen hier Tabelle und Kartenliste doppelt
            nebeneinander - zwei Fassungen derselben Daten.
          */
          <ul className="divide-y divide-app-border">
            {filteredAthletes.map(
              (athlete) => (
                <li key={athlete.id}>
                  <Link
                    href={`/coach/athletes/${athlete.id}`}
                    className="flex items-center gap-4 px-4 py-3 transition hover:bg-app-elevated/40"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-white">
                        {athlete.fullName}
                      </span>

                      <span className="mt-1 flex flex-wrap gap-1">
                        {athlete.teams.length > 0 ? (
                          athlete.teams.map(
                            (team) => (
                              <span
                                key={team}
                                className="rounded bg-app-elevated px-1.5 py-0.5 text-[11px] text-app-muted"
                              >
                                {team}
                              </span>
                            )
                          )
                        ) : (
                          <span className="text-[11px] text-app-faint">
                            Kein Team
                          </span>
                        )}
                      </span>
                    </span>

                    <svg
                      viewBox="0 0 20 20"
                      className="h-4 w-4 shrink-0 text-app-faint"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <path d="M7.5 4.5l6 5.5-6 5.5" />
                    </svg>
                  </Link>
                </li>
              )
            )}
          </ul>
        )}
      </section>
    </div>
  );
}