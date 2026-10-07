"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { formatTestValue, improvementPct, testByCode } from "@/lib/fitnessTests";
import { EmptyState } from "@/components/ui";

/*
 * Testbatterie eines Athleten im Profil: letzter Wert je Test und die
 * Veraenderung zum vorherigen Test. Veraenderungen unter 3 % werden
 * neutral gezeigt - sie liegen bei Feldtests haeufig im Messfehler
 * (typischer Fehler / kleinste relevante Veraenderung, Hopkins 2000).
 * Eingetragen wird weiterhin gesammelt unter Leistung -> Testbatterie.
 */

type TestRow = { id: string; test_date: string; test_code: string; value: number };

const NOISE_PCT = 3;

export default function FitnessTestsPanel({ swimmerId }: { swimmerId: string }) {
  const [rows, setRows] = useState<TestRow[] | null>(null);

  useEffect(() => {
    supabase
      .from("fitness_tests")
      .select("id, test_date, test_code, value")
      .eq("swimmer_id", swimmerId)
      .order("test_date", { ascending: false })
      .then(({ data }) => setRows(((data ?? []) as TestRow[]).map((row) => ({ ...row, value: Number(row.value) }))));
  }, [swimmerId]);

  if (rows === null) return <div className="mt-6 h-32 animate-pulse rounded-[20px] bg-app-elevated" aria-label="Wird geladen" />;

  const byTest = new Map<string, TestRow[]>();
  for (const row of rows) byTest.set(row.test_code, [...(byTest.get(row.test_code) ?? []), row]);

  return (
    <section className="mt-6 rounded-[20px] border border-app-border/60 bg-app-surface p-4 shadow-app sm:p-[22px]">
      <div className="flex items-center gap-3">
        <h2 className="flex-1 text-[15px] font-bold text-app-heading">Testbatterie</h2>
        <Link href="/coach/tests" className="text-[13px] font-semibold text-app-accent-soft hover:underline">
          Testtag erfassen →
        </Link>
      </div>
      {byTest.size === 0 ? (
        <EmptyState icon="chart" title="Noch keine Tests">
          Tests werden am Testtag für das ganze Team unter „Testbatterie“ eingetragen.
        </EmptyState>
      ) : (
        <ul className="mt-3 divide-y divide-app-border/60">
          {[...byTest.entries()].map(([code, list]) => {
            const def = testByCode.get(code);
            const [latest, previous] = list;
            const change = def && previous ? improvementPct(def, latest.value, previous.value) : null;
            return (
              <li key={code} className="flex flex-wrap items-baseline gap-x-3 gap-y-1 py-2.5">
                <span className="min-w-0 flex-1 font-semibold text-app-heading">{def?.label ?? code}</span>
                <span className="num font-semibold text-app-heading">{def ? formatTestValue(def, latest.value) : latest.value}</span>
                <span className="w-24 text-right text-[13px] text-app-muted">{new Date(`${latest.test_date}T12:00:00`).toLocaleDateString("de-DE")}</span>
                <span
                  className={`num w-20 text-right text-[13px] font-bold ${
                    change === null || Math.abs(change) < NOISE_PCT ? "text-app-muted" : change > 0 ? "text-app-good" : "text-app-warn"
                  }`}
                  title={change !== null && Math.abs(change) < NOISE_PCT ? "Im Bereich des Messfehlers" : undefined}
                >
                  {change === null ? "–" : `${change > 0 ? "+" : ""}${change.toFixed(1).replace(".", ",")} %`}
                </span>
              </li>
            );
          })}
        </ul>
      )}
      <p className="mt-3 text-xs text-app-faint">Veränderungen unter {NOISE_PCT} % liegen oft im Messfehler und sind grau dargestellt.</p>
    </section>
  );
}
