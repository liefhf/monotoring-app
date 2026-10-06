"use client";

import Loader from "@/components/Loader";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { fetchAll } from "@/lib/fetchAll";
import {
  QualifyingStandard,
  QualifyingTime,
  RESULT_COLUMNS,
  SWIM_EVENTS,
  Swimmer,
  SwimmerResult,
  eventKey,
  formatDate,
  formatEventShort,
  formatTime,
  getSwimmerName,
  splitResults,
} from "@/lib/swim";
import { focusFromRow } from "@/lib/nextCompetition";
import { AthleteFocus } from "@/lib/trainingFocus";
import { EntrySuggestion, suggestEntries } from "@/lib/entryHelper";
import { RoleBadge } from "@/components/FocusBadge";
import { Card, FormField, PageHeader, buttonPrimary, buttonSecondary, inputClass } from "@/components/ui";

/*
 * Meldehilfe: Vorschlag, wer welche Strecken fuer einen Wettkampf meldet –
 * aus Pflichtzeiten, Qualifikationszeitraum, Fokus-Strecken und der
 * Hoechstzahl an Einzelstarts. Ergebnis als Liste zum Abhaken, Drucken und
 * als CSV (fuer die eigene Meldung).
 */

export default function MeldehilfePage() {
  const [swimmers, setSwimmers] = useState<(Swimmer & { focus: AthleteFocus })[]>([]);
  const [results, setResults] = useState<SwimmerResult[]>([]);
  const [standards, setStandards] = useState<QualifyingStandard[]>([]);
  const [times, setTimes] = useState<QualifyingTime[]>([]);
  const [standardId, setStandardId] = useState("");
  const [maxStarts, setMaxStarts] = useState("8");
  const [fee, setFee] = useState("10");
  /* manuelle Aenderungen: key swimmerId|eventKey -> true/false */
  const [overrides, setOverrides] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const [swimmerRes, resultRes, standardRes, timeRes] = await Promise.all([
        supabase.from("swimmers").select("*"),
        fetchAll(() => supabase.from("swimmer_results").select(RESULT_COLUMNS)),
        supabase.from("qualifying_standards").select("*").order("created_at", { ascending: false }),
        fetchAll(() => supabase.from("qualifying_times").select("id, standard_id, gender, birth_year_from, birth_year_to, distance, stroke, time_ms")),
      ]);
      const rows = (swimmerRes.data ?? []) as Record<string, unknown>[];
      setSwimmers(
        rows
          .map((row) => ({ ...(row as unknown as Swimmer), focus: focusFromRow(row) }))
          .sort((a, b) => (a.last_name ?? "").localeCompare(b.last_name ?? "", "de"))
      );
      setResults(splitResults((resultRes.data ?? []) as Record<string, unknown>[]).pool);
      const loadedStandards = (standardRes.data ?? []) as QualifyingStandard[];
      setStandards(loadedStandards);
      setStandardId(loadedStandards[0]?.id ?? "");
      setTimes((timeRes.data ?? []) as QualifyingTime[]);
      setLoading(false);
    }
    load();
  }, []);

  const standard = standards.find((item) => item.id === standardId) ?? null;
  const standardTimes = useMemo(() => times.filter((time) => time.standard_id === standardId), [times, standardId]);
  const limit = Math.max(1, Number(maxStarts) || 8);

  const perSwimmer = useMemo(
    () =>
      standard
        ? swimmers
            .map((swimmer) => ({
              swimmer,
              entries: suggestEntries({
                swimmer,
                results: results.filter((result) => result.swimmer_id === swimmer.id),
                focus: swimmer.focus,
                standard,
                standardTimes,
                events: SWIM_EVENTS,
                maxStarts: limit,
              }),
            }))
            .filter((item) => item.entries.length)
        : [],
    [swimmers, results, standard, standardTimes, limit]
  );

  const key = (swimmerId: string, entry: EntrySuggestion) => `${swimmerId}|${eventKey(entry.event)}`;
  const chosen = (swimmerId: string, entry: EntrySuggestion) => overrides[key(swimmerId, entry)] ?? entry.recommended;
  const totalStarts = perSwimmer.reduce((sum, item) => sum + item.entries.filter((entry) => chosen(item.swimmer.id, entry)).length, 0);

  function downloadCsv() {
    const lines = [["Nachname", "Vorname", "Jahrgang", "DSV-ID", "Strecke", "Meldezeit", "Pflichtzeit", "Status", "Bahn der Meldezeit"].join(";")];
    for (const { swimmer, entries } of perSwimmer) {
      for (const entry of entries.filter((item) => chosen(swimmer.id, item))) {
        lines.push(
          [
            swimmer.last_name ?? "",
            swimmer.first_name,
            swimmer.birth_year ?? "",
            (swimmer as unknown as { dsv_id?: string }).dsv_id ?? "",
            formatEventShort(entry.event),
            formatTime(entry.best.time_ms),
            formatTime(entry.requiredMs),
            entry.status === "erfuellt" ? "Pflichtzeit erfüllt" : "ohne Nachweis (knapp)",
            `${entry.best.pool_length}m`,
          ].join(";")
        );
      }
    }
    const blob = new Blob([`﻿${lines.join("\n")}`], { type: "text/csv;charset=utf-8" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `Meldeliste_${standard?.name.replace(/\s+/g, "_") ?? "Wettkampf"}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  }

  return (
    <main className="mx-auto max-w-6xl space-y-6">
      <PageHeader
        eyebrow="Wettkämpfe"
        title="Meldehilfe"
        icon="trophy"
        description="Vorschlag, wer welche Strecken meldet – aus Pflichtzeiten, Qualifikationszeitraum und Fokus-Strecken. Häkchen anpassen, dann drucken oder als CSV speichern."
        actions={
          <div className="flex flex-wrap gap-2 print:hidden">
            <button type="button" onClick={() => window.print()} className={buttonSecondary}>
              Drucken / PDF
            </button>
            <button type="button" onClick={downloadCsv} disabled={!totalStarts} className={buttonPrimary}>
              CSV herunterladen
            </button>
          </div>
        }
      />

      <Card padded className="print:hidden">
        <div className="grid gap-3 sm:grid-cols-3">
          <FormField label="Pflichtzeiten-Liste (Wettkampf)">
            <select value={standardId} onChange={(e) => setStandardId(e.target.value)} className={inputClass}>
              {standards.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </FormField>
          <FormField label="Max. Einzelstarts je Athlet" hint="HM Kurzbahn: Jahrgänge 2013–2016 max. 8">
            <input value={maxStarts} onChange={(e) => setMaxStarts(e.target.value)} inputMode="numeric" className={inputClass} />
          </FormField>
          <FormField label="Meldegeld je Start (€)">
            <input value={fee} onChange={(e) => setFee(e.target.value)} inputMode="decimal" className={inputClass} />
          </FormField>
        </div>
        {standard && (
          <p className="mt-3 text-xs text-app-muted">
            Qualifikationszeitraum {formatDate(standard.valid_from)} – {formatDate(standard.valid_to)} ·{" "}
            {standard.count_both_pools ? "25m- und 50m-Zeiten zählen" : `nur ${standard.pool_length}m`} · Meldezeit = Bestzeit im Zeitraum. 800/1500 m werden
            laut Ausschreibung nach Bestenliste zugelassen.
          </p>
        )}
      </Card>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div className="rounded-3xl border border-app-border bg-app-surface shadow-app p-4">
          <p className="text-2xl font-bold">{perSwimmer.filter((item) => item.entries.some((entry) => chosen(item.swimmer.id, entry))).length}</p>
          <p className="text-xs text-app-muted">Athleten mit Meldung</p>
        </div>
        <div className="rounded-3xl border border-app-border bg-app-surface shadow-app p-4">
          <p className="text-2xl font-bold">{totalStarts}</p>
          <p className="text-xs text-app-muted">Einzelstarts</p>
        </div>
        <div className="rounded-3xl border border-app-border bg-app-surface shadow-app p-4">
          <p className="text-2xl font-bold">{(totalStarts * (Number(fee.replace(",", ".")) || 0)).toFixed(2).replace(".", ",")} €</p>
          <p className="text-xs text-app-muted">Meldegeld Einzelstarts</p>
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-app-muted"><Loader /></p>
      ) : perSwimmer.length === 0 ? (
        <Card padded>
          <p className="text-sm text-app-muted">Für diese Liste hat noch niemand eine Pflichtzeit erreicht oder ist knapp dran.</p>
        </Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {perSwimmer.map(({ swimmer, entries }) => {
            const count = entries.filter((entry) => chosen(swimmer.id, entry)).length;
            return (
              <Card
                key={swimmer.id}
                title={
                  <Link href={`/coach/schwimmer/${swimmer.id}`} className="hover:text-app-accent">
                    {getSwimmerName(swimmer)}
                  </Link>
                }
                description={`Jg. ${swimmer.birth_year ?? "?"} · ${count} Starts${count > limit ? " – mehr als erlaubt!" : ""}`}
              >
                <ul className="divide-y divide-app-border">
                  {entries.map((entry) => (
                    <li key={eventKey(entry.event)} className="flex items-center gap-3 px-4 py-2 text-sm">
                      <input
                        type="checkbox"
                        checked={chosen(swimmer.id, entry)}
                        onChange={(e) => setOverrides((current) => ({ ...current, [key(swimmer.id, entry)]: e.target.checked }))}
                        className="h-5 w-5"
                      />
                      <span className="w-16 font-semibold">
                        {formatEventShort(entry.event)}
                        <RoleBadge role={entry.role} />
                      </span>
                      <span className="flex-1 tabular-nums">
                        {formatTime(entry.best.time_ms)} <span className="text-xs text-app-faint">({entry.best.pool_length}m)</span>
                      </span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                          entry.status === "erfuellt" ? "bg-app-good/10 text-app-good" : "bg-app-warn/15 text-app-warn"
                        }`}
                      >
                        {entry.status === "erfuellt" ? `✓ ${formatTime(-entry.gapMs)} unter PZ` : `+${formatTime(entry.gapMs)} (knapp)`}
                      </span>
                    </li>
                  ))}
                </ul>
              </Card>
            );
          })}
        </div>
      )}

      <p className="text-xs text-app-faint">
        „knapp“ = bis 3 % über der Pflichtzeit; vorausgewählt nur bei Fokus-Strecken. Meldungen ohne Qualifikationsnachweis sind bei der HM erlaubt, können aber
        bei Nicht-Erreichen ein erhöhtes nachträgliches Meldegeld (50 €) auslösen – bitte Ausschreibung prüfen.
      </p>
    </main>
  );
}
