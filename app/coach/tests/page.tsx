"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { fetchAll } from "@/lib/fetchAll";
import { Swimmer, getSwimmerName } from "@/lib/swim";
import { FITNESS_TESTS, FitnessTestDef, Rating, formatTestValue, improvementPct, rateTest, testByCode, teamRank } from "@/lib/fitnessTests";
import { Card, FormField, Notice, PageHeader, buttonPrimary, inputClass } from "@/components/ui";

/*
 * Testbatterie: am Testtag alle Athleten fuer einen Test in einer Liste
 * eintragen; Uebersicht mit Normbewertung, Verlauf und Rang im Team.
 */

type TestRow = { id: string; swimmer_id: string; test_date: string; test_code: string; value: number; note: string | null };

const TONE: Record<Rating["tone"], string> = {
  good: "bg-app-good/10 text-app-good",
  ok: "bg-app-elevated text-app-text",
  warn: "bg-app-warn/15 text-app-warn",
  bad: "bg-app-bad/10 text-app-bad",
};

/* "26:30" oder "26:30,5" -> Sekunden, sonst Zahl mit Komma */
function parseValue(raw: string) {
  const text = raw.trim().replace(",", ".");
  if (text.includes(":")) {
    const [minutes, seconds] = text.split(":");
    return Number(minutes) * 60 + Number(seconds);
  }
  return Number(text);
}

const today = () => new Date().toISOString().slice(0, 10);

