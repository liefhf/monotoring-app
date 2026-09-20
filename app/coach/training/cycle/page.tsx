"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

type Team = {
  id: string;
  name: string;
};

type OlympicCycle = {
  id: string;
  coach_id: string;
  team_id: string | null;
  name: string;
  start_year: number;
  end_year: number;
  description: string | null;
};

type AnnualPlan = {
  id: string;
  olympic_cycle_id: string;
  coach_id: string;
  team_id: string | null;
  cycle_year: number;
  title: string;
  main_competition: string | null;
  season_start: string;
  season_end: string;
  description: string | null;
};

type CycleYearDefinition = {
  cycleYear: number;
  label: string;
  competition: string;
};

const cycleYearDefinitions: CycleYearDefinition[] = [
  {
    cycleYear: 1,
    label: "Jahr 1",
    competition: "Europäische Meisterschaften",
  },
  {
    cycleYear: 2,
    label: "Jahr 2",
    competition: "Weltmeisterschaft",
  },
  {
    cycleYear: 3,
    label: "Jahr 3",
    competition: "Europameisterschaften",
  },
  {
    cycleYear: 4,
    label: "Jahr 4",
    competition: "Olympische Spiele",
  },
];

function getLocalDateString(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getDefaultCycleStartYear() {
  const now = new Date();

  return now.getFullYear();
}

function getSeasonStartDate(year: number) {
  return `${year}-08-01`;
}

function getSeasonEndDate(year: number) {
  return `${year + 1}-07-31`;
}

export default function OlympicCyclePage() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState("");

  const [cycle, setCycle] = useState<OlympicCycle | null>(null);
  const [annualPlans, setAnnualPlans] = useState<AnnualPlan[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const [cycleStartYear, setCycleStartYear] = useState(
    getDefaultCycleStartYear()
  );

  useEffect(() => {
    loadPage();
  }, [selectedTeamId]);

  async function loadPage() {
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
      .order("name");

    if (teamError) {
      setMessage(
        `Teams konnten nicht geladen werden: ${teamError.message}`
      );

      setLoading(false);
      return;
    }

    setTeams((teamData ?? []) as Team[]);

    let cycleQuery = supabase
      .from("olympic_cycles")
      .select(
        `
          id,
          coach_id,
          team_id,
          name,
          start_year,
          end_year,
          description
        `
      )
      .eq("coach_id", user.id);

    if (selectedTeamId) {
      cycleQuery = cycleQuery.eq("team_id", selectedTeamId);
    } else {
      cycleQuery = cycleQuery.is("team_id", null);
    }

    const { data: cycleData, error: cycleError } = await cycleQuery
      .order("created_at", {
        ascending: false,
      })
      .limit(1)
      .maybeSingle();

    if (cycleError) {
      setMessage(
        `Olympiazyklus konnte nicht geladen werden: ${cycleError.message}`
      );

      setLoading(false);
      return;
    }

    if (!cycleData) {
      setCycle(null);
      setAnnualPlans([]);
      setLoading(false);
      return;
    }

    const loadedCycle = cycleData as OlympicCycle;

    setCycle(loadedCycle);
    setCycleStartYear(loadedCycle.start_year);

    const { data: annualPlanData, error: annualPlanError } =
      await supabase
        .from("annual_plans")
        .select(
          `
            id,
            olympic_cycle_id,
            coach_id,
            team_id,
            cycle_year,
            title,
            main_competition,
            season_start,
            season_end,
            description
          `
        )
        .eq("olympic_cycle_id", loadedCycle.id)
        .order("cycle_year", {
          ascending: true,
        });

    if (annualPlanError) {
      setMessage(
        `Jahresplanungen konnten nicht geladen werden: ${annualPlanError.message}`
      );

      setLoading(false);
      return;
    }

    setAnnualPlans((annualPlanData ?? []) as AnnualPlan[]);
    setLoading(false);
  }

  async function createOlympicCycle() {
    setMessage("");
    setSaving(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setMessage("Coach konnte nicht geladen werden.");
      setSaving(false);
      return;
    }

    const { data, error } = await supabase
      .from("olympic_cycles")
      .insert({
        coach_id: user.id,
        team_id: selectedTeamId || null,
        name: "Olympiazyklus",
        start_year: cycleStartYear,
        end_year: cycleStartYear + 3,
        description: null,
      })
      .select(
        `
          id,
          coach_id,
          team_id,
          name,
          start_year,
          end_year,
          description
        `
      )
      .single();

    if (error) {
      setMessage(
        `Olympiazyklus konnte nicht erstellt werden: ${error.message}`
      );

      setSaving(false);
      return;
    }

    setCycle(data as OlympicCycle);
    setAnnualPlans([]);
    setMessage("Olympiazyklus erstellt ✅");
    setSaving(false);
  }

  async function createAnnualPlan(
    cycleYear: number,
    competition: string
  ) {
    if (!cycle) {
      setMessage("Bitte zuerst einen Olympiazyklus erstellen.");
      return;
    }

    setMessage("");
    setSaving(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setMessage("Coach konnte nicht geladen werden.");
      setSaving(false);
      return;
    }

    const planStartYear = cycle.start_year + (cycleYear - 1);

    const title = `Jahresplanung ${planStartYear}/${planStartYear + 1}`;

    const { error } = await supabase
      .from("annual_plans")
      .insert({
        olympic_cycle_id: cycle.id,
        coach_id: user.id,
        team_id: cycle.team_id,
        cycle_year: cycleYear,
        title,
        main_competition: competition,
        season_start: getSeasonStartDate(planStartYear),
        season_end: getSeasonEndDate(planStartYear),
        description: null,
      });

    if (error) {
      setMessage(
        `Jahresplanung konnte nicht erstellt werden: ${error.message}`
      );

      setSaving(false);
      return;
    }

    await loadPage();

    setMessage("Jahresplanung erstellt ✅");
    setSaving(false);
  }

  function getAnnualPlan(cycleYear: number) {
    return annualPlans.find(
      (plan) => plan.cycle_year === cycleYear
    );
  }

  function getTeamName() {
    if (!selectedTeamId) {
      return "Allgemeiner Zyklus";
    }

    return (
      teams.find((team) => team.id === selectedTeamId)?.name ??
      "Team"
    );
  }

  const currentCycleYear = useMemo(() => {
    if (!cycle) {
      return null;
    }

    const currentDate = getLocalDateString(new Date());

    for (const definition of cycleYearDefinitions) {
      const startYear =
        cycle.start_year + (definition.cycleYear - 1);

      const seasonStart = getSeasonStartDate(startYear);
      const seasonEnd = getSeasonEndDate(startYear);

      if (
        currentDate >= seasonStart &&
        currentDate <= seasonEnd
      ) {
        return definition.cycleYear;
      }
    }

    return null;
  }, [cycle]);

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-8 text-white">
      <div className="mx-auto max-w-7xl">
        {/* Kopf */}

        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm text-slate-400">
              Langfristige Planung
            </p>

            <h1 className="mt-1 text-3xl font-bold">
              Olympiazyklus
            </h1>

            <p className="mt-2 max-w-3xl text-slate-400">
              Vier Jahre als übergeordnete Ebene.
              Jedes Jahr besitzt später seine eigene Jahresplanung,
              Makrozyklen, Mikrozyklen und Trainingseinheiten.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <div className="rounded-xl border border-slate-800 bg-slate-900 px-4 py-3">
              <p className="text-[10px] uppercase tracking-wide text-slate-500">
                Team
              </p>

              <select
                value={selectedTeamId}
                onChange={(event) =>
                  setSelectedTeamId(event.target.value)
                }
                className="mt-1 min-w-44 bg-transparent text-sm font-semibold outline-none"
              >
                <option
                  value=""
                  className="bg-slate-900"
                >
                  Allgemein
                </option>

                {teams.map((team) => (
                  <option
                    key={team.id}
                    value={team.id}
                    className="bg-slate-900"
                  >
                    {team.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {message && (
          <div className="mt-6 rounded-xl border border-slate-700 bg-slate-900 p-4 text-sm">
            {message}
          </div>
        )}

        {loading ? (
          <div className="mt-8 rounded-2xl border border-slate-800 bg-slate-900 p-10 text-center text-slate-400">
            Wird geladen...
          </div>
        ) : !cycle ? (
          /*
            Noch kein Olympiazyklus
          */

          <section className="mt-8 rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <p className="text-sm text-slate-400">
              {getTeamName()}
            </p>

            <h2 className="mt-1 text-2xl font-semibold">
              Olympiazyklus anlegen
            </h2>

            <p className="mt-2 max-w-2xl text-sm text-slate-400">
              Für diese Ansicht existiert noch kein Olympiazyklus.
              Lege zuerst den Start des Vierjahreszeitraums fest.
            </p>

            <div className="mt-6 flex flex-wrap items-end gap-4">
              <div>
                <label className="mb-2 block text-sm text-slate-400">
                  Startjahr
                </label>

                <input
                  type="number"
                  value={cycleStartYear}
                  onChange={(event) =>
                    setCycleStartYear(
                      Number(event.target.value)
                    )
                  }
                  className="w-40 rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none"
                />
              </div>

              <div className="rounded-xl border border-slate-800 bg-slate-950 px-4 py-3">
                <p className="text-xs text-slate-500">
                  Zeitraum
                </p>

                <p className="mt-1 font-semibold">
                  {cycleStartYear} – {cycleStartYear + 3}
                </p>
              </div>

              <button
                type="button"
                disabled={saving}
                onClick={createOlympicCycle}
                className="rounded-xl bg-white px-5 py-3 font-semibold text-slate-950 disabled:opacity-50"
              >
                {saving
                  ? "Wird erstellt..."
                  : "Olympiazyklus erstellen"}
              </button>
            </div>
          </section>
        ) : (
          <>
            {/* Zyklus Info */}

            <section className="mt-8 rounded-2xl border border-slate-800 bg-slate-900 p-5">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-sm text-slate-400">
                    {getTeamName()}
                  </p>

                  <h2 className="mt-1 text-xl font-semibold">
                    {cycle.name}
                  </h2>

                  <p className="mt-1 text-sm text-slate-500">
                    {cycle.start_year} – {cycle.end_year}
                  </p>
                </div>

                <div className="rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-slate-400">
                  {annualPlans.length} von 4 Jahresplanungen angelegt
                </div>
              </div>
            </section>

            {/* Vier Jahre */}

            <section className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {cycleYearDefinitions.map((definition) => {
                const plan = getAnnualPlan(
                  definition.cycleYear
                );

                const seasonStartYear =
                  cycle.start_year +
                  (definition.cycleYear - 1);

                const isCurrent =
                  currentCycleYear ===
                  definition.cycleYear;

                return (
                  <div
                    key={definition.cycleYear}
                    className={`flex min-h-72 flex-col rounded-2xl border p-5 ${
                      isCurrent
                        ? "border-white bg-slate-800"
                        : "border-slate-800 bg-slate-900"
                    }`}
                  >
                    <div>
                      <div className="flex items-start justify-between gap-3">
                        <p className="text-xs uppercase tracking-wide text-slate-500">
                          {definition.label}
                        </p>

                        {isCurrent && (
                          <span className="rounded-full bg-white px-2 py-1 text-[9px] font-bold text-slate-950">
                            AKTUELL
                          </span>
                        )}
                      </div>

                      <p className="mt-2 text-sm text-slate-500">
                        Saison {seasonStartYear}/
                        {seasonStartYear + 1}
                      </p>

                      <h3 className="mt-4 text-xl font-semibold">
                        {definition.competition}
                      </h3>

                      {plan ? (
                        <div className="mt-5 rounded-xl border border-slate-700 bg-slate-950 p-4">
                          <p className="text-xs text-slate-500">
                            Jahresplanung
                          </p>

                          <p className="mt-1 font-semibold">
                            {plan.title}
                          </p>

                          <p className="mt-2 text-xs text-slate-500">
                            {plan.season_start} bis{" "}
                            {plan.season_end}
                          </p>
                        </div>
                      ) : (
                        <div className="mt-5 rounded-xl border border-dashed border-slate-700 bg-slate-950/50 p-4">
                          <p className="text-sm text-slate-500">
                            Noch keine Jahresplanung angelegt.
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="mt-auto pt-6">
                      {plan ? (
                        <Link
                          href={`/coach/training/season?annualPlanId=${plan.id}`}
                          className="block w-full rounded-xl bg-white px-4 py-3 text-center text-sm font-semibold text-slate-950"
                        >
                          Jahresplanung öffnen
                        </Link>
                      ) : (
                        <button
                          type="button"
                          disabled={saving}
                          onClick={() =>
                            createAnnualPlan(
                              definition.cycleYear,
                              definition.competition
                            )
                          }
                          className="w-full rounded-xl border border-slate-700 px-4 py-3 text-sm font-semibold hover:bg-slate-800 disabled:opacity-50"
                        >
                          Jahresplanung anlegen
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </section>

            {/* Hierarchie */}

            <section className="mt-6 rounded-2xl border border-slate-800 bg-slate-900 p-5">
              <p className="text-sm text-slate-400">
                Planungsstruktur
              </p>

              <div className="mt-4 flex flex-wrap items-center gap-3 text-sm">
                <span className="rounded-xl bg-white px-4 py-2 font-semibold text-slate-950">
                  Olympiazyklus
                </span>

                <span className="text-slate-600">
                  →
                </span>

                <span className="rounded-xl border border-slate-700 px-4 py-2">
                  Jahresplanung
                </span>

                <span className="text-slate-600">
                  →
                </span>

                <span className="rounded-xl border border-slate-700 px-4 py-2">
                  Makrozyklus
                </span>

                <span className="text-slate-600">
                  →
                </span>

                <span className="rounded-xl border border-slate-700 px-4 py-2">
                  Mikrozyklus
                </span>

                <span className="text-slate-600">
                  →
                </span>

                <span className="rounded-xl border border-slate-700 px-4 py-2">
                  Woche
                </span>

                <span className="text-slate-600">
                  →
                </span>

                <span className="rounded-xl border border-slate-700 px-4 py-2">
                  Trainingseinheit
                </span>
              </div>
            </section>
          </>
        )}

        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/coach/training/season"
            className="rounded-xl border border-slate-700 px-4 py-3 text-sm hover:bg-slate-800"
          >
            Bestehende Jahresplanung
          </Link>

          <Link
            href="/coach/training"
            className="rounded-xl border border-slate-700 px-4 py-3 text-sm hover:bg-slate-800"
          >
            ← Zurück zu Training
          </Link>
        </div>
      </div>
    </main>
  );
}