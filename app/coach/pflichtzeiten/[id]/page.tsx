"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { fetchAll } from "@/lib/fetchAll";
import {
  Gender,
  QualifyingStandard,
  QualifyingTime,
  RESULT_COLUMNS,
  STROKES,
  SWIM_EVENTS,
  Stroke,
  Swimmer,
  SwimmerResult,
  eventKey,
  findBestForStandard,
  findQualifyingTime,
  formatBirthYearRange,
  formatDate,
  formatEvent,
  formatGender,
  formatTime,
  formatTimeDifference,
  getDistancesForStroke,
  getSwimmerName,
  inputClass,
  parseSwimTimeToMs,
  splitResults,
} from "@/lib/swim";

type Tab = "auswertung" | "zeiten";

function parseOptionalYear(value: string) {
  if (!value.trim()) {
    return { ok: true as const, year: null };
  }

  const year = Number(value);

  if (!Number.isInteger(year) || year < 1950 || year > 2100) {
    return { ok: false as const, year: null };
  }

  return { ok: true as const, year };
}

export default function PflichtzeitenDetailPage() {
  const params = useParams();
  const standardId = typeof params.id === "string" ? params.id : "";

  const [standard, setStandard] = useState<QualifyingStandard | null>(null);
  const [times, setTimes] = useState<QualifyingTime[]>([]);
  const [swimmers, setSwimmers] = useState<Swimmer[]>([]);
  const [results, setResults] = useState<SwimmerResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [tab, setTab] = useState<Tab>("zeiten");

  /*
   * Geschlecht und Jahrgang bleiben nach dem Speichern stehen,
   * damit man eine ganze Altersklasse schnell hintereinander
   * eintragen kann - nur die Zeit wird geleert.
   */
  const [gender, setGender] = useState<"" | Gender>("female");
  const [yearFrom, setYearFrom] = useState("");
  const [yearTo, setYearTo] = useState("");
  const [stroke, setStroke] = useState<Stroke>("freestyle");
  const [distance, setDistance] = useState("50");
  const [time, setTime] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleCountBothPools(checked: boolean) {
    if (!standard) {
      return;
    }

    const { error } = await supabase
      .from("qualifying_standards")
      .update({ count_both_pools: checked })
      .eq("id", standard.id);

    if (error) {
      setMessage(
        `Einstellung konnte nicht gespeichert werden: ${error.message} – wurde pflichtzeiten_beide_bahnen.sql schon ausgeführt?`
      );
      return;
    }

    setStandard({ ...standard, count_both_pools: checked });
    setMessage(checked ? "Ab jetzt zählen 25m- und 50m-Zeiten ✅" : `Ab jetzt zählen nur ${standard.pool_length}m-Zeiten.`);
  }

  const loadData = useCallback(async (initial = false) => {
    setLoading(true);

    const [standardResponse, timeResponse, swimmerResponse, resultResponse] =
      await Promise.all([
        supabase
          .from("qualifying_standards")
          .select("*")
          .eq("id", standardId)
          .single(),
        supabase
          .from("qualifying_times")
          .select("id, standard_id, gender, birth_year_from, birth_year_to, distance, stroke, time_ms")
          .eq("standard_id", standardId),
        supabase
          .from("swimmers")
          .select("id, first_name, last_name, birth_year, gender")
          .order("first_name"),
        fetchAll(() => supabase.from("swimmer_results").select(RESULT_COLUMNS)),
      ]);

    if (standardResponse.error || !standardResponse.data) {
      setMessage("Pflichtzeiten-Liste konnte nicht geladen werden.");
      setLoading(false);
      return;
    }

    const loadedTimes = (timeResponse.data ?? []) as QualifyingTime[];

    setStandard(standardResponse.data as QualifyingStandard);
    setTimes(loadedTimes);
    setSwimmers((swimmerResponse.data ?? []) as Swimmer[]);
    setResults(splitResults(resultResponse.data ?? []).pool);
    /* Beim ersten Oeffnen direkt die Auswertung zeigen, wenn es schon Zeiten gibt */
    if (initial && loadedTimes.length > 0) {
      setTab("auswertung");
    }

    setLoading(false);
  }, [standardId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Daten beim Oeffnen laden
    if (standardId) loadData(true);
  }, [standardId, loadData]);

  const sortedTimes = useMemo(() => {
    const eventOrder = new Map(SWIM_EVENTS.map((event, index) => [eventKey(event), index]));

    return [...times].sort(
      (a, b) =>
        (a.gender ?? "").localeCompare(b.gender ?? "") ||
        (b.birth_year_to ?? b.birth_year_from ?? 0) - (a.birth_year_to ?? a.birth_year_from ?? 0) ||
        (eventOrder.get(eventKey(a)) ?? 99) - (eventOrder.get(eventKey(b)) ?? 99)
    );
  }, [times]);

  const evaluation = useMemo(() => {
    if (!standard) {
      return [];
    }

    return swimmers
      .map((swimmer) => {
        const ownResults = results.filter((result) => result.swimmer_id === swimmer.id);

        const rows = SWIM_EVENTS.map((event) => {
          const required = findQualifyingTime(times, swimmer, event);

          if (!required) {
            return null;
          }

          const best = findBestForStandard(ownResults, event, standard);
          const diff = best ? best.time_ms - required.time_ms : null;

          return { event, required, best, diff };
        }).filter((row) => row !== null);

        const fulfilled = rows.filter((row) => row.diff !== null && row.diff <= 0).length;

        /* Knappste noch offene Zeit, um zu sehen, was als naechstes fallen koennte */
        const closest = rows
          .filter((row) => row.diff !== null && row.diff > 0)
          .sort((a, b) => (a.diff ?? 0) - (b.diff ?? 0))[0];

        return { swimmer, rows, fulfilled, closest };
      })
      .sort(
        (a, b) =>
          b.fulfilled - a.fulfilled ||
          getSwimmerName(a.swimmer).localeCompare(getSwimmerName(b.swimmer), "de")
      );
  }, [standard, swimmers, results, times]);

  const swimmersWithTimes = evaluation.filter((entry) => entry.rows.length > 0);
  const swimmersWithoutMatch = evaluation.filter((entry) => entry.rows.length === 0);

  function handleStrokeChange(value: Stroke) {
    setStroke(value);

    const distances = getDistancesForStroke(value);

    if (!distances.includes(Number(distance))) {
      setDistance(`${distances[0]}`);
    }
  }

  async function handleAddTime(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const timeMs = parseSwimTimeToMs(time);

    if (timeMs === null) {
      setMessage(`„${time}“ ist keine gültige Zeit. Schreibweise z. B. 31,45 oder 1:05,23.`);
      return;
    }

    const from = parseOptionalYear(yearFrom);
    const to = parseOptionalYear(yearTo);

    if (!from.ok || !to.ok) {
      setMessage("Bitte gib den Jahrgang vierstellig ein, z. B. 2012.");
      return;
    }

    if (from.year !== null && to.year !== null && from.year > to.year) {
      setMessage("„Jahrgang von“ muss kleiner oder gleich „bis“ sein (älterer Jahrgang zuerst).");
      return;
    }

    setSaving(true);
    setMessage("");

    const { error } = await supabase.from("qualifying_times").insert({
      standard_id: standardId,
      gender: gender || null,
      birth_year_from: from.year,
      birth_year_to: to.year,
      distance: Number(distance),
      stroke,
      time_ms: timeMs,
    });

    setSaving(false);

    if (error) {
      setMessage(`Pflichtzeit konnte nicht gespeichert werden: ${error.message}`);
      return;
    }

    setMessage(`${distance} m ${STROKES.find((s) => s.value === stroke)?.label}: ${formatTime(timeMs)} gespeichert ✅`);
    setTime("");
    await loadData();
  }

  async function handleEditTime(qualifyingTime: QualifyingTime) {
    const input = window.prompt(
      `Neue Pflichtzeit für ${formatEvent(qualifyingTime)} (z. B. 1:05,23):`,
      formatTime(qualifyingTime.time_ms)
    );

    if (input === null) {
      return;
    }

    const timeMs = parseSwimTimeToMs(input);

    if (timeMs === null) {
      setMessage(`„${input}“ ist keine gültige Zeit.`);
      return;
    }

    const { error } = await supabase
      .from("qualifying_times")
      .update({ time_ms: timeMs })
      .eq("id", qualifyingTime.id);

    if (error) {
      setMessage(`Pflichtzeit konnte nicht geändert werden: ${error.message}`);
      return;
    }

    await loadData();
  }

  async function handleDeleteTime(qualifyingTime: QualifyingTime) {
    const confirmed = window.confirm(
      `Pflichtzeit ${formatTime(qualifyingTime.time_ms)} über ${formatEvent(qualifyingTime)} löschen?`
    );

    if (!confirmed) {
      return;
    }

    const { error } = await supabase
      .from("qualifying_times")
      .delete()
      .eq("id", qualifyingTime.id);

    if (error) {
      setMessage(`Pflichtzeit konnte nicht gelöscht werden: ${error.message}`);
      return;
    }

    await loadData();
  }

  function tabClass(value: Tab) {
    return `rounded-xl px-4 py-2 text-sm transition ${
      tab === value
        ? "bg-app-accent font-semibold text-app-accent-ink"
        : "border border-app-border hover:bg-app-elevated"
    }`;
  }

  if (loading && !standard) {
    return (
      <main className="mx-auto max-w-6xl">
        <div className="rounded-2xl border border-app-border bg-app-surface p-10 text-center text-app-muted">
          Wird geladen...
        </div>
      </main>
    );
  }

  if (!standard) {
    return (
      <main className="mx-auto max-w-6xl">
        <div className="rounded-xl border border-app-bad/40 bg-app-bad/10 p-4 text-sm text-app-bad">
          {message || "Pflichtzeiten-Liste nicht gefunden."}
        </div>
        <BackLink />
      </main>
    );
  }

  return (
    <main>
      <div className="mx-auto max-w-6xl">
        <header>
          <p className="text-sm text-app-muted">Pflichtzeiten</p>
          <h1 className="mt-1 text-3xl font-bold">{standard.name}</h1>
          <p className="mt-2 text-app-muted">
            {standard.pool_length}m-Bahn
            {standard.valid_from || standard.valid_to
              ? ` · Qualifikationszeitraum ${formatDate(standard.valid_from)} – ${formatDate(standard.valid_to)}`
              : " · alle Zeiten zählen"}
          </p>
          <label className="mt-3 flex items-center gap-2 text-sm text-app-text">
            <input
              type="checkbox"
              checked={Boolean(standard.count_both_pools)}
              onChange={(event) => handleCountBothPools(event.target.checked)}
            />
            Zeiten von der 25m- und der 50m-Bahn zählen
          </label>
        </header>

        {message && (
          <div className="mt-6 rounded-xl border border-app-border bg-app-surface p-4 text-sm text-app-text">
            {message}
          </div>
        )}

        <nav className="mt-6 flex flex-wrap gap-2">
          <button type="button" onClick={() => setTab("zeiten")} className={tabClass("zeiten")}>
            Pflichtzeiten eintragen ({times.length})
          </button>
          <button type="button" onClick={() => setTab("auswertung")} className={tabClass("auswertung")}>
            Auswertung
          </button>
        </nav>

        {tab === "zeiten" && (
          <>
            <section className="mt-6 overflow-hidden rounded-2xl border border-app-border bg-app-surface">
              <div className="border-b border-app-border px-6 py-4">
                <h2 className="text-lg font-semibold">Pflichtzeit hinzufügen</h2>
                <p className="mt-1 text-sm text-app-muted">
                  Geschlecht und Jahrgang bleiben nach dem Speichern stehen – so trägst du eine
                  Altersklasse schnell nacheinander ein. Jahrgang leer lassen = gilt für alle.
                  Beispiel „2008 und älter“: von leer, bis 2008.
                </p>
              </div>

              <form
                onSubmit={handleAddTime}
                className="grid grid-cols-2 gap-4 p-6 md:grid-cols-[140px_110px_110px_1fr_110px_130px_auto] md:items-end"
              >
                <FormField label="Geschlecht">
                  <select
                    value={gender}
                    onChange={(event) => setGender(event.target.value as "" | Gender)}
                    className={inputClass}
                  >
                    <option value="female">weiblich</option>
                    <option value="male">männlich</option>
                    <option value="">alle</option>
                  </select>
                </FormField>

                <FormField label="Jahrgang von">
                  <input
                    type="number"
                    inputMode="numeric"
                    value={yearFrom}
                    onChange={(event) => setYearFrom(event.target.value)}
                    placeholder="2011"
                    className={inputClass}
                  />
                </FormField>

                <FormField label="bis">
                  <input
                    type="number"
                    inputMode="numeric"
                    value={yearTo}
                    onChange={(event) => setYearTo(event.target.value)}
                    placeholder="2011"
                    className={inputClass}
                  />
                </FormField>

                <FormField label="Lage">
                  <select
                    value={stroke}
                    onChange={(event) => handleStrokeChange(event.target.value as Stroke)}
                    className={inputClass}
                  >
                    {STROKES.map((item) => (
                      <option key={item.value} value={item.value}>
                        {item.label}
                      </option>
                    ))}
                  </select>
                </FormField>

                <FormField label="Strecke">
                  <select
                    value={distance}
                    onChange={(event) => setDistance(event.target.value)}
                    className={inputClass}
                  >
                    {getDistancesForStroke(stroke).map((value) => (
                      <option key={value} value={value}>
                        {value} m
                      </option>
                    ))}
                  </select>
                </FormField>

                <FormField label="Zeit *">
                  <input
                    type="text"
                    inputMode="decimal"
                    value={time}
                    onChange={(event) => setTime(event.target.value)}
                    placeholder="1:05,23"
                    required
                    className={inputClass}
                  />
                </FormField>

                <button
                  type="submit"
                  disabled={saving}
                  className="col-span-2 rounded-xl bg-app-accent px-5 py-3 text-sm font-semibold text-app-accent-ink transition hover:opacity-90 disabled:opacity-50 md:col-span-1"
                >
                  {saving ? "..." : "Hinzufügen"}
                </button>
              </form>
            </section>

            <section className="mt-6 overflow-hidden rounded-2xl border border-app-border bg-app-surface">
              {sortedTimes.length === 0 ? (
                <div className="p-6 text-sm text-app-faint">Noch keine Pflichtzeiten eingetragen.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[560px] text-left text-sm">
                    <thead className="border-b border-app-border bg-app-bg/50 text-app-muted">
                      <tr>
                        <th className="px-6 py-3 font-medium">Geschlecht</th>
                        <th className="px-4 py-3 font-medium">Jahrgang</th>
                        <th className="px-4 py-3 font-medium">Strecke</th>
                        <th className="px-4 py-3 font-medium">Pflichtzeit</th>
                        <th className="px-4 py-3" />
                      </tr>
                    </thead>
                    <tbody>
                      {sortedTimes.map((qualifyingTime) => (
                        <tr key={qualifyingTime.id} className="border-b border-app-border last:border-b-0">
                          <td className="px-6 py-2.5">
                            {qualifyingTime.gender ? formatGender(qualifyingTime.gender) : "alle"}
                          </td>
                          <td className="px-4 py-2.5">
                            {formatBirthYearRange(qualifyingTime.birth_year_from, qualifyingTime.birth_year_to)}
                          </td>
                          <td className="px-4 py-2.5 font-medium">{formatEvent(qualifyingTime)}</td>
                          <td className="px-4 py-2.5 font-semibold text-app-heading">
                            {formatTime(qualifyingTime.time_ms)}
                          </td>
                          <td className="space-x-4 px-4 py-2.5 text-right">
                            <button
                              type="button"
                              onClick={() => handleEditTime(qualifyingTime)}
                              className="text-xs text-app-faint transition hover:text-app-heading"
                            >
                              Ändern
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteTime(qualifyingTime)}
                              className="text-xs text-app-faint transition hover:text-app-bad"
                            >
                              Löschen
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </>
        )}

        {tab === "auswertung" && (
          <>
            <section className="mt-6 overflow-hidden rounded-2xl border border-app-border bg-app-surface">
              <div className="border-b border-app-border px-6 py-4">
                <h2 className="text-lg font-semibold">Aktueller Stand</h2>
                <p className="mt-1 text-sm text-app-muted">
                  Bestzeit auf der {standard.count_both_pools ? "25m- oder 50m" : `${standard.pool_length}m`}-Bahn
                  {standard.valid_from || standard.valid_to ? " im Qualifikationszeitraum" : ""} im
                  Vergleich zur Pflichtzeit.
                </p>
              </div>

              {swimmersWithTimes.length === 0 ? (
                <div className="p-6 text-sm text-app-faint">
                  {times.length === 0
                    ? "Trag zuerst Pflichtzeiten ein."
                    : "Für keinen Schwimmer passt eine Pflichtzeit. Prüfe Jahrgang und Geschlecht unter Athleten."}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[640px] text-left text-sm">
                    <thead className="border-b border-app-border bg-app-bg/50 text-app-muted">
                      <tr>
                        <th className="px-6 py-3 font-medium">Schwimmer</th>
                        <th className="px-4 py-3 font-medium">Jg.</th>
                        <th className="px-4 py-3 font-medium">Erfüllt</th>
                        <th className="px-4 py-3 font-medium">Am knappsten dran</th>
                      </tr>
                    </thead>
                    <tbody>
                      {swimmersWithTimes.map(({ swimmer, rows, fulfilled, closest }) => (
                        <tr key={swimmer.id} className="border-b border-app-border last:border-b-0">
                          <td className="px-6 py-2.5">
                            <Link
                              href={`/coach/schwimmer/${swimmer.id}`}
                              className="font-medium text-app-accent hover:text-app-accent"
                            >
                              {getSwimmerName(swimmer)}
                            </Link>
                          </td>
                          <td className="px-4 py-2.5 text-app-muted">{swimmer.birth_year}</td>
                          <td className="px-4 py-2.5">
                            <span
                              className={`font-semibold ${fulfilled > 0 ? "text-app-good" : "text-app-muted"}`}
                            >
                              {fulfilled} / {rows.length}
                            </span>
                          </td>
                          <td className="px-4 py-2.5 text-app-muted">
                            {closest
                              ? `${formatEvent(closest.event)}: fehlt ${formatTimeDifference(closest.diff ?? 0)}`
                              : "–"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            {swimmersWithTimes.map(({ swimmer, rows, fulfilled }) => (
              <section
                key={swimmer.id}
                className="mt-6 overflow-hidden rounded-2xl border border-app-border bg-app-surface"
              >
                <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-app-border px-6 py-4">
                  <h3 className="font-semibold">
                    {getSwimmerName(swimmer)}{" "}
                    <span className="font-normal text-app-muted">
                      · Jg. {swimmer.birth_year} · {formatGender(swimmer.gender)}
                    </span>
                  </h3>
                  <span className="text-sm text-app-muted">
                    {fulfilled} von {rows.length} erfüllt
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full min-w-[560px] text-left text-sm">
                    <thead className="border-b border-app-border bg-app-bg/50 text-app-muted">
                      <tr>
                        <th className="px-6 py-2.5 font-medium">Strecke</th>
                        <th className="px-4 py-2.5 font-medium">Bestzeit</th>
                        <th className="px-4 py-2.5 font-medium">Pflichtzeit</th>
                        <th className="px-4 py-2.5 font-medium">Stand</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map(({ event, best, required, diff }) => (
                        <tr key={eventKey(event)} className="border-b border-app-border last:border-b-0">
                          <td className="px-6 py-2 font-medium">{formatEvent(event)}</td>
                          <td className="px-4 py-2 text-app-heading">{best ? formatTime(best.time_ms) : "–"}</td>
                          <td className="px-4 py-2">{formatTime(required.time_ms)}</td>
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
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            ))}

            {swimmersWithoutMatch.length > 0 && times.length > 0 && (
              <p className="mt-6 text-sm text-app-muted">
                Ohne passende Pflichtzeit:{" "}
                {swimmersWithoutMatch.map(({ swimmer }, index) => (
                  <span key={swimmer.id}>
                    {index > 0 && ", "}
                    <Link href={`/coach/schwimmer/${swimmer.id}`} className="text-app-accent hover:text-app-accent">
                      {getSwimmerName(swimmer)}
                    </Link>
                    {swimmer.birth_year === null || swimmer.gender === null ? " (Jahrgang/Geschlecht fehlt)" : ""}
                  </span>
                ))}
              </p>
            )}
          </>
        )}

        <BackLink />
      </div>
    </main>
  );
}

function BackLink() {
  return (
    <div className="mt-8">
      <Link
        href="/coach/pflichtzeiten"
        className="inline-block rounded-xl border border-app-border px-4 py-3 text-sm hover:bg-app-elevated"
      >
        ← Zurück zu den Pflichtzeiten
      </Link>
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
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-app-text">{label}</span>
      {children}
    </label>
  );
}
