"use client";

import Link from "next/link";
import {
  FormEvent,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useParams } from "next/navigation";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { supabase } from "@/lib/supabase";
import {
  formatStroke,
  formatTime,
  getDistancesForStroke,
  parseSwimTimeToMs,
} from "@/lib/swim";

type AthleteProfile = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  birth_date: string | null;
  gender: string | null;
  nation: string | null;
  swimmer_id: string | null;
};

type Tab =
  | "infos"
  | "bestzeiten"
  | "jahresleistungen"
  | "entwicklung";

type Stroke =
  | "freestyle"
  | "backstroke"
  | "breaststroke"
  | "butterfly"
  | "medley";

type Discipline = {
  id: number;
  distance: string;
  stroke: Stroke;
  time: string;
  points: string;
};

type CompetitionForm = {
  resultDate: string;
  location: string;
  poolLength: "25" | "50";
};

type SwimResult = {
  id: string;
  athlete_id: string;
  result_date: string;
  pool_length: number;
  distance: number;
  stroke: Stroke;
  time_ms: number;
  location: string | null;
  points: number | null;
};

type StrokeFilter = "all" | Stroke;
type DistanceFilter = "all" | string;
type PoolFilter = "all" | "25" | "50";

type DevelopmentPeriod =
  | "year"
  | "season"
  | "all";

type BestTimeEvent = {
  distance: number;
  stroke: Stroke;
};

type DevelopmentChartRow = {
  date: string;
  dateLabel: string;
  time25?: number;
  time50?: number;
};

const BEST_TIME_EVENTS: BestTimeEvent[] = [
  { distance: 50, stroke: "freestyle" },
  { distance: 100, stroke: "freestyle" },
  { distance: 200, stroke: "freestyle" },
  { distance: 400, stroke: "freestyle" },
  { distance: 800, stroke: "freestyle" },
  { distance: 1500, stroke: "freestyle" },

  { distance: 50, stroke: "breaststroke" },
  { distance: 100, stroke: "breaststroke" },
  { distance: 200, stroke: "breaststroke" },

  { distance: 50, stroke: "backstroke" },
  { distance: 100, stroke: "backstroke" },
  { distance: 200, stroke: "backstroke" },

  { distance: 50, stroke: "butterfly" },
  { distance: 100, stroke: "butterfly" },
  { distance: 200, stroke: "butterfly" },

  { distance: 100, stroke: "medley" },
  { distance: 200, stroke: "medley" },
  { distance: 400, stroke: "medley" },
];

const initialCompetitionForm: CompetitionForm = {
  resultDate: "",
  location: "",
  poolLength: "25",
};

function createDiscipline(id: number): Discipline {
  return {
    id,
    distance: "100",
    stroke: "freestyle",
    time: "",
    points: "",
  };
}

function getFullName(
  athlete: AthleteProfile | null
) {
  if (!athlete) {
    return "Athlet";
  }

  const firstName =
    athlete.first_name?.trim() ?? "";

  const lastName =
    athlete.last_name?.trim() ?? "";

  return (
    `${firstName} ${lastName}`.trim() ||
    "Athlet"
  );
}

function formatBirthDate(
  date: string | null
) {
  if (!date) {
    return "–";
  }

  const parsedDate = new Date(
    `${date}T12:00:00`
  );

  if (
    Number.isNaN(
      parsedDate.getTime()
    )
  ) {
    return "–";
  }

  return parsedDate.toLocaleDateString(
    "de-DE",
    {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }
  );
}

function formatResultDate(
  date: string
) {
  const parsedDate = new Date(
    `${date}T12:00:00`
  );

  if (
    Number.isNaN(
      parsedDate.getTime()
    )
  ) {
    return date;
  }

  return parsedDate.toLocaleDateString(
    "de-DE",
    {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }
  );
}

function formatShortDate(
  date: string
) {
  const parsedDate = new Date(
    `${date}T12:00:00`
  );

  if (
    Number.isNaN(
      parsedDate.getTime()
    )
  ) {
    return date;
  }

  return parsedDate.toLocaleDateString(
    "de-DE",
    {
      month: "2-digit",
      year: "2-digit",
    }
  );
}

function formatGender(
  gender: string | null
) {
  if (!gender) {
    return "–";
  }

  const value =
    gender.trim().toLowerCase();

  if (
    value === "male" ||
    value === "m" ||
    value === "männlich" ||
    value === "maennlich"
  ) {
    return "männlich";
  }

  if (
    value === "female" ||
    value === "w" ||
    value === "weiblich"
  ) {
    return "weiblich";
  }

  return gender;
}

function findBestResult(
  results: SwimResult[],
  distance: number,
  stroke: Stroke,
  poolLength: 25 | 50
) {
  const matchingResults =
    results.filter(
      (result) =>
        result.distance ===
          distance &&
        result.stroke ===
          stroke &&
        result.pool_length ===
          poolLength
    );

  if (
    matchingResults.length === 0
  ) {
    return null;
  }

  return matchingResults.reduce(
    (best, current) => {
      if (
        current.time_ms <
        best.time_ms
      ) {
        return current;
      }

      if (
        current.time_ms ===
          best.time_ms &&
        current.result_date >
          best.result_date
      ) {
        return current;
      }

      return best;
    }
  );
}

function getResultYear(
  date: string
) {
  return new Date(
    `${date}T12:00:00`
  ).getFullYear();
}

