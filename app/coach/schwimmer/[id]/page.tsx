"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { supabase } from "@/lib/supabase";
import AthleteLinkCard from "@/components/AthleteLinkCard";
import SwimmerSeasonReport from "@/components/SwimmerSeasonReport";
import {
  Gender,
  OtherResult,
  PoolLength,
  QualifyingStandard,
  QualifyingTime,
  RESULT_COLUMNS,
  ROUNDS,
  ResultKind,
  STROKES,
  SWIMMER_DETAIL_COLUMNS,
  SWIM_EVENTS,
  SwimEvent,
  Stroke,
  SwimmerDetails,
  SwimmerResult,
  eventKey,
  findBestResult,
  findQualifyingTime,
  formatDate,
  formatEvent,
  formatEventShort,
  formatGender,
  formatMonthShort,
  formatMonthYear,
  formatTime,
  formatTimeDifference,
  getDistancesForStroke,
  getEventsForPool,
  getSwimmerName,
  getYear,
  inputClass,
  parseSwimTimeToMs,
  splitResults,
} from "@/lib/swim";

/*
 * Detailseite eines Schwimmers. Aufbau angelehnt an die
 * DSV-Schwimmerabfrage: Infos, Ergebnisse je Bahn,
 * Staffeln & Freiwasser, Bestzeiten, Entwicklung -
 * plus der Vergleich mit den eigenen Pflichtzeiten.
 */

type Tab = "infos" | "bahn" | "staffel" | "bestzeiten" | "entwicklung" | "pflichtzeiten" | "wettkaempfe";

const TABS: { value: Tab; label: string }[] = [
  { value: "infos", label: "Infos" },
  { value: "bahn", label: "25 & 50m Bahn" },
  { value: "staffel", label: "Staffeln & Freiwasser" },
  { value: "bestzeiten", label: "Bestzeiten" },
  { value: "entwicklung", label: "Entwicklung" },
  { value: "pflichtzeiten", label: "Pflichtzeiten" },
  { value: "wettkaempfe", label: "Saison-Auswertung" },
];

/* Felder, die im Tab "Infos" bearbeitet werden (alle als Text im Formular) */
type InfoDraft = {
  first_name: string;
  last_name: string;
  birth_date: string;
  birth_year: string;
  gender: "" | Gender;
  nationality: string;
  dsv_id: string;
  club_name: string;
  club_id: string;
  club_since: string;
};

type EntryRow = {
  id: number;
  stroke: Stroke;
  distance: string;
  time: string;
  points: string;
  round: string;
  isSplit: boolean;
  label: string;
  placement: string;
};

function todayIso() {
  const now = new Date();
  const month = `${now.getMonth() + 1}`.padStart(2, "0");
  const day = `${now.getDate()}`.padStart(2, "0");

  return `${now.getFullYear()}-${month}-${day}`;
}

function createEntryRow(id: number): EntryRow {
  return {
    id,
    stroke: "freestyle",
    distance: "100",
    time: "",
    points: "",
    round: "",
    isSplit: false,
    label: "",
    placement: "",
  };
}

function toDraft(swimmer: SwimmerDetails): InfoDraft {
  return {
    first_name: swimmer.first_name,
    last_name: swimmer.last_name ?? "",
    birth_date: swimmer.birth_date ?? "",
    birth_year: swimmer.birth_year ? `${swimmer.birth_year}` : "",
    gender: swimmer.gender ?? "",
    nationality: swimmer.nationality ?? "",
    dsv_id: swimmer.dsv_id ?? "",
    club_name: swimmer.club_name ?? "",
    club_id: swimmer.club_id ?? "",
    club_since: swimmer.club_since ?? "",
  };
}

function optionalNumber(value: string) {
  if (!value.trim()) {
    return { ok: true, value: null as number | null };
  }

  const number = Number(value);

  return { ok: Number.isInteger(number) && number >= 0, value: number };
}

