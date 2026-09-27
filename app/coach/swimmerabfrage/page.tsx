"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Team = {
  id: string;
  name: string;
};

type TeamMember = {
  team_id: string;
  athlete_id: string;
};

type TeamWithCount = Team & {
  athleteCount: number;
};

export default function SchwimmerabfragePage() {
  const [teams, setTeams] = useState<TeamWithCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  async function loadTeams() {
    setLoading(true);
    setMessage("");

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setMessage("Coach konnte nicht geladen werden.");
      setLoading(false);
      return;
    }

    const { data: teamData, error: teamError } = await supabase
      .from("teams")
      .select("id, name")
      .eq("coach_id", user.id)
      .order("name", {
        ascending: true,
      });

    if (teamError) {
      setMessage(
        `Teams konnten nicht geladen werden: ${teamError.message}`
      );
      setLoading(false);
      return;
    }

    const loadedTeams = (teamData ?? []) as Team[];

    if (loadedTeams.length === 0) {
      setTeams([]);
      setLoading(false);
      return;
    }

    const teamIds = loadedTeams.map((team) => team.id);

    const { data: memberData, error: memberError } = await supabase
      .from("team_members")
      .select("team_id, athlete_id")
      .in("team_id", teamIds);

    if (memberError) {
      setMessage(
        `Athletenanzahl konnte nicht geladen werden: ${memberError.message}`
      );
      setLoading(false);
      return;
    }

    const members = (memberData ?? []) as TeamMember[];

    const teamsWithCount: TeamWithCount[] = loadedTeams.map(
      (team) => {
        const athleteCount = members.filter(
          (member) => member.team_id === team.id
        ).length;

        return {
          ...team,
          athleteCount,
        };
      }
    );

    setTeams(teamsWithCount);
    setLoading(false);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Daten beim Oeffnen laden
    loadTeams();
  }, []);

  return (
    <main>
      <div className="mx-auto max-w-5xl">
        <header>
          <p className="text-sm text-app-muted">
            Coach Bereich
          </p>

          <h1 className="mt-1 text-3xl font-bold">
            Schwimmerabfrage
          </h1>
        </header>

        {message && (
          <div className="mt-6 rounded-xl border border-app-bad/40 bg-app-bad/10 p-4 text-sm text-app-bad">
            {message}
          </div>
        )}

        <section className="mt-8 overflow-hidden rounded-2xl border border-app-border bg-app-surface">
          <div className="border-b border-app-border px-6 py-4">
            <h2 className="text-lg font-semibold">
              Mannschaften
            </h2>
          </div>

          {loading ? (
            <div className="p-8 text-center text-app-muted">
              Teams werden geladen...
            </div>
          ) : teams.length === 0 ? (
            <div className="p-8">
              <p className="font-medium">
                Noch keine Teams vorhanden.
              </p>

              <p className="mt-2 text-sm text-app-muted">
                Lege zuerst im Coach-Bereich ein Team an.
              </p>
            </div>
          ) : (
            <div className="px-6 py-4">
              <div className="grid grid-cols-[1fr_140px] border-b border-app-border pb-3 text-sm font-semibold text-app-text">
                <div>
                  Mannschaft
                </div>

                <div>
                  Schwimmer
                </div>
              </div>

              <div>
                {teams.map((team) => (
                  <Link
                    key={team.id}
                    href={`/coach/swimmerabfrage/${team.id}`}
                    className="grid grid-cols-[1fr_140px] items-center border-b border-app-border py-3 transition last:border-b-0 hover:bg-app-elevated/60"
                  >
                    <div className="font-medium text-app-accent hover:text-app-accent">
                      {team.name}
                    </div>

                    <div className="text-app-text">
                      {team.athleteCount}
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </section>

        <div className="mt-8">
          <Link
            href="/coach"
            className="inline-block rounded-xl border border-app-border px-4 py-3 text-sm hover:bg-app-elevated"
          >
            ← Zurück zum Coach-Bereich
          </Link>
        </div>
      </div>
    </main>
  );
}