function getSeasonStartYear(
  date: string
) {
  const parsedDate = new Date(
    `${date}T12:00:00`
  );

  const year =
    parsedDate.getFullYear();

  const month =
    parsedDate.getMonth() + 1;

  if (month >= 8) {
    return year;
  }

  return year - 1;
}

export default function AthleteDetailPage() {
  const params = useParams();

  const athleteId =
    typeof params.athleteId ===
    "string"
      ? params.athleteId
      : "";

  const [
    athlete,
    setAthlete,
  ] =
    useState<AthleteProfile | null>(
      null
    );

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    message,
    setMessage,
  ] = useState("");

  const [
    activeTab,
    setActiveTab,
  ] =
    useState<Tab>("infos");

  const [
    showResultForm,
    setShowResultForm,
  ] = useState(false);

  const [
    savingResult,
    setSavingResult,
  ] = useState(false);

  const [
    resultMessage,
    setResultMessage,
  ] = useState("");

  const [
    competitionForm,
    setCompetitionForm,
  ] =
    useState<CompetitionForm>(
      initialCompetitionForm
    );

  const [
    disciplines,
    setDisciplines,
  ] =
    useState<Discipline[]>([
      createDiscipline(1),
    ]);

  const [
    nextDisciplineId,
    setNextDisciplineId,
  ] = useState(2);

  const [
    results,
    setResults,
  ] =
    useState<SwimResult[]>([]);

  const [
    resultsLoading,
    setResultsLoading,
  ] = useState(false);

  const currentYear =
    new Date().getFullYear();

  const [
    selectedYear,
    setSelectedYear,
  ] = useState(currentYear);

  const [
    selectedStroke,
    setSelectedStroke,
  ] =
    useState<StrokeFilter>(
      "all"
    );

  const [
    selectedDistance,
    setSelectedDistance,
  ] =
    useState<DistanceFilter>(
      "all"
    );

  const [
    selectedPool,
    setSelectedPool,
  ] =
    useState<PoolFilter>(
      "all"
    );

  const [
    developmentStroke,
    setDevelopmentStroke,
  ] =
    useState<Stroke>(
      "freestyle"
    );

  const [
    developmentDistance,
    setDevelopmentDistance,
  ] = useState(100);

  const [
    developmentPeriod,
    setDevelopmentPeriod,
  ] =
    useState<DevelopmentPeriod>(
      "all"
    );

  const [
    developmentYear,
    setDevelopmentYear,
  ] = useState(currentYear);

  const [
    developmentSeason,
    setDevelopmentSeason,
  ] = useState(
    currentYear
  );

  useEffect(() => {
    if (!athleteId) {
      return;
    }

    loadAthlete();
    loadResults();
  }, [athleteId]);

  async function loadAthlete() {
    setLoading(true);
    setMessage("");

    const {
      data: { user },
      error: userError,
    } =
      await supabase.auth.getUser();

    if (
      userError ||
      !user
    ) {
      setMessage(
        "Coach konnte nicht geladen werden."
      );

      setLoading(false);
      return;
    }

    const {
      data,
      error,
    } =
      await supabase
        .from("profiles")
        .select(`
          id,
          first_name,
          last_name,
          birth_date,
          gender,
          nation,
          swimmer_id
        `)
        .eq("id", athleteId)
        .eq(
          "role",
          "athlete"
        )
        .single();

    if (
      error ||
      !data
    ) {
      setMessage(
        "Athlet konnte nicht geladen werden."
      );

      setLoading(false);
      return;
    }

    setAthlete(
      data as AthleteProfile
    );

    setLoading(false);
  }

  async function loadResults() {
    setResultsLoading(true);

    const {
      data,
      error,
    } =
      await supabase
        .from("swim_results")
        .select(`
          id,
          athlete_id,
          result_date,
          pool_length,
          distance,
          stroke,
          time_ms,
          location,
          points
        `)
        .eq(
          "athlete_id",
          athleteId
        )
        .order(
          "result_date",
          {
            ascending: false,
          }
        );

    if (error) {
      setResultMessage(
        `Ergebnisse konnten nicht geladen werden: ${error.message}`
      );

      setResultsLoading(false);
      return;
    }

    setResults(
      (data ??
        []) as SwimResult[]
    );

    setResultsLoading(false);
  }

  function tabClass(
    tab: Tab
  ) {
    const isActive =
      activeTab === tab;

    return `
      rounded-t-xl px-4 py-3 text-sm font-medium transition
      ${
        isActive
          ? "border border-b-0 border-app-border bg-app-surface text-app-heading"
          : "text-app-muted hover:bg-app-surface hover:text-app-heading"
      }
    `;
  }

  function updateCompetitionForm<
    K extends keyof CompetitionForm
  >(
    key: K,
    value: CompetitionForm[K]
  ) {
    setCompetitionForm(
      (current) => ({
        ...current,
        [key]: value,
      })
    );
  }

  function updateDiscipline<
    K extends keyof Omit<
      Discipline,
      "id"
    >
  >(
    id: number,
    key: K,
    value: Discipline[K]
  ) {
    setDisciplines(
      (current) =>
        current.map(
          (discipline) =>
            discipline.id ===
            id
              ? {
                  ...discipline,
                  [key]:
                    value,
                }
              : discipline
        )
    );
  }

  function addDiscipline() {
    setDisciplines(
      (current) => [
        ...current,
        createDiscipline(
          nextDisciplineId
        ),
      ]
    );

    setNextDisciplineId(
      (current) =>
        current + 1
    );
  }

  function removeDiscipline(
    id: number
  ) {
    setDisciplines(
      (current) =>
        current.filter(
          (
            discipline
          ) =>
            discipline.id !==
            id
        )
    );
  }

  function resetResultForm() {
    setCompetitionForm(
      initialCompetitionForm
    );

    setDisciplines([
      createDiscipline(1),
    ]);

    setNextDisciplineId(2);
  }

  function resetFilters() {
    setSelectedStroke(
      "all"
    );

    setSelectedDistance(
      "all"
    );

    setSelectedPool(
      "all"
    );
  }

  async function handleSaveResults(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setResultMessage("");

    if (!athleteId) {
      setResultMessage(
        "Athlet konnte nicht erkannt werden."
      );

      return;
    }

    if (
      !competitionForm.resultDate
    ) {
      setResultMessage(
        "Bitte ein Datum auswählen."
      );

      return;
    }

    if (
      disciplines.length === 0
    ) {
      setResultMessage(
        "Bitte mindestens eine Disziplin hinzufügen."
      );

      return;
    }

    const resultsToInsert =
      [];

    for (
      let index = 0;
      index <
      disciplines.length;
      index++
    ) {
      const discipline =
        disciplines[index];

      const timeMs =
        parseSwimTimeToMs(
          discipline.time
        );

      if (!timeMs) {
        setResultMessage(
          `Bitte bei Disziplin ${
            index + 1
          } eine gültige Zeit eingeben.`
        );

        return;
      }

      const points =
        discipline.points.trim() ===
        ""
          ? null
          : Number(
              discipline.points
            );

      if (
        points !== null &&
        (Number.isNaN(
          points
        ) ||
          points < 0)
      ) {
        setResultMessage(
          `Die Punkte bei Disziplin ${
            index + 1
          } sind nicht gültig.`
        );

        return;
      }

      resultsToInsert.push(
        {
          athlete_id:
            athleteId,
          result_date:
            competitionForm.resultDate,
          pool_length:
            Number(
              competitionForm.poolLength
            ),
          distance:
            Number(
              discipline.distance
            ),
          stroke:
            discipline.stroke,
          time_ms:
            timeMs,
          location:
            competitionForm.location.trim() ||
            null,
          points,
        }
      );
    }

    setSavingResult(true);

    const { error } =
      await supabase
        .from(
          "swim_results"
        )
        .insert(
          resultsToInsert
        );

    if (error) {
      setResultMessage(
        `Ergebnisse konnten nicht gespeichert werden: ${error.message}`
      );

      setSavingResult(
        false
      );

      return;
    }

    setResultMessage(
      `${
        resultsToInsert.length
      } Ergebnis${
        resultsToInsert.length ===
        1
          ? ""
          : "se"
      } gespeichert.`
    );

    resetResultForm();

    setSavingResult(
      false
    );

    setShowResultForm(
      false
    );

    await loadResults();
  }

  const availableYears =
    useMemo(() => {
      const years =
        results.map(
          (result) =>
            getResultYear(
              result.result_date
            )
        );

      years.push(
        currentYear
      );

      return Array.from(
        new Set(years)
      ).sort(
        (a, b) =>
          b - a
      );
    }, [
      results,
      currentYear,
    ]);

  const availableSeasons =
    useMemo(() => {
      const seasons =
        results.map(
          (result) =>
            getSeasonStartYear(
              result.result_date
            )
        );

      seasons.push(
        currentYear
      );

      return Array.from(
        new Set(seasons)
      ).sort(
        (a, b) =>
          b - a
      );
    }, [
      results,
      currentYear,
    ]);

  const yearlyResults =
    useMemo(() => {
      return results.filter(
        (result) =>
          getResultYear(
            result.result_date
          ) ===
          selectedYear
      );
    }, [
      results,
      selectedYear,
    ]);

  const filteredResults =
    useMemo(() => {
      return yearlyResults.filter(
        (result) => {
          const strokeMatches =
            selectedStroke ===
              "all" ||
            result.stroke ===
              selectedStroke;

          const distanceMatches =
            selectedDistance ===
              "all" ||
            result.distance ===
              Number(
                selectedDistance
              );

          const poolMatches =
            selectedPool ===
              "all" ||
            result.pool_length ===
              Number(
                selectedPool
              );

          return (
            strokeMatches &&
            distanceMatches &&
            poolMatches
          );
        }
      );
    }, [
      yearlyResults,
      selectedStroke,
      selectedDistance,
      selectedPool,
    ]);

  const developmentDistances =
    useMemo(
      () =>
        getDistancesForStroke(
          developmentStroke
        ),
      [
        developmentStroke,
      ]
    );

  const developmentResults =
    useMemo(() => {
      let filtered =
        results.filter(
          (result) =>
            result.stroke ===
              developmentStroke &&
            result.distance ===
              developmentDistance
        );

      if (
        developmentPeriod ===
        "year"
      ) {
        filtered =
          filtered.filter(
            (result) =>
              getResultYear(
                result.result_date
              ) ===
              developmentYear
          );
      }

      if (
        developmentPeriod ===
        "season"
      ) {
        filtered =
          filtered.filter(
            (result) =>
              getSeasonStartYear(
                result.result_date
              ) ===
              developmentSeason
          );
      }

      return filtered.sort(
        (a, b) =>
          a.result_date.localeCompare(
            b.result_date
          )
      );
    }, [
      results,
      developmentStroke,
      developmentDistance,
      developmentPeriod,
      developmentYear,
      developmentSeason,
    ]);

  const developmentChartData =
    useMemo(() => {
      const rows =
        new Map<
          string,
          DevelopmentChartRow
        >();

      developmentResults.forEach(
        (result) => {
          const key =
            result.result_date;

          const existing =
            rows.get(key) ?? {
              date: key,
              dateLabel:
                formatShortDate(
                  key
                ),
            };

          if (
            result.pool_length ===
            25
          ) {
            existing.time25 =
              result.time_ms;
          }

          if (
            result.pool_length ===
            50
          ) {
            existing.time50 =
              result.time_ms;
          }

          rows.set(
            key,
            existing
          );
        }
      );

      return Array.from(
        rows.values()
      ).sort(
        (a, b) =>
          a.date.localeCompare(
            b.date
          )
      );
    }, [
      developmentResults,
    ]);

  function getDevelopmentTitle() {
    if (
      developmentPeriod ===
      "year"
    ) {
      return `Jahr ${developmentYear}`;
    }

    if (
      developmentPeriod ===
      "season"
    ) {
      return `Saison ${developmentSeason}/${
        developmentSeason +
        1
      }`;
    }

    return "Gesamtentwicklung";
  }

  return (
    <main>
      <div className="mx-auto max-w-6xl">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm text-app-muted">
              Schwimmerabfrage
            </p>

            <h1 className="mt-1 text-3xl font-bold">
              {getFullName(
                athlete
              )}
            </h1>
          </div>

          {!loading &&
            athlete && (
              <button
                type="button"
                onClick={() => {
                  setResultMessage(
                    ""
                  );

                  setShowResultForm(
                    (
                      current
                    ) =>
                      !current
                  );
                }}
                className="rounded-xl bg-app-accent px-4 py-3 text-sm font-semibold text-app-accent-ink transition hover:brightness-110"
              >
                {showResultForm
                  ? "Eingabe schließen"
                  : "+ Wettkampftag eintragen"}
              </button>
            )}
        </header>

        {message && (
          <div className="mt-6 rounded-xl border border-app-bad/40 bg-app-bad/10 p-4 text-sm text-app-bad">
            {message}
          </div>
        )}

        {resultMessage && (
          <div className="mt-6 rounded-xl border border-app-border bg-app-surface p-4 text-sm text-app-text">
            {resultMessage}
          </div>
        )}

        {showResultForm &&
          athlete && (
            <section className="mt-6 overflow-hidden rounded-2xl border border-app-border bg-app-surface">
              <div className="border-b border-app-border px-6 py-4">
                <h2 className="text-lg font-semibold">
                  Wettkampftag eintragen
                </h2>
              </div>

              <form
                onSubmit={
                  handleSaveResults
                }
                className="p-6"
              >
                <p className="text-xs font-semibold uppercase tracking-wide text-app-muted">
                  Wettkampfdaten
                </p>

                <div className="mt-4 grid gap-5 md:grid-cols-3">
                  <FormField label="Datum">
                    <input
                      type="date"
                      value={
                        competitionForm.resultDate
                      }
                      onChange={(
                        event
                      ) =>
                        updateCompetitionForm(
                          "resultDate",
                          event.target
                            .value
                        )
                      }
                      required
                      className="w-full rounded-xl border border-app-border bg-app-bg px-4 py-3 text-sm outline-none transition focus:border-app-accent"
                    />
                  </FormField>

                  <FormField label="Ort">
                    <input
                      type="text"
                      value={
                        competitionForm.location
                      }
                      onChange={(
                        event
                      ) =>
                        updateCompetitionForm(
                          "location",
                          event.target
                            .value
                        )
                      }
                      placeholder="z. B. Frankfurt"
                      className="w-full rounded-xl border border-app-border bg-app-bg px-4 py-3 text-sm outline-none transition focus:border-app-accent"
                    />
                  </FormField>

                  <FormField label="Bahnlänge">
                    <select
                      value={
                        competitionForm.poolLength
                      }
                      onChange={(
                        event
                      ) =>
                        updateCompetitionForm(
                          "poolLength",
                          event.target
                            .value as
                            | "25"
                            | "50"
                        )
                      }
                      className="w-full rounded-xl border border-app-border bg-app-bg px-4 py-3 text-sm outline-none transition focus:border-app-accent"
                    >
                      <option value="25">
                        25m-Bahn
                      </option>

                      <option value="50">
                        50m-Bahn
                      </option>
                    </select>
                  </FormField>
                </div>

                <div className="mt-8 flex items-center justify-between gap-4 border-t border-app-border pt-7">
                  <h3 className="text-lg font-semibold">
                    Disziplinen
                  </h3>

                  <button
                    type="button"
                    onClick={
                      addDiscipline
                    }
                    className="rounded-xl border border-app-border px-4 py-2 text-sm transition hover:bg-app-elevated"
                  >
                    + Disziplin hinzufügen
                  </button>
                </div>

                <div className="mt-5 space-y-4">
                  {disciplines.map(
                    (
                      discipline,
                      index
                    ) => (
                      <div
                        key={
                          discipline.id
                        }
                        className="rounded-xl border border-app-border bg-app-bg p-4"
                      >
                        <div className="mb-4 flex items-center justify-between">
                          <p className="text-sm font-semibold text-app-text">
                            Disziplin{" "}
                            {index +
                              1}
                          </p>

                          {disciplines.length >
                            1 && (
                            <button
                              type="button"
                              onClick={() =>
                                removeDiscipline(
                                  discipline.id
                                )
                              }
                              className="text-sm text-app-bad transition hover:text-app-bad"
                            >
                              Entfernen
                            </button>
                          )}
                        </div>

                        <div className="grid gap-4 md:grid-cols-[130px_1fr_1fr_130px]">
                          <FormField label="Strecke">
                            <select
                              value={
                                discipline.distance
                              }
                              onChange={(
                                event
                              ) =>
                                updateDiscipline(
                                  discipline.id,
                                  "distance",
                                  event
                                    .target
                                    .value
                                )
                              }
                              className="w-full rounded-xl border border-app-border bg-app-surface px-4 py-3 text-sm outline-none transition focus:border-app-accent"
                            >
                              <option value="50">
                                50 m
                              </option>

                              <option value="100">
                                100 m
                              </option>

                              <option value="200">
                                200 m
                              </option>

                              <option value="400">
                                400 m
                              </option>

                              <option value="800">
                                800 m
                              </option>

                              <option value="1500">
                                1500 m
                              </option>
                            </select>
                          </FormField>

                          <FormField label="Schwimmart">
                            <select
                              value={
                                discipline.stroke
                              }
                              onChange={(
                                event
                              ) =>
                                updateDiscipline(
                                  discipline.id,
                                  "stroke",
                                  event
                                    .target
                                    .value as Stroke
                                )
                              }
                              className="w-full rounded-xl border border-app-border bg-app-surface px-4 py-3 text-sm outline-none transition focus:border-app-accent"
                            >
                              <option value="freestyle">
                                Freistil
                              </option>

                              <option value="backstroke">
                                Rücken
                              </option>

                              <option value="breaststroke">
                                Brust
                              </option>

                              <option value="butterfly">
                                Schmetterling
                              </option>

                              <option value="medley">
                                Lagen
                              </option>
                            </select>
                          </FormField>

                          <FormField label="Zeit">
                            <input
                              type="text"
                              value={
                                discipline.time
                              }
                              onChange={(
                                event
                              ) =>
                                updateDiscipline(
                                  discipline.id,
                                  "time",
                                  event
                                    .target
                                    .value
                                )
                              }
                              placeholder="z. B. 58,43 oder 1:02,15"
                              required
                              className="w-full rounded-xl border border-app-border bg-app-surface px-4 py-3 text-sm outline-none transition focus:border-app-accent"
                            />
                          </FormField>

                          <FormField label="Punkte">
                            <input
                              type="number"
                              min="0"
                              value={
                                discipline.points
                              }
                              onChange={(
                                event
                              ) =>
                                updateDiscipline(
                                  discipline.id,
                                  "points",
                                  event
                                    .target
                                    .value
                                )
                              }
                              placeholder="optional"
                              className="w-full rounded-xl border border-app-border bg-app-surface px-4 py-3 text-sm outline-none transition focus:border-app-accent"
                            />
                          </FormField>
                        </div>
                      </div>
                    )
                  )}
                </div>

                <div className="mt-6 flex flex-wrap gap-3 border-t border-app-border pt-6">
                  <button
                    type="submit"
                    disabled={
                      savingResult
                    }
                    className="rounded-xl bg-app-accent px-5 py-3 text-sm font-semibold text-app-accent-ink transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {savingResult
                      ? "Speichert..."
                      : "Wettkampftag speichern"}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      resetResultForm();
                      setResultMessage(
                        ""
                      );
                      setShowResultForm(
                        false
                      );
                    }}
                    className="rounded-xl border border-app-border px-5 py-3 text-sm text-app-text transition hover:bg-app-elevated"
                  >
                    Abbrechen
                  </button>
                </div>
              </form>
            </section>
          )}

        {loading ? (
          <div className="mt-8 rounded-2xl border border-app-border bg-app-surface p-10 text-center text-app-muted">
            Athlet wird geladen...
          </div>
        ) : athlete ? (
          <>
            <div className="mt-8 border-b border-app-border">
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() =>
                    setActiveTab(
                      "infos"
                    )
                  }
                  className={tabClass(
                    "infos"
                  )}
                >
                  Infos
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setActiveTab(
                      "bestzeiten"
                    )
                  }
                  className={tabClass(
                    "bestzeiten"
                  )}
                >
                  Bestzeiten
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setActiveTab(
                      "jahresleistungen"
                    )
                  }
                  className={tabClass(
                    "jahresleistungen"
                  )}
                >
                  Jahresleistungen
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setActiveTab(
                      "entwicklung"
                    )
                  }
                  className={tabClass(
                    "entwicklung"
                  )}
                >
                  Entwicklung
                </button>
              </div>
            </div>

            {activeTab ===
              "infos" && (
              <section className="mt-6 overflow-hidden rounded-2xl border border-app-border bg-app-surface">
                <div className="border-b border-app-border px-6 py-4">
                  <h2 className="text-lg font-semibold">
                    Athleteninformationen
                  </h2>
                </div>

                <div className="divide-y divide-app-border">
                  <InfoRow
                    label="Voller Name"
                    value={getFullName(
                      athlete
                    )}
                  />

                  <InfoRow
                    label="Geburtsdatum"
                    value={formatBirthDate(
                      athlete.birth_date
                    )}
                  />

                  <InfoRow
                    label="Geschlecht"
                    value={formatGender(
                      athlete.gender
                    )}
                  />

                  <InfoRow
                    label="Nation"
                    value={
                      athlete.nation ||
                      "–"
                    }
                  />

                  <InfoRow
                    label="ID-Nummer"
                    value={
                      athlete.swimmer_id ||
                      "–"
                    }
                  />
                </div>
              </section>
            )}

            {activeTab ===
              "bestzeiten" && (
              <section className="mt-6">
                {resultsLoading ? (
                  <div className="rounded-2xl border border-app-border bg-app-surface p-8 text-center text-app-muted">
                    Bestzeiten werden geladen...
                  </div>
                ) : (
                  <div className="grid gap-6 lg:grid-cols-2">
                    <BestTimesTable
                      title="25m Rekorde"
                      poolLength={25}
                      results={results}
                    />

                    <BestTimesTable
                      title="50m Rekorde"
                      poolLength={50}
                      results={results}
                    />
                  </div>
                )}
              </section>
            )}

            {activeTab ===
              "jahresleistungen" && (
              <section className="mt-6 overflow-hidden rounded-2xl border border-app-border bg-app-surface">
                <div className="border-b border-app-border px-6 py-5">
                  <h2 className="text-lg font-semibold">
                    Jahresleistungen
                  </h2>
                </div>

                <div className="border-b border-app-border bg-app-bg/30 px-6 py-5">
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <FilterField label="Jahr">
                      <select
                        value={
                          selectedYear
                        }
                        onChange={(
                          event
                        ) =>
                          setSelectedYear(
                            Number(
                              event
                                .target
                                .value
                            )
                          )
                        }
                        className="w-full rounded-xl border border-app-border bg-app-bg px-4 py-3 text-sm outline-none transition focus:border-app-accent"
                      >
                        {availableYears.map(
                          (year) => (
                            <option
                              key={
                                year
                              }
                              value={
                                year
                              }
                            >
                              {year}
                            </option>
                          )
                        )}
                      </select>
                    </FilterField>

                    <FilterField label="Schwimmart">
                      <select
                        value={
                          selectedStroke
                        }
                        onChange={(
                          event
                        ) =>
                          setSelectedStroke(
                            event
                              .target
                              .value as StrokeFilter
                          )
                        }
                        className="w-full rounded-xl border border-app-border bg-app-bg px-4 py-3 text-sm outline-none transition focus:border-app-accent"
                      >
                        <option value="all">
                          Alle
                        </option>

                        <option value="freestyle">
                          Freistil
                        </option>

                        <option value="backstroke">
                          Rücken
                        </option>

                        <option value="breaststroke">
                          Brust
                        </option>

                        <option value="butterfly">
                          Schmetterling
                        </option>

                        <option value="medley">
                          Lagen
                        </option>
                      </select>
                    </FilterField>

                    <FilterField label="Strecke">
                      <select
                        value={
                          selectedDistance
                        }
                        onChange={(
                          event
                        ) =>
                          setSelectedDistance(
                            event.target
                              .value
                          )
                        }
                        className="w-full rounded-xl border border-app-border bg-app-bg px-4 py-3 text-sm outline-none transition focus:border-app-accent"
                      >
                        <option value="all">
                          Alle
                        </option>

                        <option value="50">
                          50 m
                        </option>

                        <option value="100">
                          100 m
                        </option>

                        <option value="200">
                          200 m
                        </option>

                        <option value="400">
                          400 m
                        </option>

                        <option value="800">
                          800 m
                        </option>

                        <option value="1500">
                          1500 m
                        </option>
                      </select>
                    </FilterField>

                    <FilterField label="Bahnlänge">
                      <select
                        value={
                          selectedPool
                        }
                        onChange={(
                          event
                        ) =>
                          setSelectedPool(
                            event
                              .target
                              .value as PoolFilter
                          )
                        }
                        className="w-full rounded-xl border border-app-border bg-app-bg px-4 py-3 text-sm outline-none transition focus:border-app-accent"
                      >
                        <option value="all">
                          Alle
                        </option>

                        <option value="25">
                          25m-Bahn
                        </option>

                        <option value="50">
                          50m-Bahn
                        </option>
                      </select>
                    </FilterField>
                  </div>

                  <div className="mt-4 flex items-center justify-between gap-4">
                    <p className="text-sm text-app-muted">
                      {
                        filteredResults.length
                      }{" "}
                      {filteredResults.length ===
                      1
                        ? "Ergebnis"
                        : "Ergebnisse"}
                    </p>

                    <button
                      type="button"
                      onClick={
                        resetFilters
                      }
                      className="text-sm text-app-muted transition hover:text-app-heading"
                    >
                      Filter zurücksetzen
                    </button>
                  </div>
                </div>

                {resultsLoading ? (
                  <div className="p-8 text-center text-app-muted">
                    Ergebnisse werden geladen...
                  </div>
                ) : filteredResults.length ===
                  0 ? (
                  <div className="p-8 text-sm text-app-muted">
                    Für diese Auswahl sind keine Ergebnisse vorhanden.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[850px] text-left text-sm">
                      <thead className="border-b border-app-border bg-app-bg/60 text-app-muted">
                        <tr>
                          <th className="px-6 py-3 font-medium">
                            Datum
                          </th>

                          <th className="px-6 py-3 font-medium">
                            Disziplin
                          </th>

                          <th className="px-6 py-3 font-medium">
                            Zeit
                          </th>

                          <th className="px-6 py-3 font-medium">
                            Bahn
                          </th>

                          <th className="px-6 py-3 font-medium">
                            Ort
                          </th>

                          <th className="px-6 py-3 font-medium">
                            Punkte
                          </th>
                        </tr>
                      </thead>

                      <tbody>
                        {filteredResults.map(
                          (
                            result
                          ) => (
                            <tr
                              key={
                                result.id
                              }
                              className="border-b border-app-border last:border-b-0 hover:bg-app-elevated/40"
                            >
                              <td className="px-6 py-3 text-app-text">
                                {formatResultDate(
                                  result.result_date
                                )}
                              </td>

                              <td className="px-6 py-3 font-medium">
                                {
                                  result.distance
                                }{" "}
                                m{" "}
                                {formatStroke(
                                  result.stroke
                                )}
                              </td>

                              <td className="px-6 py-3 font-semibold">
                                {formatTime(
                                  result.time_ms
                                )}
                              </td>

                              <td className="px-6 py-3 text-app-text">
                                {
                                  result.pool_length
                                }{" "}
                                m
                              </td>

                              <td className="px-6 py-3 text-app-text">
                                {result.location ||
                                  "–"}
                              </td>

                              <td className="px-6 py-3 text-app-text">
                                {result.points ??
                                  "–"}
                              </td>
                            </tr>
                          )
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            )}

            {activeTab ===
              "entwicklung" && (
              <section className="mt-6 overflow-hidden rounded-2xl border border-app-border bg-app-surface">
                <div className="border-b border-app-border px-6 py-5">
                  <h2 className="text-lg font-semibold">
                    Entwicklung
                  </h2>
                </div>

                <div className="border-b border-app-border bg-app-bg/30 px-6 py-5">
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <FilterField label="Schwimmart">
                      <select
                        value={
                          developmentStroke
                        }
                        onChange={(
                          event
                        ) => {
                          const stroke =
                            event
                              .target
                              .value as Stroke;

                          setDevelopmentStroke(
                            stroke
                          );

                          const allowed =
                            getDistancesForStroke(
                              stroke
                            );

                          if (
                            !allowed.includes(
                              developmentDistance
                            )
                          ) {
                            setDevelopmentDistance(
                              allowed[0]
                            );
                          }
                        }}
                        className="w-full rounded-xl border border-app-border bg-app-bg px-4 py-3 text-sm outline-none"
                      >
                        <option value="freestyle">
                          Freistil
                        </option>

                        <option value="backstroke">
                          Rücken
                        </option>

                        <option value="breaststroke">
                          Brust
                        </option>

                        <option value="butterfly">
                          Schmetterling
                        </option>

                        <option value="medley">
                          Lagen
                        </option>
                      </select>
                    </FilterField>

                    <FilterField label="Strecke">
                      <select
                        value={
                          developmentDistance
                        }
                        onChange={(
                          event
                        ) =>
                          setDevelopmentDistance(
                            Number(
                              event
                                .target
                                .value
                            )
                          )
                        }
                        className="w-full rounded-xl border border-app-border bg-app-bg px-4 py-3 text-sm outline-none"
                      >
                        {developmentDistances.map(
                          (
                            distance
                          ) => (
                            <option
                              key={
                                distance
                              }
                              value={
                                distance
                              }
                            >
                              {
                                distance
                              }{" "}
                              m
                            </option>
                          )
                        )}
                      </select>
                    </FilterField>

                    <FilterField label="Zeitraum">
                      <select
                        value={
                          developmentPeriod
                        }
                        onChange={(
                          event
                        ) =>
                          setDevelopmentPeriod(
                            event
                              .target
                              .value as DevelopmentPeriod
                          )
                        }
                        className="w-full rounded-xl border border-app-border bg-app-bg px-4 py-3 text-sm outline-none"
                      >
                        <option value="all">
                          Gesamt
                        </option>

                        <option value="year">
                          Jahr
                        </option>

                        <option value="season">
                          Saison
                        </option>
                      </select>
                    </FilterField>

                    {developmentPeriod ===
                      "year" && (
                      <FilterField label="Jahr">
                        <select
                          value={
                            developmentYear
                          }
                          onChange={(
                            event
                          ) =>
                            setDevelopmentYear(
                              Number(
                                event
                                  .target
                                  .value
                              )
                            )
                          }
                          className="w-full rounded-xl border border-app-border bg-app-bg px-4 py-3 text-sm outline-none"
                        >
                          {availableYears.map(
                            (year) => (
                              <option
                                key={
                                  year
                                }
                                value={
                                  year
                                }
                              >
                                {year}
                              </option>
                            )
                          )}
                        </select>
                      </FilterField>
                    )}

                    {developmentPeriod ===
                      "season" && (
                      <FilterField label="Saison">
                        <select
                          value={
                            developmentSeason
                          }
                          onChange={(
                            event
                          ) =>
                            setDevelopmentSeason(
                              Number(
                                event
                                  .target
                                  .value
                              )
                            )
                          }
                          className="w-full rounded-xl border border-app-border bg-app-bg px-4 py-3 text-sm outline-none"
                        >
                          {availableSeasons.map(
                            (
                              season
                            ) => (
                              <option
                                key={
                                  season
                                }
                                value={
                                  season
                                }
                              >
                                {
                                  season
                                }
                                /
                                {season +
                                  1}
                              </option>
                            )
                          )}
                        </select>
                      </FilterField>
                    )}
                  </div>
                </div>

                <div className="p-6">
                  <div className="mb-5 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h3 className="font-semibold">
                        {
                          developmentDistance
                        }{" "}
                        m{" "}
                        {formatStroke(
                          developmentStroke
                        )}
                      </h3>

                      <p className="mt-1 text-sm text-app-muted">
                        {getDevelopmentTitle()} · 25m- und 50m-Bahn
                      </p>
                    </div>

                    <p className="text-sm text-app-faint">
                      {
                        developmentResults.length
                      }{" "}
                      {developmentResults.length ===
                      1
                        ? "Ergebnis"
                        : "Ergebnisse"}
                    </p>
                  </div>

                  {resultsLoading ? (
                    <div className="flex h-[420px] items-center justify-center text-app-muted">
                      Entwicklung wird geladen...
                    </div>
                  ) : developmentChartData.length ===
                    0 ? (
                    <div className="flex h-[420px] items-center justify-center rounded-xl border border-app-border bg-app-bg/40 text-sm text-app-muted">
                      Für diese Auswahl sind noch keine Ergebnisse vorhanden.
                    </div>
                  ) : (
                    <div className="h-[420px] w-full">
                      <ResponsiveContainer
                        width="100%"
                        height="100%"
                      >
                        <LineChart
                          data={
                            developmentChartData
                          }
                          margin={{
                            top: 20,
                            right: 25,
                            left: 15,
                            bottom: 15,
                          }}
                        >
                          <CartesianGrid
                            strokeDasharray="3 3"
                            stroke="var(--app-border)"
                          />

                          <XAxis
                            dataKey="dateLabel"
                            stroke="var(--app-muted)"
                            tick={{
                              fill: "var(--app-muted)",
                              fontSize: 12,
                            }}
                          />

                          <YAxis
                            stroke="var(--app-muted)"
                            tick={{
                              fill: "var(--app-muted)",
                              fontSize: 12,
                            }}
                            tickFormatter={(
                              value
                            ) =>
                              formatTime(
                                Number(
                                  value
                                )
                              )
                            }
                            width={75}
                          />

                          <Tooltip
                            contentStyle={{
                              backgroundColor:
                                "var(--app-surface)",
                              border:
                                "1px solid var(--app-border)",
                              borderRadius:
                                "12px",
                            }}
                            formatter={(
                              value,
                              name
                            ) => [
                              formatTime(
                                Number(
                                  value
                                )
                              ),
                              name,
                            ]}
                          />

                          <Legend />

                          <Line
                            type="monotone"
                            dataKey="time25"
                            name="25m-Bahn"
                            stroke="var(--chart-25)"
                            strokeWidth={3}
                            dot={{
                              r: 4,
                            }}
                            activeDot={{
                              r: 6,
                            }}
                            connectNulls
                          />

                          <Line
                            type="monotone"
                            dataKey="time50"
                            name="50m-Bahn"
                            stroke="var(--chart-50)"
                            strokeWidth={3}
                            dot={{
                              r: 4,
                            }}
                            activeDot={{
                              r: 6,
                            }}
                            connectNulls
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </div>
              </section>
            )}
          </>
        ) : null}

        <div className="mt-8">
          <Link
            href="/coach/swimmerabfrage"
            className="inline-block rounded-xl border border-app-border px-4 py-3 text-sm hover:bg-app-elevated"
          >
            ← Zurück zur Schwimmerabfrage
          </Link>
        </div>
      </div>
    </main>
  );
}

function BestTimesTable({
  title,
  poolLength,
  results,
}: {
  title: string;
  poolLength: 25 | 50;
  results: SwimResult[];
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-app-border bg-app-surface">
      <div className="border-b border-app-border px-5 py-4">
        <h2 className="text-lg font-semibold">
          {title}
        </h2>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[540px] text-left text-sm">
          <thead className="border-b border-app-border bg-app-bg/50 text-app-muted">
            <tr>
              <th className="px-4 py-3 font-medium">
                Strecke
              </th>

              <th className="px-4 py-3 font-medium">
                Zeit
              </th>

              <th className="px-4 py-3 font-medium">
                Ort
              </th>

              <th className="px-4 py-3 font-medium">
                Datum
              </th>
            </tr>
          </thead>

          <tbody>
            {BEST_TIME_EVENTS.map(
              (event, index) => {
                const bestResult =
                  findBestResult(
                    results,
                    event.distance,
                    event.stroke,
                    poolLength
                  );

                const previousEvent =
                  BEST_TIME_EVENTS[
                    index - 1
                  ];

                const startsNewStroke =
                  index > 0 &&
                  previousEvent.stroke !==
                    event.stroke;

                return (
                  <tr
                    key={`${poolLength}-${event.stroke}-${event.distance}`}
                    className={`border-b border-app-border last:border-b-0 ${
                      startsNewStroke
                        ? "border-t-2 border-t-app-border"
                        : ""
                    }`}
                  >
                    <td className="px-4 py-2.5 font-medium">
                      {event.distance} m{" "}
                      {formatStroke(
                        event.stroke
                      )}
                    </td>

                    <td className="px-4 py-2.5 font-semibold">
                      {bestResult
                        ? formatTime(
                            bestResult.time_ms
                          )
                        : "–"}
                    </td>

                    <td className="px-4 py-2.5 text-app-text">
                      {bestResult?.location ||
                        "–"}
                    </td>

                    <td className="px-4 py-2.5 text-app-muted">
                      {bestResult
                        ? formatResultDate(
                            bestResult.result_date
                          )
                        : "–"}
                    </td>
                  </tr>
                );
              }
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function InfoRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="grid gap-2 px-6 py-4 sm:grid-cols-[180px_1fr]">
      <div className="text-sm font-semibold text-app-text">
        {label}
      </div>

      <div className="text-sm text-app-heading">
        {value}
      </div>
    </div>
  );
}

function FormField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label>
      <span className="mb-2 block text-sm font-medium text-app-text">
        {label}
      </span>

      {children}
    </label>
  );
}

function FilterField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label>
      <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-app-faint">
        {label}
      </span>

      {children}
    </label>
  );
}