export default function SchwimmerDetailPage() {
  const params = useParams();
  const swimmerId = typeof params.id === "string" ? params.id : "";

  const [swimmer, setSwimmer] = useState<SwimmerDetails | null>(null);
  const [poolResults, setPoolResults] = useState<SwimmerResult[]>([]);
  const [otherResults, setOtherResults] = useState<OtherResult[]>([]);
  const [standards, setStandards] = useState<QualifyingStandard[]>([]);
  const [qualifyingTimes, setQualifyingTimes] = useState<QualifyingTime[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  const [tab, setTab] = useState<Tab>("infos");
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [standardId, setStandardId] = useState("");
  const [chartEventKey, setChartEventKey] = useState("");

  const [editingInfos, setEditingInfos] = useState(false);
  const [draft, setDraft] = useState<InfoDraft | null>(null);

  const [showEntryForm, setShowEntryForm] = useState(false);
  const [entryKind, setEntryKind] = useState<ResultKind>("einzel");
  const [entryDate, setEntryDate] = useState(todayIso());
  const [entryLocation, setEntryLocation] = useState("");
  const [entryPool, setEntryPool] = useState<PoolLength>(50);
  const [entryRows, setEntryRows] = useState<EntryRow[]>([createEntryRow(1)]);
  const [savingEntries, setSavingEntries] = useState(false);

  const loadData = useCallback(async () => {
    const [swimmerResponse, resultResponse, standardResponse, timeResponse] =
      await Promise.all([
        supabase.from("swimmers").select(SWIMMER_DETAIL_COLUMNS).eq("id", swimmerId).single(),
        supabase
          .from("swimmer_results")
          .select(RESULT_COLUMNS)
          .eq("swimmer_id", swimmerId)
          .order("result_date"),
        supabase
          .from("qualifying_standards")
          .select("id, name, pool_length, valid_from, valid_to")
          .order("created_at", { ascending: false }),
        supabase
          .from("qualifying_times")
          .select("id, standard_id, gender, birth_year_from, birth_year_to, distance, stroke, time_ms"),
      ]);

    if (swimmerResponse.error || !swimmerResponse.data) {
      setMessage(
        swimmerResponse.error?.message.includes("column")
          ? "Die Datenbank ist noch nicht auf dem neuesten Stand. Bitte führe supabase/schwimmer_erweiterung.sql im Supabase SQL-Editor aus."
          : "Schwimmer konnte nicht geladen werden."
      );
      setLoading(false);
      return;
    }

    if (resultResponse.error) {
      setMessage(`Ergebnisse konnten nicht geladen werden: ${resultResponse.error.message}`);
    }

    const { pool, other } = splitResults(resultResponse.data ?? []);

    setSwimmer(swimmerResponse.data as SwimmerDetails);
    setPoolResults(pool);
    setOtherResults(other);
    setStandards((standardResponse.data ?? []) as QualifyingStandard[]);
    setQualifyingTimes((timeResponse.data ?? []) as QualifyingTime[]);
    setLoading(false);
  }, [swimmerId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Daten beim Oeffnen laden
    if (swimmerId) loadData();
  }, [swimmerId, loadData]);

  const availableYears = useMemo(() => {
    const years = new Set(
      [...poolResults, ...otherResults].map((result) => getYear(result.result_date))
    );
    years.add(new Date().getFullYear());

    return [...years].sort((a, b) => b - a);
  }, [poolResults, otherResults]);

  const yearPoolResults = poolResults.filter(
    (result) => getYear(result.result_date) === selectedYear
  );
  const yearOtherResults = otherResults.filter(
    (result) => getYear(result.result_date) === selectedYear
  );

  const selectedStandard = standards.find((standard) => standard.id === standardId) ?? null;
  const standardTimes = qualifyingTimes.filter((time) => time.standard_id === standardId);

  /* ---------- Infos bearbeiten ---------- */

  function startEditingInfos() {
    if (swimmer) {
      setDraft(toDraft(swimmer));
      setEditingInfos(true);
      setTab("infos");
    }
  }

  function updateDraft<K extends keyof InfoDraft>(key: K, value: InfoDraft[K]) {
    setDraft((current) => (current ? { ...current, [key]: value } : current));
  }

  async function handleSaveInfos(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!draft) {
      return;
    }

    if (!draft.first_name.trim()) {
      setMessage("Der Vorname darf nicht leer sein.");
      return;
    }

    /* Ist ein Geburtsdatum eingetragen, ergibt sich der Jahrgang daraus. */
    const birthYear = draft.birth_date
      ? Number(draft.birth_date.slice(0, 4))
      : draft.birth_year.trim()
        ? Number(draft.birth_year)
        : null;

    if (birthYear !== null && (!Number.isInteger(birthYear) || birthYear < 1950 || birthYear > 2100)) {
      setMessage("Bitte gib den Jahrgang vierstellig ein, z. B. 2012.");
      return;
    }

    const clean = (value: string) => value.trim() || null;

    const { error } = await supabase
      .from("swimmers")
      .update({
        first_name: draft.first_name.trim(),
        last_name: clean(draft.last_name),
        birth_date: draft.birth_date || null,
        birth_year: birthYear,
        gender: draft.gender || null,
        nationality: clean(draft.nationality),
        dsv_id: clean(draft.dsv_id),
        club_name: clean(draft.club_name),
        club_id: clean(draft.club_id),
        club_since: draft.club_since || null,
      })
      .eq("id", swimmerId);

    if (error) {
      setMessage(`Änderungen konnten nicht gespeichert werden: ${error.message}`);
      return;
    }

    setMessage("Daten gespeichert ✅");
    setEditingInfos(false);
    await loadData();
  }

  /* ---------- Ergebnisse eintragen ---------- */

  function updateEntryRow<K extends keyof EntryRow>(id: number, key: K, value: EntryRow[K]) {
    setEntryRows((rows) =>
      rows.map((row) => {
        if (row.id !== id) {
          return row;
        }

        const updated = { ...row, [key]: value };

        if (key === "stroke") {
          const distances = getDistancesForStroke(value as Stroke);

          if (!distances.includes(Number(updated.distance))) {
            updated.distance = `${distances[0]}`;
          }
        }

        return updated;
      })
    );
  }

  function addEntryRow() {
    setEntryRows((rows) => [
      ...rows,
      createEntryRow(Math.max(0, ...rows.map((row) => row.id)) + 1),
    ]);
  }

  function changeEntryKind(kind: ResultKind) {
    setEntryKind(kind);
    setEntryRows([createEntryRow(1)]);
  }

  async function handleSaveEntries(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const filledRows = entryRows.filter((row) => row.time.trim());

    if (filledRows.length === 0) {
      setMessage("Bitte trag mindestens eine Zeit ein.");
      return;
    }

    const toInsert = [];

    for (const row of filledRows) {
      const timeMs = parseSwimTimeToMs(row.time);

      if (timeMs === null) {
        setMessage(`„${row.time}“ ist keine gültige Zeit. Schreibweise z. B. 31,45 oder 1:05,23.`);
        return;
      }

      const points = optionalNumber(row.points);
      const placement = optionalNumber(row.placement);

      if (!points.ok || !placement.ok) {
        setMessage("Punkte und Platz bitte als ganze Zahl eintragen.");
        return;
      }

      if (entryKind !== "einzel" && !row.label.trim()) {
        setMessage("Bitte gib die Strecke an, z. B. „4x100 F“ oder „5 km“.");
        return;
      }

      const base = {
        swimmer_id: swimmerId,
        kind: entryKind,
        result_date: entryDate,
        location: entryLocation.trim() || null,
        time_ms: timeMs,
        points: points.value,
      };

      toInsert.push(
        entryKind === "einzel"
          ? {
              ...base,
              pool_length: entryPool,
              distance: Number(row.distance),
              stroke: row.stroke,
              round: row.round || null,
              is_split: row.isSplit,
            }
          : {
              ...base,
              event_label: row.label.trim(),
              placement: placement.value,
            }
      );
    }

    setSavingEntries(true);
    setMessage("");

    const { error } = await supabase.from("swimmer_results").insert(toInsert);

    setSavingEntries(false);

    if (error) {
      setMessage(
        error.message.includes("column")
          ? "Die Datenbank ist noch nicht auf dem neuesten Stand. Bitte führe supabase/schwimmer_erweiterung.sql im Supabase SQL-Editor aus."
          : `Ergebnisse konnten nicht gespeichert werden: ${error.message}`
      );
      return;
    }

    setMessage(`${toInsert.length} ${toInsert.length === 1 ? "Ergebnis" : "Ergebnisse"} gespeichert ✅`);
    setEntryRows([createEntryRow(1)]);
    setSelectedYear(getYear(entryDate));
    setTab(entryKind === "einzel" ? "bahn" : "staffel");
    await loadData();
  }

  async function handleDeleteResult(id: string, description: string) {
    if (!window.confirm(`${description} löschen?`)) {
      return;
    }

    const { error } = await supabase.from("swimmer_results").delete().eq("id", id);

    if (error) {
      setMessage(`Ergebnis konnte nicht gelöscht werden: ${error.message}`);
      return;
    }

    await loadData();
  }

  /* ---------- Anzeige ---------- */

  if (loading) {
    return (
      <main className="mx-auto max-w-6xl">
        <div className="rounded-2xl border border-app-border bg-app-surface p-10 text-center text-app-muted">
          Schwimmer wird geladen...
        </div>
      </main>
    );
  }

  if (!swimmer) {
    return (
      <main className="mx-auto max-w-6xl">
        <div className="rounded-xl border border-app-bad/40 bg-app-bad/10 p-4 text-sm text-app-bad">
          {message || "Schwimmer nicht gefunden."}
        </div>
        <BackLink />
      </main>
    );
  }

  const age = (year: number) =>
    swimmer.birth_year ? ` (${year - swimmer.birth_year} Jahre)` : "";

  return (
    <main>
      <div className="mx-auto max-w-6xl">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm text-app-muted">Meine Schwimmer</p>
            <h1 className="mt-1 text-3xl font-bold">{getSwimmerName(swimmer)}</h1>
            <p className="mt-2 text-app-muted">
              Jahrgang {swimmer.birth_year ?? "–"} · {formatGender(swimmer.gender)}
              {swimmer.club_name ? ` · ${swimmer.club_name}` : ""}
            </p>
          </div>

          <button
            type="button"
            onClick={() => setShowEntryForm((open) => !open)}
            className="rounded-xl bg-app-accent px-5 py-3 text-sm font-semibold text-app-accent-ink transition hover:opacity-90"
          >
            {showEntryForm ? "Eingabe schließen" : "+ Ergebnisse eintragen"}
          </button>
        </header>

        {message && (
          <div className="mt-6 rounded-xl border border-app-border bg-app-surface p-4 text-sm text-app-text">
            {message}
          </div>
        )}

        {showEntryForm && (
          <EntryForm
            kind={entryKind}
            onKindChange={changeEntryKind}
            date={entryDate}
            onDateChange={setEntryDate}
            location={entryLocation}
            onLocationChange={setEntryLocation}
            pool={entryPool}
            onPoolChange={setEntryPool}
            rows={entryRows}
            onRowChange={updateEntryRow}
            onAddRow={addEntryRow}
            onRemoveRow={(id) => setEntryRows((rows) => rows.filter((row) => row.id !== id))}
            saving={savingEntries}
            onSubmit={handleSaveEntries}
          />
        )}

        <div className="mt-8 flex flex-wrap items-center gap-3">
          <span className="text-sm font-medium text-app-text">Ergebnisjahr:</span>
          <select
            value={selectedYear}
            onChange={(event) => setSelectedYear(Number(event.target.value))}
            aria-label="Ergebnisjahr"
            className={`${inputClass} w-auto py-2`}
          >
            {availableYears.map((year) => (
              <option key={year} value={year}>
                {year}
                {age(year)}
              </option>
            ))}
          </select>
        </div>

        <nav className="mt-4 flex flex-wrap gap-1 border-b border-app-border">
          {TABS.map((item) => (
            <button
              key={item.value}
              type="button"
              onClick={() => setTab(item.value)}
              className={`-mb-px rounded-t-xl border px-4 py-2.5 text-sm transition ${
                tab === item.value
                  ? "border-app-border border-b-app-bg bg-app-bg font-semibold text-app-heading"
                  : "border-transparent text-app-accent hover:text-app-accent"
              }`}
            >
              {item.label}
            </button>
          ))}
        </nav>

        {tab === "infos" && (
          editingInfos && draft ? (
            <InfoForm
              draft={draft}
              onChange={updateDraft}
              onSubmit={handleSaveInfos}
              onCancel={() => setEditingInfos(false)}
            />
          ) : (
            <div className="mt-6 grid gap-6 lg:grid-cols-2">
              <Card
                title="Registrierdaten"
                action={
                  <button type="button" onClick={startEditingInfos} className="text-sm text-app-accent hover:text-app-accent">
                    bearbeiten
                  </button>
                }
              >
                <InfoRow label="ID-Nummer" value={swimmer.dsv_id} />
                <InfoRow label="Geburtstag" value={swimmer.birth_date ? formatDate(swimmer.birth_date) : swimmer.birth_year ? `Jahrgang ${swimmer.birth_year}` : null} />
                <InfoRow label="Geschlecht" value={swimmer.gender ? formatGender(swimmer.gender) : null} />
                <InfoRow label="Nationalität" value={swimmer.nationality} />
              </Card>

              <Card title="Verein">
                <InfoRow label="Vereinsname" value={swimmer.club_name} />
                <InfoRow label="Vereins-ID" value={swimmer.club_id} />
                <InfoRow label="Mitglied seit" value={swimmer.club_since ? formatDate(swimmer.club_since) : null} />
              </Card>

              <div className="lg:col-span-2">
                <AthleteLinkCard swimmerId={swimmerId} />
              </div>
            </div>
          )
        )}

        {tab === "bahn" && (
          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            {([25, 50] as PoolLength[]).map((pool) => {
              const rows = yearPoolResults.filter((result) => result.pool_length === pool);

              return (
                <Card key={pool} title={`${pool}m Ergebnisse: ${rows.length}`}>
                  {rows.length === 0 ? (
                    <Empty>Keine Ergebnisse {selectedYear} auf der {pool}m-Bahn.</Empty>
                  ) : (
                    <Table headers={["Strecke", "Zeit", "Punkte", "Stadt", "Monat", ""]}>
                      {rows.map((result) => (
                        <tr key={result.id} className="border-b border-app-border last:border-b-0 even:bg-app-bg/40">
                          <td className="px-4 py-2 font-medium">
                            {formatEventShort(result)}
                            {result.round && (
                              <span className="ml-2 text-xs font-normal text-app-muted">{result.round}</span>
                            )}
                          </td>
                          <td className="px-4 py-2 font-semibold text-app-heading">
                            {formatTime(result.time_ms)}
                            {result.is_split && <span className="ml-1.5 text-xs font-normal text-app-muted">(Zw.)</span>}
                          </td>
                          <td className="px-4 py-2">{result.points ?? "–"}</td>
                          <td className="px-4 py-2 text-app-accent">{result.location || "–"}</td>
                          <td className="px-4 py-2 text-app-muted">{formatMonthShort(result.result_date)}</td>
                          <td className="px-2 py-2 text-right">
                            <DeleteButton
                              onClick={() =>
                                handleDeleteResult(
                                  result.id,
                                  `${formatEventShort(result)} in ${formatTime(result.time_ms)} vom ${formatDate(result.result_date)}`
                                )
                              }
                            />
                          </td>
                        </tr>
                      ))}
                    </Table>
                  )}
                </Card>
              );
            })}
          </div>
        )}

        {tab === "staffel" && (
          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            {(["staffel", "freiwasser"] as const).map((kind) => {
              const rows = yearOtherResults.filter((result) => result.kind === kind);

              return (
                <Card key={kind} title={kind === "staffel" ? "Staffel Ergebnisse" : "Freiwasser"}>
                  {rows.length === 0 ? (
                    <Empty>
                      Keine Ergebnisse {kind === "staffel" ? "in Staffeln" : "im Freiwasser"} {selectedYear}.
                    </Empty>
                  ) : (
                    <Table
                      headers={[
                        "Strecke",
                        "Zeit",
                        kind === "staffel" ? "Pos." : "Punkte",
                        "Stadt",
                        "Monat",
                        "",
                      ]}
                    >
                      {rows.map((result) => (
                        <tr key={result.id} className="border-b border-app-border last:border-b-0 even:bg-app-bg/40">
                          <td className="px-4 py-2 font-medium">{result.event_label}</td>
                          <td className="px-4 py-2 font-semibold text-app-heading">{formatTime(result.time_ms)}</td>
                          <td className="px-4 py-2">
                            {kind === "staffel"
                              ? result.placement
                                ? `Pos ${result.placement}`
                                : "–"
                              : result.points ?? "–"}
                          </td>
                          <td className="px-4 py-2 text-app-accent">{result.location || "–"}</td>
                          <td className="px-4 py-2 text-app-muted">{formatMonthShort(result.result_date)}</td>
                          <td className="px-2 py-2 text-right">
                            <DeleteButton
                              onClick={() =>
                                handleDeleteResult(
                                  result.id,
                                  `${result.event_label} in ${formatTime(result.time_ms)} vom ${formatDate(result.result_date)}`
                                )
                              }
                            />
                          </td>
                        </tr>
                      ))}
                    </Table>
                  )}
                </Card>
              );
            })}
          </div>
        )}

        {tab === "bestzeiten" && (
          <>
            <p className="mt-6 text-sm text-app-muted">Beste Zeiten über alle Jahre.</p>
            <div className="mt-3 grid gap-6 lg:grid-cols-2">
              {([25, 50] as PoolLength[]).map((pool) => (
                <Card key={pool} title={`${pool}m Rekorde`}>
                  <Table headers={["Strecke", "Zeit", "Ort", "Datum"]}>
                    {getEventsForPool(pool).map((event) => {
                      const best = findBestResult(poolResults, event, pool);

                      return (
                        <tr key={eventKey(event)} className="border-b border-app-border last:border-b-0 even:bg-app-bg/40">
                          <td className="px-4 py-2 font-medium">{formatEventShort(event).replace(" ", "")}</td>
                          <td className="px-4 py-2 font-semibold text-app-heading">{best ? formatTime(best.time_ms) : ""}</td>
                          <td className="px-4 py-2">{best?.location ?? ""}</td>
                          <td className="px-4 py-2 text-right text-app-muted">
                            {best ? formatMonthYear(best.result_date) : ""}
                          </td>
                        </tr>
                      );
                    })}
                  </Table>
                </Card>
              ))}
            </div>
          </>
        )}

        {tab === "entwicklung" && (
          <DevelopmentChart
            results={poolResults}
            swimmer={swimmer}
            standards={standards}
            standardId={standardId}
            onStandardChange={setStandardId}
            standardTimes={standardTimes}
            selectedStandard={selectedStandard}
            chartEventKey={chartEventKey}
            onEventChange={setChartEventKey}
          />
        )}

        {tab === "wettkaempfe" && <SwimmerSeasonReport swimmerId={swimmerId} />}

        {tab === "pflichtzeiten" && (
          <QualificationTable
            results={poolResults}
            swimmer={swimmer}
            standards={standards}
            standardId={standardId}
            onStandardChange={setStandardId}
            standardTimes={standardTimes}
            selectedStandard={selectedStandard}
            onEditInfos={startEditingInfos}
          />
        )}

        <BackLink />
      </div>
    </main>
  );
}

