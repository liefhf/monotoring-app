"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { classifyError } from "@/lib/loadState";

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
  "health_events",
  "athlete_documents",
  "athlete_goals",
  "athlete_notes",
  "team_coaches",
];

const PAGE_SIZE = 1000;
const STORAGE_KEY = "letzte-datensicherung";
const REMIND_AFTER_DAYS = 7;

type TableStatus = { table: string; status: "ok" | "fehlt" | "fehler"; rows: number; message?: string };

/*
 * Seitenweise laden, stabil sortiert (sonst koennen Zeilen zwischen den
 * Seiten verrutschen). Tabellen ohne Spalte id werden unsortiert geladen.
 */
async function loadTable(table: string): Promise<{ rows: unknown[]; status: TableStatus }> {
  const rows: unknown[] = [];
  let ordered = true;
  for (let from = 0; ; from += PAGE_SIZE) {
    const query = supabase.from(table).select("*");
    let res = await (ordered ? query.order("id") : query).range(from, from + PAGE_SIZE - 1);
    if (res.error && ordered && from === 0 && res.error.code === "42703") {
      ordered = false;
      res = await supabase.from(table).select("*").range(from, from + PAGE_SIZE - 1);
    }
    if (res.error) {
      const kind = classifyError(res.error);
      return { rows: [], status: { table, status: kind === "missing" ? "fehlt" : "fehler", rows: 0, message: res.error.message } };
    }
    rows.push(...(res.data ?? []));
    if (!res.data || res.data.length < PAGE_SIZE) break;
  }
  return { rows, status: { table, status: "ok", rows: rows.length } };
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
  const [result, setResult] = useState<{ rows: number; statuses: TableStatus[] } | null>(null);
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
    const statuses: TableStatus[] = [];
    let rows = 0;

    for (const [index, table] of TABLES.entries()) {
      setProgress(`${index + 1} / ${TABLES.length}: ${table}`);
      const loaded = await loadTable(table);
      statuses.push(loaded.status);
      if (loaded.status.status === "ok") {
        tables[table] = loaded.rows;
        rows += loaded.rows.length;
      }
    }

    const failed = statuses.filter((item) => item.status === "fehler");
    const now = new Date();
    const stamp = now.toISOString().slice(0, 16).replace(/[:T]/g, "-");
    const payload = {
      app: "monitoring-app",
      format: "json-datenexport-v2",
      exported_at: now.toISOString(),
      complete: failed.length === 0,
      note:
        "JSON-Datenexport: alle Zeilen, die der angemeldete Coach lesen darf. KEINE Vollsicherung: ohne Dateien aus dem Speicher (Dokumente), ohne Tabellenstruktur, ohne Logins. Wiederherstellung siehe docs/datensicherung.md.",
      tables,
      table_status: statuses,
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `monitoring-datenexport-${stamp}${failed.length ? "-UNVOLLSTAENDIG" : ""}.json`;
    link.click();
    URL.revokeObjectURL(url);

    // Nur ein vollstaendiger Export zaehlt als "letzte Sicherung"
    if (!failed.length) {
      try {
        localStorage.setItem(STORAGE_KEY, now.toISOString());
      } catch {
        /* egal - nur die Erinnerung */
      }
      setLastBackup(now.toISOString());
    }
    setNow(now.getTime());
    setResult({ rows, statuses });
    setProgress("");
    setRunning(false);
  }

  const daysSince = lastBackup && now ? Math.floor((now - new Date(lastBackup).getTime()) / 86400000) : null;
  const overdue = daysSince === null || daysSince >= REMIND_AFTER_DAYS;

  return (
    <section className="mt-6 rounded-[20px] border border-app-border bg-app-surface shadow-app p-5">
      <h2 className="text-lg font-semibold">Datenexport (JSON)</h2>

      <p className="mt-2 max-w-3xl text-sm leading-6 text-app-muted">
        Lädt alle Einträge, die du sehen darfst (Athleten, Zeiten, Trainings, Gesundheit, Ziele, Notizen, Dokument-Einträge …), als
        Datei auf dieses Gerät. Bewahre die Datei sicher auf – sie enthält persönliche und Gesundheitsdaten. Empfehlung: einmal pro
        Woche.
      </p>
      <p className="mt-2 max-w-3xl text-sm leading-6 text-app-muted">
        <b>Das ist keine Vollsicherung:</b> Hochgeladene Dateien (z. B. Atteste), die Tabellenstruktur und die Logins sind nicht
        enthalten. Dafür gibt es die Sicherung in Supabase – siehe <code>docs/datensicherung.md</code>.
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
        {running ? `Exportiere … ${progress}` : "Datensicherung herunterladen"}
      </button>

      {result && (
        <div className="mt-3 text-sm text-app-muted">
          {result.statuses.some((item) => item.status === "fehler") ? (
            <p className="font-semibold text-app-bad">
              Export UNVOLLSTÄNDIG – diese Tabellen konnten nicht gelesen werden:{" "}
              {result.statuses
                .filter((item) => item.status === "fehler")
                .map((item) => item.table)
                .join(", ")}
              . Bitte später erneut exportieren.
            </p>
          ) : (
            <p className="font-semibold text-app-good">Export vollständig: {result.rows.toLocaleString("de-DE")} Einträge.</p>
          )}
          {result.statuses.some((item) => item.status === "fehlt") && (
            <p className="mt-1">
              Noch nicht eingerichtet (kein Fehler):{" "}
              {result.statuses
                .filter((item) => item.status === "fehlt")
                .map((item) => item.table)
                .join(", ")}
            </p>
          )}
        </div>
      )}

      {error && <p className="mt-3 text-sm text-app-bad">{error}</p>}
    </section>
  );
}
