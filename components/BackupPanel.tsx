"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

/*
 * Datensicherung fuer den Coach: laedt alle Daten, die der
 * angemeldete Coach sehen darf, und speichert sie als JSON-Datei
 * auf dem Geraet. Kostenlos, ohne geheime Schluessel - es gelten
 * dieselben Zugriffsregeln wie in der App.
 *
 * Wann zuletzt gesichert wurde, steht nur in diesem Browser
 * (localStorage) und dient als Erinnerung.
 */

const TABLES = [
  "profiles",
  "teams",
  "team_members",
  "team_swimmers",
  "swimmers",
  "swimmer_results",
  "qualifying_standards",
  "swimmer_non_finishes",
  "qualifying_times",
  "competitions",
  "competition_sections",
  "competition_events",
  "competition_starts",
  "competition_reviews",
  "competition_relays",
  "competition_relay_legs",
  "calendar_entries",
  "calendar_registrations",
  "calendar_tasks",
  "training_attendance",
  "lactate_tests",
  "athlete_routines",
  "fitness_tests",
  "news_posts",
  "annual_plans",
  "olympic_cycles",
  "training_sessions",
  "training_sections",
  "training_rows",
  "training_land_rows",
  "training_warmup_land_rows",
  "training_feedback",
  "befinden_entries",
  "pain_reports",
  "growth_measurements",
];

const PAGE_SIZE = 1000;
const STORAGE_KEY = "letzte-datensicherung";
const REMIND_AFTER_DAYS = 7;

async function loadTable(table: string) {
  const rows: unknown[] = [];

  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await supabase.from(table).select("*").range(from, from + PAGE_SIZE - 1);

    if (error) throw new Error(error.message);

    rows.push(...(data ?? []));

    if (!data || data.length < PAGE_SIZE) break;
  }

  return rows;
}

function readLastBackup() {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

export default function BackupPanel() {
  const [lastBackup, setLastBackup] = useState<string | null>(null);
  const [now, setNow] = useState(0);
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState("");
  const [result, setResult] = useState<{ rows: number; skipped: string[] } | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Wert aus dem Browser lesen
    setLastBackup(readLastBackup());
    setNow(Date.now());
  }, []);

  async function runBackup() {
    setRunning(true);
    setError("");
    setResult(null);

    const tables: Record<string, unknown[]> = {};
    const skipped: string[] = [];
    let rows = 0;

    for (const [index, table] of TABLES.entries()) {
      setProgress(`${index + 1} / ${TABLES.length}: ${table}`);

      try {
        tables[table] = await loadTable(table);
        rows += tables[table].length;
      } catch {
        /* Tabelle gibt es (noch) nicht oder kein Zugriff - weiter */
        skipped.push(table);
      }
    }

    const now = new Date();
    const stamp = now.toISOString().slice(0, 16).replace(/[:T]/g, "-");
    const payload = {
      app: "monitoring-app",
      exported_at: now.toISOString(),
      note: "Datensicherung aller Daten, die der angemeldete Coach sehen darf.",
      tables,
      skipped,
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `monitoring-sicherung-${stamp}.json`;
    link.click();
    URL.revokeObjectURL(url);

    try {
      localStorage.setItem(STORAGE_KEY, now.toISOString());
    } catch {
      /* egal - nur die Erinnerung */
    }

    setLastBackup(now.toISOString());
    setNow(now.getTime());
    setResult({ rows, skipped });
    setProgress("");
    setRunning(false);
  }

  const daysSince = lastBackup && now ? Math.floor((now - new Date(lastBackup).getTime()) / 86400000) : null;
  const overdue = daysSince === null || daysSince >= REMIND_AFTER_DAYS;

  return (
    <section className="mt-6 rounded-3xl border border-app-border bg-app-surface shadow-app p-5">
      <h2 className="text-lg font-semibold">Datensicherung</h2>

      <p className="mt-2 max-w-3xl text-sm leading-6 text-app-muted">
        Lädt alle deine Daten (Athleten, Zeiten, Pflichtzeiten, Trainings, Kalender, Wettkämpfe, Feedback …) als Datei auf
        dieses Gerät. Bewahre die Datei sicher auf – sie enthält persönliche Daten deiner Athleten. Empfehlung: einmal pro
        Woche.
      </p>

      <p className={`mt-3 text-sm font-medium ${overdue ? "text-app-warn" : "text-app-good"}`}>
        {lastBackup
          ? `Letzte Sicherung auf diesem Gerät: ${new Date(lastBackup).toLocaleString("de-DE")}${overdue ? ` – vor ${daysSince} Tagen, Zeit für eine neue` : ""}`
          : "Auf diesem Gerät wurde noch keine Sicherung erstellt."}
      </p>

      <button
        type="button"
        onClick={runBackup}
        disabled={running}
        className="mt-4 rounded-xl bg-app-accent px-4 py-2.5 text-sm font-semibold text-app-accent-ink transition hover:brightness-110 disabled:opacity-50"
      >
        {running ? `Sichere … ${progress}` : "Datensicherung herunterladen"}
      </button>

      {result && (
        <p className="mt-3 text-sm text-app-muted">
          Fertig: {result.rows.toLocaleString("de-DE")} Einträge gesichert.
          {result.skipped.length > 0 && ` Nicht vorhanden oder ohne Zugriff: ${result.skipped.join(", ")}.`}
        </p>
      )}

      {error && <p className="mt-3 text-sm text-app-bad">{error}</p>}
    </section>
  );
}
