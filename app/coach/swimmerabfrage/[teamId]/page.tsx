"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Team = {
  id: string;
  name: string;
};

type TeamMember = {
  athlete_id: string;
};

type AthleteProfile = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  gender: string | null;
  birth_date: string | null;
};

function getFullName(athlete: AthleteProfile) {
  const firstName = athlete.first_name?.trim() ?? "";
  const lastName = athlete.last_name?.trim() ?? "";

  const fullName = `${firstName} ${lastName}`.trim();

  return fullName || "Unbekannter Athlet";
}

function getBirthYear(birthDate: string | null) {
  if (!birthDate) {
    return "–";
  }

  const year = new Date(`${birthDate}T12:00:00`).getFullYear();

  if (Number.isNaN(year)) {
    return "–";
  }

  return year.toString();
}

function normalizeGender(gender: string | null) {
  const value = gender?.trim().toLowerCase();

  if (
    value === "female" ||
    value === "weiblich" ||
    value === "w"
  ) {
    return "female";
  }

  if (
    value === "male" ||
    value === "männlich" ||
    value === "maennlich" ||
    value === "m"
  ) {
    return "male";
  }

  return "other";
}

export default function TeamSchwimmerabfragePage() {
  const params = useParams();

  const teamId =
    typeof params.teamId === "string"
      ? params.teamId
      : "";

  const [team, setTeam] = useState<Team | null>(null);
  const [athletes, setAthletes] = useState<AthleteProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!teamId) {
      return;
    }

    loadTeam();
  }, [teamId]);

  async function loadTeam() {
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

    /*
      1. Team laden.

      Zusätzlich prüfen wir hier schon,
      dass das Team wirklich dem eingeloggten Coach gehört.
    */

    const { data: teamData, error: teamError } = await supabase
      .from("teams")
      .select("id, name")
      .eq("id", teamId)
      .eq("coach_id", user.id)
      .single();

    if (teamError || !teamData) {
      setMessage("Team konnte nicht geladen werden.");
      setLoading(false);
      return;
    }

    setTeam(teamData as Team);

    /*
      2. Mitglieder des Teams laden.
    */

    const { data: memberData, error: memberError } = await supabase
      .from("team_members")
      .select("athlete_id")
      .eq("team_id", teamId);

    if (memberError) {
      setMessage(
        `Teammitglieder konnten nicht geladen werden: ${memberError.message}`
      );
      setLoading(false);
      return;
    }

    const members = (memberData ?? []) as TeamMember[];

    if (members.length === 0) {
      setAthletes([]);
      setLoading(false);
      return;
    }

    const athleteIds = members.map(
      (member) => member.athlete_id
    );

    /*
      3. Athletenprofile laden.

      Dafür brauchen wir in profiles die Felder:
      - first_name
      - last_name
      - gender
      - birth_date

      Falls gender oder birth_date bei dir noch nicht existieren,
      sagt uns Supabase gleich Bescheid.
    */

    const { data: athleteData, error: athleteError } = await supabase
      .from("profiles")
      .select(
        "id, first_name, last_name, gender, birth_date"
      )
      .in("id", athleteIds)
      .eq("role", "athlete");

    if (athleteError) {
      setMessage(
        `Athletendaten konnten nicht geladen werden: ${athleteError.message}`
      );
      setLoading(false);
      return;
    }

    const loadedAthletes =
      (athleteData ?? []) as AthleteProfile[];

    loadedAthletes.sort((a, b) =>
      getFullName(a).localeCompare(
        getFullName(b),
        "de"
      )
    );

    setAthletes(loadedAthletes);
    setLoading(false);
  }

  const femaleAthletes = useMemo(
    () =>
      athletes.filter(
        (athlete) =>
          normalizeGender(athlete.gender) === "female"
      ),
    [athletes]
  );

  const maleAthletes = useMemo(
    () =>
      athletes.filter(
        (athlete) =>
          normalizeGender(athlete.gender) === "male"
      ),
    [athletes]
  );

  const otherAthletes = useMemo(
    () =>
      athletes.filter(
        (athlete) =>
          normalizeGender(athlete.gender) === "other"
      ),
    [athletes]
  );

  return (
    <main>
      <div className="mx-auto max-w-7xl">
        <header>
          <p className="text-sm text-app-muted">
            Schwimmerabfrage
          </p>

          <h1 className="mt-1 text-3xl font-bold">
            {team?.name ?? "Team"}
          </h1>

          <p className="mt-2 text-app-muted">
            Athleten nach Geschlecht
          </p>
        </header>

        {message && (
          <div className="mt-6 rounded-xl border border-red-900 bg-red-950 p-4 text-sm text-red-300">
            {message}
          </div>
        )}

        {loading ? (
          <div className="mt-8 rounded-2xl border border-app-border bg-app-surface p-10 text-center text-app-muted">
            Athleten werden geladen...
          </div>
        ) : (
          <div className="mt-8 grid gap-6 lg:grid-cols-2">
            {/* WEIBLICH */}

            <section className="overflow-hidden rounded-2xl border border-app-border bg-app-surface">
              <div className="border-b border-app-border px-5 py-4">
                <h2 className="font-semibold">
                  weiblich ({femaleAthletes.length})
                </h2>
              </div>

              <AthleteTable athletes={femaleAthletes} />
            </section>

            {/* MÄNNLICH */}

            <section className="overflow-hidden rounded-2xl border border-app-border bg-app-surface">
              <div className="border-b border-app-border px-5 py-4">
                <h2 className="font-semibold">
                  männlich ({maleAthletes.length})
                </h2>
              </div>

              <AthleteTable athletes={maleAthletes} />
            </section>

            {/* SONSTIGE / NOCH NICHT HINTERLEGT */}

            {otherAthletes.length > 0 && (
              <section className="overflow-hidden rounded-2xl border border-app-border bg-app-surface lg:col-span-2">
                <div className="border-b border-app-border px-5 py-4">
                  <h2 className="font-semibold">
                    Geschlecht noch nicht zugeordnet ({otherAthletes.length})
                  </h2>
                </div>

                <AthleteTable athletes={otherAthletes} />
              </section>
            )}
          </div>
        )}

        <div className="mt-8">
          <Link
            href="/coach/swimmerabfrage"
            className="inline-block rounded-xl border border-app-border px-4 py-3 text-sm hover:bg-app-elevated"
          >
            ← Zurück zu den Mannschaften
          </Link>
        </div>
      </div>
    </main>
  );
}

function AthleteTable({
  athletes,
}: {
  athletes: AthleteProfile[];
}) {
  if (athletes.length === 0) {
    return (
      <div className="p-6 text-sm text-app-faint">
        Keine Athleten vorhanden.
      </div>
    );
  }

  return (
    <div className="px-5 py-4">
      <div className="grid grid-cols-[1fr_110px] border-b border-app-border pb-3 text-sm font-semibold text-app-text">
        <div>
          Name
        </div>

        <div>
          Jahrgang
        </div>
      </div>

      <div>
        {athletes.map((athlete) => (
          <Link
            key={athlete.id}
            href={`/coach/swimmerabfrage/athlet/${athlete.id}`}
            className="grid grid-cols-[1fr_110px] items-center border-b border-app-border py-3 transition last:border-b-0 hover:bg-app-elevated/60"
          >
            <div className="font-medium text-sky-400 hover:text-sky-300">
              {getFullName(athlete)}
            </div>

            <div className="text-app-text">
              {getBirthYear(athlete.birth_date)}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}