/* ================= Eingabeformular ================= */

function EntryForm({
  kind,
  onKindChange,
  date,
  onDateChange,
  location,
  onLocationChange,
  pool,
  onPoolChange,
  rows,
  onRowChange,
  onAddRow,
  onRemoveRow,
  saving,
  onSubmit,
}: {
  kind: ResultKind;
  onKindChange: (kind: ResultKind) => void;
  date: string;
  onDateChange: (value: string) => void;
  location: string;
  onLocationChange: (value: string) => void;
  pool: PoolLength;
  onPoolChange: (value: PoolLength) => void;
  rows: EntryRow[];
  onRowChange: <K extends keyof EntryRow>(id: number, key: K, value: EntryRow[K]) => void;
  onAddRow: () => void;
  onRemoveRow: (id: number) => void;
  saving: boolean;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  const kinds: { value: ResultKind; label: string }[] = [
    { value: "einzel", label: "Einzelstrecken" },
    { value: "staffel", label: "Staffel" },
    { value: "freiwasser", label: "Freiwasser" },
  ];

  return (
    <section className="mt-6 overflow-hidden rounded-2xl border border-app-border bg-app-surface">
      <div className="border-b border-app-border px-6 py-4">
        <h2 className="text-lg font-semibold">Ergebnisse eintragen</h2>
        <p className="mt-1 text-sm text-app-muted">
          Ein Wettkampf, beliebig viele Strecken. Zeiten wie gewohnt: 31,45 oder 1:05,23. Leere
          Zeilen werden ignoriert.
        </p>

        <div className="mt-4 inline-flex rounded-xl border border-app-border p-1">
          {kinds.map((item) => (
            <button
              key={item.value}
              type="button"
              onClick={() => onKindChange(item.value)}
              className={`rounded-lg px-3 py-1.5 text-sm transition ${
                kind === item.value
                  ? "bg-app-accent font-semibold text-app-accent-ink"
                  : "text-app-text hover:bg-app-elevated"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <form onSubmit={onSubmit} className="p-6">
        <div className={`grid gap-4 ${kind === "einzel" ? "md:grid-cols-3" : "md:grid-cols-2"}`}>
          <FormField label="Datum *">
            <input type="date" value={date} onChange={(e) => onDateChange(e.target.value)} required className={inputClass} />
          </FormField>

          <FormField label="Stadt / Wettkampf">
            <input
              type="text"
              value={location}
              onChange={(e) => onLocationChange(e.target.value)}
              placeholder="z. B. Darmstadt"
              className={inputClass}
            />
          </FormField>

          {kind === "einzel" && (
            <FormField label="Bahnlänge">
              <select value={pool} onChange={(e) => onPoolChange(Number(e.target.value) as PoolLength)} className={inputClass}>
                <option value={50}>50m-Bahn</option>
                <option value={25}>25m-Bahn</option>
              </select>
            </FormField>
          )}
        </div>

        <div className="mt-6 space-y-3">
          {rows.map((row) => (
            <div key={row.id} className="rounded-xl border border-app-border bg-app-bg p-3">
              {kind === "einzel" ? (
                <div className="grid grid-cols-2 gap-3 md:grid-cols-[1.3fr_0.9fr_1fr_0.8fr_1fr_auto_auto] md:items-center">
                  <select value={row.stroke} onChange={(e) => onRowChange(row.id, "stroke", e.target.value as Stroke)} aria-label="Lage" className={inputClass}>
                    {STROKES.map((stroke) => (
                      <option key={stroke.value} value={stroke.value}>{stroke.label}</option>
                    ))}
                  </select>

                  <select value={row.distance} onChange={(e) => onRowChange(row.id, "distance", e.target.value)} aria-label="Strecke" className={inputClass}>
                    {getDistancesForStroke(row.stroke).map((distance) => (
                      <option key={distance} value={distance}>{distance} m</option>
                    ))}
                  </select>

                  <input type="text" inputMode="decimal" value={row.time} onChange={(e) => onRowChange(row.id, "time", e.target.value)} placeholder="Zeit 1:05,23" aria-label="Zeit" className={inputClass} />

                  <input type="text" inputMode="numeric" value={row.points} onChange={(e) => onRowChange(row.id, "points", e.target.value)} placeholder="Punkte" aria-label="Punkte" className={inputClass} />

                  <select value={row.round} onChange={(e) => onRowChange(row.id, "round", e.target.value)} aria-label="Lauf" className={inputClass}>
                    <option value="">– Lauf –</option>
                    {ROUNDS.map((round) => (
                      <option key={round} value={round}>{round}</option>
                    ))}
                  </select>

                  <label className="flex items-center gap-2 text-sm text-app-text" title="Zwischenzeit aus einer längeren Strecke">
                    <input type="checkbox" checked={row.isSplit} onChange={(e) => onRowChange(row.id, "isSplit", e.target.checked)} />
                    Zw.
                  </label>

                  <RemoveRowButton disabled={rows.length === 1} onClick={() => onRemoveRow(row.id)} />
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3 md:grid-cols-[1.5fr_1fr_0.8fr_auto] md:items-center">
                  <input
                    type="text"
                    value={row.label}
                    onChange={(e) => onRowChange(row.id, "label", e.target.value)}
                    placeholder={kind === "staffel" ? "Strecke, z. B. 4x100 F" : "Strecke, z. B. 5 km"}
                    aria-label="Strecke"
                    className={inputClass}
                  />

                  <input type="text" inputMode="decimal" value={row.time} onChange={(e) => onRowChange(row.id, "time", e.target.value)} placeholder="Zeit 46:46,19" aria-label="Zeit" className={inputClass} />

                  {kind === "staffel" ? (
                    <input type="text" inputMode="numeric" value={row.placement} onChange={(e) => onRowChange(row.id, "placement", e.target.value)} placeholder="Platz" aria-label="Platz" className={inputClass} />
                  ) : (
                    <input type="text" inputMode="numeric" value={row.points} onChange={(e) => onRowChange(row.id, "points", e.target.value)} placeholder="Punkte" aria-label="Punkte" className={inputClass} />
                  )}

                  <RemoveRowButton disabled={rows.length === 1} onClick={() => onRemoveRow(row.id)} />
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="mt-5 flex flex-wrap gap-3">
          <button type="button" onClick={onAddRow} className="rounded-xl border border-app-border px-4 py-3 text-sm transition hover:bg-app-elevated">
            + Weitere Strecke
          </button>

          <button
            type="submit"
            disabled={saving}
            className="rounded-xl bg-app-accent px-5 py-3 text-sm font-semibold text-app-accent-ink transition hover:opacity-90 disabled:opacity-50"
          >
            {saving ? "Speichern..." : "Speichern"}
          </button>
        </div>
      </form>
    </section>
  );
}

function RemoveRowButton({ disabled, onClick }: { disabled: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="rounded-xl px-3 py-2 text-sm text-app-faint transition hover:text-app-bad disabled:invisible"
    >
      Entfernen
    </button>
  );
}

/* ================= Infos bearbeiten ================= */

function InfoForm({
  draft,
  onChange,
  onSubmit,
  onCancel,
}: {
  draft: InfoDraft;
  onChange: <K extends keyof InfoDraft>(key: K, value: InfoDraft[K]) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onCancel: () => void;
}) {
  const text = (key: keyof InfoDraft, label: string, props: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <FormField label={label}>
      <input
        type="text"
        value={draft[key]}
        onChange={(e) => onChange(key, e.target.value as InfoDraft[typeof key])}
        className={inputClass}
        {...props}
      />
    </FormField>
  );

  return (
    <form onSubmit={onSubmit} className="mt-6 space-y-6">
      <Card title="Registrierdaten">
        <div className="grid gap-4 p-6 md:grid-cols-2">
          {text("first_name", "Vorname *", { required: true })}
          {text("last_name", "Nachname")}
          {text("birth_date", "Geburtstag", { type: "date" })}
          {!draft.birth_date && text("birth_year", "Jahrgang (falls Geburtstag unbekannt)", { type: "number", inputMode: "numeric", placeholder: "2010" })}
          <FormField label="Geschlecht">
            <select value={draft.gender} onChange={(e) => onChange("gender", e.target.value as "" | Gender)} className={inputClass}>
              <option value="">–</option>
              <option value="female">weiblich</option>
              <option value="male">männlich</option>
            </select>
          </FormField>
          {text("dsv_id", "ID-Nummer (DSV)")}
          {text("nationality", "Nationalität", { placeholder: "GER" })}
        </div>
      </Card>

      <Card title="Verein">
        <div className="grid gap-4 p-6 md:grid-cols-3">
          {text("club_name", "Vereinsname")}
          {text("club_id", "Vereins-ID")}
          {text("club_since", "Mitglied seit", { type: "date" })}
        </div>
      </Card>

      <div className="flex gap-3">
        <button type="submit" className="rounded-xl bg-app-accent px-5 py-3 text-sm font-semibold text-app-accent-ink transition hover:opacity-90">
          Speichern
        </button>
        <button type="button" onClick={onCancel} className="rounded-xl border border-app-border px-5 py-3 text-sm transition hover:bg-app-elevated">
          Abbrechen
        </button>
      </div>
    </form>
  );
}

/* ================= Entwicklung ================= */

type StandardProps = {
  results: SwimmerResult[];
  swimmer: SwimmerDetails;
  standards: QualifyingStandard[];
  standardId: string;
  onStandardChange: (id: string) => void;
  standardTimes: QualifyingTime[];
  selectedStandard: QualifyingStandard | null;
};

function StandardSelect({
  standards,
  standardId,
  onStandardChange,
  label,
}: Pick<StandardProps, "standards" | "standardId" | "onStandardChange"> & { label: string }) {
  return (
    <FormField label={label}>
      <select value={standardId} onChange={(e) => onStandardChange(e.target.value)} className={inputClass}>
        <option value="">– keine –</option>
        {standards.map((standard) => (
          <option key={standard.id} value={standard.id}>
            {standard.name} ({standard.pool_length}m)
          </option>
        ))}
      </select>
    </FormField>
  );
}

function getChartData(results: SwimmerResult[], event: SwimEvent) {
  return results
    .filter((result) => result.distance === event.distance && result.stroke === event.stroke)
    .sort((a, b) => a.result_date.localeCompare(b.result_date))
    .map((result) => ({
      dateLabel: formatDate(result.result_date),
      location: result.location,
      time25: result.pool_length === 25 ? result.time_ms : undefined,
      time50: result.pool_length === 50 ? result.time_ms : undefined,
    }));
}

function EventChart({
  results,
  event,
  required,
  requiredPool,
  compact,
}: {
  results: SwimmerResult[];
  event: SwimEvent;
  required: QualifyingTime | null;
  requiredPool: PoolLength | null;
  compact: boolean;
}) {
  const data = getChartData(results, event);
  const has25 = data.some((row) => row.time25 !== undefined);
  const has50 = data.some((row) => row.time50 !== undefined);
  const dot = compact ? { r: 3 } : { r: 4 };

  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data} margin={{ top: 10, right: compact ? 10 : 20, left: 0, bottom: 0 }}>
        <CartesianGrid stroke="var(--app-border)" strokeDasharray="3 3" />
        <XAxis dataKey="dateLabel" stroke="var(--app-muted)" tick={{ fill: "var(--app-muted)", fontSize: compact ? 10 : 12 }} />
        <YAxis
          reversed
          domain={["dataMin - 500", "dataMax + 500"]}
          stroke="var(--app-muted)"
          tick={{ fill: "var(--app-muted)", fontSize: compact ? 10 : 12 }}
          tickFormatter={(value) => formatTime(Number(value))}
          width={compact ? 58 : 75}
        />
        <Tooltip
          contentStyle={{ backgroundColor: "var(--app-surface)", border: "1px solid var(--app-border)", borderRadius: "12px" }}
          formatter={(value, name) => [formatTime(Number(value)), name]}
          labelFormatter={(label, payload) => {
            const location = payload?.[0]?.payload?.location;
            return location ? `${label} · ${location}` : label;
          }}
        />
        {!compact && <Legend />}
        {has25 && (
          <Line type="monotone" dataKey="time25" name="25m-Bahn" stroke="var(--chart-25)" strokeWidth={compact ? 2 : 3} dot={dot} activeDot={{ r: 6 }} connectNulls />
        )}
        {has50 && (
          <Line type="monotone" dataKey="time50" name="50m-Bahn" stroke="var(--chart-50)" strokeWidth={compact ? 2 : 3} dot={dot} activeDot={{ r: 6 }} connectNulls />
        )}
        {required && requiredPool && (
          <ReferenceLine
            y={required.time_ms}
            stroke={requiredPool === 25 ? "var(--chart-25)" : "var(--chart-50)"}
            strokeDasharray="6 4"
            ifOverflow="extendDomain"
            label={
              compact
                ? undefined
                : {
                    value: `Pflichtzeit ${formatTime(required.time_ms)} (${requiredPool}m)`,
                    fill: "var(--app-text)",
                    fontSize: 12,
                    position: "insideTopRight",
                  }
            }
          />
        )}
      </LineChart>
    </ResponsiveContainer>
  );
}

function DevelopmentChart({
  results,
  swimmer,
  standards,
  standardId,
  onStandardChange,
  standardTimes,
  selectedStandard,
  chartEventKey,
  onEventChange,
}: StandardProps & { chartEventKey: string; onEventChange: (key: string) => void }) {
  const eventsWithResults = SWIM_EVENTS.filter((event) =>
    results.some((result) => result.distance === event.distance && result.stroke === event.stroke)
  );

  /* Leer oder "all" = Uebersicht ueber alle Strecken */
  const chartEvent = eventsWithResults.find((event) => eventKey(event) === chartEventKey) ?? null;

  const requiredFor = (event: SwimEvent) =>
    selectedStandard ? findQualifyingTime(standardTimes, swimmer, event) : null;

  const bestLabel = (event: SwimEvent) =>
    ([25, 50] as PoolLength[])
      .map((pool) => {
        const best = findBestResult(results, event, pool);
        return best ? `${pool}m ${formatTime(best.time_ms)}` : null;
      })
      .filter(Boolean)
      .join(" · ");

  return (
    <div className="mt-6">
      <Card title="Entwicklung">
        <div className="grid gap-4 border-b border-app-border p-6 md:grid-cols-2">
          <FormField label="Strecke">
            <select
              value={chartEvent ? eventKey(chartEvent) : "all"}
              onChange={(e) => onEventChange(e.target.value)}
              disabled={eventsWithResults.length === 0}
              className={inputClass}
            >
              <option value="all">Alle Strecken ({eventsWithResults.length})</option>
              {eventsWithResults.map((event) => (
                <option key={eventKey(event)} value={eventKey(event)}>
                  {formatEvent(event)}
                </option>
              ))}
            </select>
          </FormField>

          <StandardSelect
            label="Pflichtzeit als Linie zeigen"
            standards={standards}
            standardId={standardId}
            onStandardChange={onStandardChange}
          />
        </div>

        {eventsWithResults.length === 0 ? (
          <Empty>Noch keine Ergebnisse eingetragen.</Empty>
        ) : chartEvent ? (
          <div className="p-4">
            <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2 px-2">
              <p className="text-xs text-app-faint">Oben = schneller. Jeder Punkt ist ein Start.</p>
              <button type="button" onClick={() => onEventChange("all")} className="text-sm text-app-accent hover:text-app-accent">
                ← Alle Strecken
              </button>
            </div>
            <div className="h-80 w-full">
              <EventChart
                results={results}
                event={chartEvent}
                required={requiredFor(chartEvent)}
                requiredPool={selectedStandard?.pool_length ?? null}
                compact={false}
              />
            </div>
          </div>
        ) : (
          <div className="p-4">
            <p className="mb-3 px-2 text-xs text-app-faint">
              Oben = schneller. Blau = 25m-Bahn, orange = 50m-Bahn. Klick auf eine Strecke für die große Ansicht.
            </p>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {eventsWithResults.map((event) => (
                <button
                  key={eventKey(event)}
                  type="button"
                  onClick={() => onEventChange(eventKey(event))}
                  className="rounded-xl border border-app-border bg-app-bg p-3 text-left transition hover:border-app-accent"
                >
                  <div className="flex items-baseline justify-between gap-2 px-1">
                    <span className="font-semibold text-app-heading">{formatEvent(event)}</span>
                    <span className="text-xs text-app-muted">{bestLabel(event)}</span>
                  </div>
                  <div className="mt-2 h-40 w-full">
                    <EventChart
                      results={results}
                      event={event}
                      required={requiredFor(event)}
                      requiredPool={selectedStandard?.pool_length ?? null}
                      compact
                    />
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}


/* ================= Pflichtzeiten-Vergleich ================= */

function QualificationTable({
  results,
  swimmer,
  standards,
  standardId,
  onStandardChange,
  standardTimes,
  selectedStandard,
  onEditInfos,
}: StandardProps & { onEditInfos: () => void }) {
  const rows = selectedStandard
    ? getEventsForPool(selectedStandard.pool_length)
        .map((event) => ({
          event,
          required: findQualifyingTime(standardTimes, swimmer, event),
          best: findBestResult(results, event, selectedStandard.pool_length, {
            from: selectedStandard.valid_from,
            to: selectedStandard.valid_to,
          }),
        }))
        .filter((row) => row.required)
    : [];

  const fulfilled = rows.filter((row) => row.best && row.required && row.best.time_ms <= row.required.time_ms).length;

  return (
    <div className="mt-6">
      <Card title="Vergleich mit Pflichtzeiten">
        <div className="space-y-3 border-b border-app-border p-6">
          <StandardSelect
            label="Pflichtzeiten-Liste"
            standards={standards}
            standardId={standardId}
            onStandardChange={onStandardChange}
          />

          {standards.length === 0 && (
            <p className="text-sm text-app-muted">
              Noch keine Pflichtzeiten angelegt.{" "}
              <Link href="/coach/pflichtzeiten" className="text-app-accent hover:text-app-accent">
                Pflichtzeiten eintragen →
              </Link>
            </p>
          )}

          {(swimmer.birth_year === null || swimmer.gender === null) && (
            <p className="text-sm text-app-warn">
              Für den Vergleich fehlen Jahrgang oder Geschlecht.{" "}
              <button type="button" onClick={onEditInfos} className="underline">
                Jetzt ergänzen
              </button>
            </p>
          )}

          {selectedStandard && (
            <p className="text-sm text-app-muted">
              {selectedStandard.pool_length}m-Bahn
              {selectedStandard.valid_from || selectedStandard.valid_to
                ? ` · es zählen Zeiten von ${formatDate(selectedStandard.valid_from)} bis ${formatDate(selectedStandard.valid_to)}`
                : ""}
              {rows.length > 0 && (
                <span className="font-semibold text-app-heading"> · {fulfilled} von {rows.length} erfüllt</span>
              )}
            </p>
          )}
        </div>

        {selectedStandard &&
          (rows.length === 0 ? (
            <Empty>In dieser Liste gibt es keine Pflichtzeit für Jahrgang und Geschlecht von {swimmer.first_name}.</Empty>
          ) : (
            <Table headers={["Strecke", "Bestzeit", "Datum / Ort", "Pflichtzeit", "Stand"]}>
              {rows.map(({ event, best, required }) => {
                const diff = best && required ? best.time_ms - required.time_ms : null;

                return (
                  <tr key={eventKey(event)} className="border-b border-app-border last:border-b-0 even:bg-app-bg/40">
                    <td className="px-4 py-2 font-medium">{formatEvent(event)}</td>
                    <td className="px-4 py-2 font-semibold text-app-heading">{best ? formatTime(best.time_ms) : "–"}</td>
                    <td className="px-4 py-2 text-app-muted">
                      {best ? `${formatDate(best.result_date)}${best.location ? ` · ${best.location}` : ""}` : "–"}
                    </td>
                    <td className="px-4 py-2">{required ? formatTime(required.time_ms) : "–"}</td>
                    <td className="px-4 py-2">
                      {diff === null ? (
                        <span className="text-app-faint">keine Zeit</span>
                      ) : diff <= 0 ? (
                        <span className="rounded-full bg-app-good/10 px-2.5 py-1 text-xs font-semibold text-app-good">
                          ✓ erfüllt ({formatTimeDifference(diff)})
                        </span>
                      ) : (
                        <span className="rounded-full bg-app-bad/10 px-2.5 py-1 text-xs font-semibold text-app-bad">
                          fehlt {formatTimeDifference(diff)}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </Table>
          ))}
      </Card>
    </div>
  );
}

/* ================= Bausteine ================= */

function Card({
  title,
  action,
  children,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-app-border bg-app-surface">
      <div className="flex items-center justify-between gap-3 border-b border-app-border px-5 py-4">
        <h2 className="font-semibold">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

function Table({ headers, children }: { headers: string[]; children: React.ReactNode }) {
  return (
    <div className="overflow-x-auto px-2 py-2">
      <table className="w-full min-w-[420px] text-left text-sm">
        <thead className="border-b border-app-border text-app-muted">
          <tr>
            {headers.map((header, index) => (
              <th key={`${header}-${index}`} className="px-4 py-2.5 font-semibold text-app-text">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="grid grid-cols-[140px_1fr] gap-3 border-b border-app-border px-5 py-3 text-sm last:border-b-0">
      <span className="font-semibold text-app-text">{label}:</span>
      <span className={value ? "text-app-heading" : "text-app-faint"}>{value || "–"}</span>
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <div className="p-6 text-sm text-app-faint">{children}</div>;
}

function DeleteButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Ergebnis löschen"
      title="Löschen"
      className="rounded px-1.5 text-app-faint transition hover:text-app-bad"
    >
      ×
    </button>
  );
}

function BackLink() {
  return (
    <div className="mt-8">
      <Link
        href="/coach/schwimmer"
        className="inline-block rounded-xl border border-app-border px-4 py-3 text-sm hover:bg-app-elevated"
      >
        ← Zurück zu Meine Schwimmer
      </Link>
    </div>
  );
}

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-app-text">{label}</span>
      {children}
    </label>
  );
}
