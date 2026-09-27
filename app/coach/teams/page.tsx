"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

type Team = {
  id: string;
  name: string;
  coach_id: string;
  created_at: string;
};

type AthleteProfile = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  role: "athlete";
};

type TeamMember = {
  id: string;
  team_id: string;
  athlete_id: string;
  created_at: string;
};

export default function CoachTeamsPage() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [athletes, setAthletes] = useState<AthleteProfile[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);

  const [newTeamName, setNewTeamName] = useState("");

  const [selectedTeamId, setSelectedTeamId] = useState("");
  const [selectedAthleteId, setSelectedAthleteId] = useState("");

  const [loading, setLoading] = useState(true);
  const [creatingTeam, setCreatingTeam] = useState(false);
  const [addingAthlete, setAddingAthlete] = useState(false);

  const [message, setMessage] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    setMessage("");

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setMessage("Benutzer konnte nicht geladen werden.");
      setLoading(false);
      return;
    }

    const [
      teamsResult,
      athletesResult,
      membersResult,
    ] = await Promise.all([
      supabase
        .from("teams")
        .select("id, name, coach_id, created_at")
        .order("created_at", { ascending: false }),

      supabase
        .from("profiles")
        .select("id, first_name, last_name, role")
        .eq("role", "athlete")
        .order("last_name", { ascending: true }),

      supabase
        .from("team_members")
        .select("id, team_id, athlete_id, created_at")
        .order("created_at", { ascending: true }),
    ]);

    if (teamsResult.error) {
      setMessage(
        `Teams konnten nicht geladen werden: ${teamsResult.error.message}`
      );
      setLoading(false);
      return;
    }

    if (athletesResult.error) {
      setMessage(
        `Athleten konnten nicht geladen werden: ${athletesResult.error.message}`
      );
      setLoading(false);
      return;
    }

    if (membersResult.error) {
      setMessage(
        `Team-Mitglieder konnten nicht geladen werden: ${membersResult.error.message}`
      );
      setLoading(false);
      return;
    }

    const loadedTeams = teamsResult.data ?? [];
    const loadedAthletes = (athletesResult.data ?? []) as AthleteProfile[];
    const loadedMembers = membersResult.data ?? [];

    setTeams(loadedTeams);
    setAthletes(loadedAthletes);
    setTeamMembers(loadedMembers);

    if (!selectedTeamId && loadedTeams.length > 0) {
      setSelectedTeamId(loadedTeams[0].id);
    }

    if (!selectedAthleteId && loadedAthletes.length > 0) {
      setSelectedAthleteId(loadedAthletes[0].id);
    }

    setLoading(false);
  }

  async function handleCreateTeam(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    const cleanName = newTeamName.trim();

    if (!cleanName) {
      setMessage("Bitte gib einen Teamnamen ein.");
      return;
    }

    setCreatingTeam(true);
    setMessage("");

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setMessage("Benutzer konnte nicht geladen werden.");
      setCreatingTeam(false);
      return;
    }

    const { error } = await supabase.from("teams").insert({
      name: cleanName,
      coach_id: user.id,
    });

    if (error) {
      setMessage(`Team konnte nicht erstellt werden: ${error.message}`);
      setCreatingTeam(false);
      return;
    }

    setNewTeamName("");
    setMessage("Team wurde erstellt ✅");
    setCreatingTeam(false);

    await loadData();
  }

  async function handleAddAthlete(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (!selectedTeamId) {
      setMessage("Bitte wähle ein Team aus.");
      return;
    }

    if (!selectedAthleteId) {
      setMessage("Bitte wähle einen Athleten aus.");
      return;
    }

    const alreadyMember = teamMembers.some(
      (member) =>
        member.team_id === selectedTeamId &&
        member.athlete_id === selectedAthleteId
    );

    if (alreadyMember) {
      setMessage("Dieser Athlet ist bereits in diesem Team.");
      return;
    }

    setAddingAthlete(true);
    setMessage("");

    const { error } = await supabase
      .from("team_members")
      .insert({
        team_id: selectedTeamId,
        athlete_id: selectedAthleteId,
      });

    if (error) {
      setMessage(
        `Athlet konnte nicht hinzugefügt werden: ${error.message}`
      );
      setAddingAthlete(false);
      return;
    }

    setMessage("Athlet wurde dem Team hinzugefügt ✅");
    setAddingAthlete(false);

    await loadData();
  }

  async function handleRemoveAthlete(memberId: string) {
    const confirmed = window.confirm(
      "Möchtest du diesen Athleten wirklich aus dem Team entfernen?"
    );

    if (!confirmed) {
      return;
    }

    setMessage("");

    const { error } = await supabase
      .from("team_members")
      .delete()
      .eq("id", memberId);

    if (error) {
      setMessage(
        `Athlet konnte nicht entfernt werden: ${error.message}`
      );
      return;
    }

    setMessage("Athlet wurde aus dem Team entfernt.");
    await loadData();
  }

  const athleteMap = useMemo(() => {
    return new Map(
      athletes.map((athlete) => [
        athlete.id,
        athlete,
      ])
    );
  }, [athletes]);

  function getAthleteName(athleteId: string) {
    const athlete = athleteMap.get(athleteId);

    if (!athlete) {
      return "Unbekannter Athlet";
    }

    const fullName = [
      athlete.first_name,
      athlete.last_name,
    ]
      .filter(Boolean)
      .join(" ");

    return fullName || "Athlet";
  }

  return (
    <div className="mx-auto w-full max-w-[1400px]">
      <div>
        <p className="text-sm text-app-muted">
          Coach Bereich
        </p>

        <h1 className="mt-1 text-3xl font-bold">
          Teams
        </h1>

        <p className="mt-2 text-app-muted">
          Erstelle Teams und ordne Athleten deinen Teams zu.
        </p>
      </div>

      {message && (
        <div className="mt-6 rounded-xl border border-app-border bg-app-surface p-4 text-sm text-app-text">
          {message}
        </div>
      )}

      <section className="mt-8 grid gap-6 xl:grid-cols-2">
        <div className="rounded-2xl border border-app-border bg-app-surface p-5">
          <h2 className="text-lg font-semibold">
            Neues Team erstellen
          </h2>

          <p className="mt-1 text-sm text-app-muted">
            Zum Beispiel A-Kader, Nachwuchs oder Sprinter.
          </p>

          <form
            onSubmit={handleCreateTeam}
            className="mt-5 flex flex-col gap-3 sm:flex-row"
          >
            <input
              type="text"
              value={newTeamName}
              onChange={(event) =>
                setNewTeamName(event.target.value)
              }
              placeholder="Teamname"
              className="min-w-0 flex-1 rounded-xl border border-app-border bg-app-bg px-4 py-3 outline-none focus:border-app-accent"
            />

            <button
              type="submit"
              disabled={creatingTeam}
              className="rounded-xl bg-app-accent px-5 py-3 text-sm font-medium text-app-accent-ink hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {creatingTeam
                ? "Wird erstellt..."
                : "Team erstellen"}
            </button>
          </form>
        </div>

        <div className="rounded-2xl border border-app-border bg-app-surface p-5">
          <h2 className="text-lg font-semibold">
            Athlet zuordnen
          </h2>

          <p className="mt-1 text-sm text-app-muted">
            Wähle einen Athleten und ein Team aus.
          </p>

          <form
            onSubmit={handleAddAthlete}
            className="mt-5 space-y-4"
          >
            <div>
              <label className="mb-2 block text-sm text-app-muted">
                Team
              </label>

              <select
                value={selectedTeamId}
                onChange={(event) =>
                  setSelectedTeamId(event.target.value)
                }
                className="w-full rounded-xl border border-app-border bg-app-bg px-4 py-3 outline-none"
              >
                {teams.length === 0 && (
                  <option value="">
                    Noch kein Team vorhanden
                  </option>
                )}

                {teams.map((team) => (
                  <option
                    key={team.id}
                    value={team.id}
                  >
                    {team.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm text-app-muted">
                Athlet
              </label>

              <select
                value={selectedAthleteId}
                onChange={(event) =>
                  setSelectedAthleteId(event.target.value)
                }
                className="w-full rounded-xl border border-app-border bg-app-bg px-4 py-3 outline-none"
              >
                {athletes.length === 0 && (
                  <option value="">
                    Noch kein Athlete vorhanden
                  </option>
                )}

                {athletes.map((athlete) => (
                  <option
                    key={athlete.id}
                    value={athlete.id}
                  >
                    {getAthleteName(athlete.id)}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="submit"
              disabled={
                addingAthlete ||
                teams.length === 0 ||
                athletes.length === 0
              }
              className="w-full rounded-xl bg-app-accent px-5 py-3 text-sm font-medium text-app-accent-ink hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {addingAthlete
                ? "Wird hinzugefügt..."
                : "Athlet zum Team hinzufügen"}
            </button>
          </form>
        </div>
      </section>

      <section className="mt-6">
        <div className="mb-4">
          <h2 className="text-xl font-semibold">
            Meine Teams
          </h2>

          <p className="mt-1 text-sm text-app-muted">
            Teams und zugeordnete Athleten.
          </p>
        </div>

        {loading ? (
          <div className="rounded-2xl border border-app-border bg-app-surface p-6 text-sm text-app-muted">
            Daten werden geladen...
          </div>
        ) : teams.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-app-border bg-app-surface p-8 text-center">
            <h3 className="font-semibold">
              Noch keine Teams
            </h3>

            <p className="mt-2 text-sm text-app-muted">
              Erstelle oben dein erstes Team.
            </p>
          </div>
        ) : (
          <div className="grid gap-5 lg:grid-cols-2 xl:grid-cols-3">
            {teams.map((team) => {
              const members = teamMembers.filter(
                (member) =>
                  member.team_id === team.id
              );

              return (
                <div
                  key={team.id}
                  className="rounded-2xl border border-app-border bg-app-surface"
                >
                  <div className="border-b border-app-border p-5">
                    <p className="text-sm text-app-faint">
                      Team
                    </p>

                    <div className="mt-2 flex items-center justify-between gap-4">
                      <h3 className="text-xl font-semibold">
                        {team.name}
                      </h3>

                      <span className="rounded-full bg-app-elevated px-3 py-1 text-xs text-app-text">
                        {members.length} Athleten
                      </span>
                    </div>
                  </div>

                  <div className="p-5">
                    {members.length === 0 ? (
                      <div className="rounded-xl border border-dashed border-app-border p-4 text-center">
                        <p className="text-sm text-app-faint">
                          Noch keine Athleten zugeordnet.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {members.map((member) => (
                          <div
                            key={member.id}
                            className="flex items-center justify-between gap-4 rounded-xl border border-app-border bg-app-bg p-4"
                          >
                            <div>
                              <p className="font-medium">
                                {getAthleteName(
                                  member.athlete_id
                                )}
                              </p>

                              <p className="mt-1 text-xs text-app-faint">
                                Athlete
                              </p>
                            </div>

                            <button
                              type="button"
                              onClick={() =>
                                handleRemoveAthlete(
                                  member.id
                                )
                              }
                              className="rounded-lg border border-app-border px-3 py-2 text-xs text-app-muted hover:bg-app-elevated hover:text-white"
                            >
                              Entfernen
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    <p className="mt-5 text-xs text-app-faint">
                      Erstellt am{" "}
                      {new Date(
                        team.created_at
                      ).toLocaleDateString("de-DE")}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}