export default function TestbatteriePage() {
  const [swimmers, setSwimmers] = useState<Swimmer[]>([]);
  const [rows, setRows] = useState<TestRow[]>([]);
  const [missingTable, setMissingTable] = useState(false);
  const [message, setMessage] = useState<{ tone: "good" | "bad"; text: string } | null>(null);
  const [testCode, setTestCode] = useState(FITNESS_TESTS[0].code);
  const [date, setDate] = useState(today);
  const [values, setValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const [swimmerRes, testRes] = await Promise.all([
      supabase.from("swimmers").select("id, first_name, last_name, birth_year, gender"),
      fetchAll(() => supabase.from("fitness_tests").select("*").order("test_date")),
    ]);
    setSwimmers(((swimmerRes.data ?? []) as Swimmer[]).sort((a, b) => (a.last_name ?? "").localeCompare(b.last_name ?? "", "de")));
    setMissingTable(Boolean(testRes.error));
    setRows(((testRes.data ?? []) as TestRow[]).map((row) => ({ ...row, value: Number(row.value) })));
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Daten beim Oeffnen laden
    load();
  }, [load]);

  const def = testByCode.get(testCode)!;

  async function saveAll() {
    const entries = Object.entries(values)
      .map(([swimmerId, raw]) => ({ swimmerId, value: parseValue(raw) }))
      .filter((entry) => entry.value > 0 && Number.isFinite(entry.value));
    if (entries.length === 0) {
      setMessage({ tone: "bad", text: "Keine Werte eingetragen." });
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from("fitness_tests")
      .insert(entries.map((entry) => ({ swimmer_id: entry.swimmerId, test_date: date, test_code: testCode, value: entry.value })));
    setSaving(false);
    if (error) {
      setMessage({ tone: "bad", text: `Konnte nicht gespeichert werden: ${error.message}` });
      return;
    }
    setMessage({ tone: "good", text: `${entries.length} Werte für „${def.label}“ gespeichert ✅` });
    setValues({});
    await load();
  }

  /* Letzter und vorletzter Wert je Athlet und Test */
  const latest = useMemo(() => {
    const map = new Map<string, { current: TestRow; previous: TestRow | null }>();
    for (const row of rows) {
      const key = `${row.swimmer_id}|${row.test_code}`;
      const entry = map.get(key);
      map.set(key, { current: row, previous: entry ? entry.current : null });
    }
    return map;
  }, [rows]);

  const usedTests = FITNESS_TESTS.filter((test) => rows.some((row) => row.test_code === test.code));

  function cell(swimmer: Swimmer, test: FitnessTestDef) {
    const entry = latest.get(`${swimmer.id}|${test.code}`);
    if (!entry) return <span className="text-app-faint">–</span>;
    const age = swimmer.birth_year ? Number(entry.current.test_date.slice(0, 4)) - swimmer.birth_year : null;
    const rating = rateTest(test, entry.current.value, swimmer.gender, age);
    const change = entry.previous ? improvementPct(test, entry.current.value, entry.previous.value) : null;
    const teamValues = swimmers
      .map((item) => latest.get(`${item.id}|${test.code}`)?.current.value)
      .filter((value): value is number => value !== undefined);
    const { rank, of } = teamRank(test, entry.current.value, teamValues);
    return (
      <div className="space-y-0.5">
        <p className="font-semibold tabular-nums">{formatTestValue(test, entry.current.value)}</p>
        <p className="flex flex-wrap gap-1 text-[11px]">
          {rating && <span className={`rounded px-1 ${TONE[rating.tone]}`}>{rating.label}</span>}
          {change !== null && (
            <span className={change >= 0 ? "text-app-good" : "text-app-bad"}>
              {change >= 0 ? "▲" : "▼"} {Math.abs(change).toFixed(0)} %
            </span>
          )}
          <span className="text-app-faint">
            #{rank}/{of}
          </span>
        </p>
      </div>
    );
  }

  return (
    <main className="mx-auto max-w-6xl space-y-6">
      <PageHeader
        eyebrow="Leistung"
        title="Testbatterie"
        icon="chart"
        description="Athletik- und Schwimmtests mit Normwerten (Rumpf nach Maier, Standweitsprung nach Bös, Klimmzüge nach Miller), Verlauf und Rang im Team."
      />

      {missingTable && <Notice tone="warn">Bitte zuerst <b>testbatterie.sql</b> im Supabase SQL-Editor ausführen und die Seite neu laden.</Notice>}
      {message && <Notice tone={message.tone}>{message.text}</Notice>}

      <Card title="Testtag erfassen" description="Test wählen, dann alle Werte nacheinander eintragen und einmal speichern.">
        <div className="grid gap-3 border-b border-app-border p-5 sm:grid-cols-[2fr_1fr]">
          <FormField label="Test">
            <select value={testCode} onChange={(e) => setTestCode(e.target.value)} className={inputClass}>
              {["Rumpf", "Sprungkraft", "Oberkörper", "Schwimmen"].map((group) => (
                <optgroup key={group} label={group}>
                  {FITNESS_TESTS.filter((test) => test.group === group).map((test) => (
                    <option key={test.code} value={test.code}>
                      {test.label} ({test.unit})
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </FormField>
          <FormField label="Datum">
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputClass} />
          </FormField>
          <p className="text-xs text-app-muted sm:col-span-2">
            <b>Durchführung:</b> {def.how}
            {def.norm && <span className="text-app-faint"> · Norm: {def.norm.source}</span>}
          </p>
        </div>
        <ul className="divide-y divide-app-border">
          {swimmers.map((swimmer) => (
            <li key={swimmer.id} className="flex items-center justify-between gap-3 px-5 py-2">
              <span className="text-sm font-medium">
                {swimmer.last_name}, {swimmer.first_name}
              </span>
              <span className="flex items-center gap-2">
                <input
                  value={values[swimmer.id] ?? ""}
                  onChange={(e) => setValues((current) => ({ ...current, [swimmer.id]: e.target.value }))}
                  inputMode="decimal"
                  className={`${inputClass} w-28 py-1.5 text-right`}
                />
                <span className="w-14 text-xs text-app-muted">{def.unit === "s" ? "s / m:ss" : def.unit}</span>
              </span>
            </li>
          ))}
        </ul>
        <div className="border-t border-app-border p-4">
          <button type="button" onClick={saveAll} disabled={saving || missingTable} className={buttonPrimary}>
            {saving ? "Speichern..." : "Alle speichern"}
          </button>
        </div>
      </Card>

      <Card title="Übersicht" description="Letzter Wert je Test · Normbewertung (nur wenn Alter/Geschlecht zur Normgruppe passen) · ▲▼ zum vorherigen Test · Rang im Team.">
        {usedTests.length === 0 ? (
          <p className="p-5 text-sm text-app-muted">Noch keine Testwerte.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-app-muted">
                  <th className="px-4 py-2 font-medium">Athlet</th>
                  {usedTests.map((test) => (
                    <th key={test.code} className="px-3 py-2 font-medium">
                      {test.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {swimmers.map((swimmer) => (
                  <tr key={swimmer.id} className="border-t border-app-border align-top">
                    <td className="whitespace-nowrap px-4 py-2">
                      <Link href={`/coach/schwimmer/${swimmer.id}`} className="font-medium hover:text-app-accent">
                        {getSwimmerName(swimmer)}
                      </Link>
                    </td>
                    {usedTests.map((test) => (
                      <td key={test.code} className="whitespace-nowrap px-3 py-2">
                        {cell(swimmer, test)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="border-t border-app-border px-4 py-2 text-xs text-app-faint">
          Die Normwerte stammen aus den Studienheften und gelten für Erwachsene bzw. Sportler:innen allgemein – bei Jugendlichen zählen vor allem der eigene Verlauf
          und der Vergleich im Team.
        </p>
      </Card>
    </main>
  );
}
