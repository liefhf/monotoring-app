"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { isMissingTable } from "@/lib/supabase-codes";

/*
 * Einheitliche Lade- und Schreiblogik fuer Panels im Athletenprofil.
 *
 * Laden kennt genau fuenf Zustaende: loading, missing (Tabelle fehlt,
 * Skript nicht ausgefuehrt), error (Abfrage fehlgeschlagen), ready mit
 * leeren Daten und ready mit Daten. Ein Fehler wird nie als "leer"
 * angezeigt.
 *
 * Spaete Antworten: Wechselt der Athlet (oder kommt eine zweite Abfrage
 * schneller zurueck), wird nur die Antwort der juengsten Anfrage
 * uebernommen.
 */

export type LoadResult<T> = { status: "missing" } | { status: "error" } | { status: "ready"; data: T };
export type LoadState<T> = { status: "loading" } | LoadResult<T>;

type DbError = { code?: string } | null | undefined;

/* Fehler einer Abfrage einordnen. null = kein Fehler. */
export function classifyError(error: DbError): "missing" | "error" | null {
  if (!error) return null;
  return isMissingTable(error.code) ? "missing" : "error";
}

/* Ergebnis einer einzelnen Abfrage in einen Ladezustand uebersetzen. */
export function toLoadResult<T>(res: { data: T | null; error: DbError }, empty: T): LoadResult<T> {
  const kind = classifyError(res.error);
  if (kind) return { status: kind };
  return { status: "ready", data: res.data ?? empty };
}

/* Merkt sich die juengste Anfrage. Aeltere Antworten werden verworfen. */
export class LatestRequest {
  private current = 0;
  begin() {
    this.current += 1;
    return this.current;
  }
  isLatest(token: number) {
    return token === this.current;
  }
}

/*
 * Laedt Daten fuer einen Schluessel (z. B. swimmerId). fetcher muss
 * stabil sein (ausserhalb der Komponente definiert).
 * Beim Schluesselwechsel wird sofort "loading" gezeigt, nie die Daten
 * des vorherigen Athleten.
 */
export function useKeyedLoad<T>(key: string, fetcher: (key: string) => Promise<LoadResult<T>>) {
  const [entry, setEntry] = useState<{ key: string; result: LoadResult<T> } | null>(null);
  const requests = useRef(new LatestRequest());

  const reload = useCallback(async () => {
    const token = requests.current.begin();
    let result: LoadResult<T>;
    try {
      result = await fetcher(key);
    } catch {
      result = { status: "error" };
    }
    if (!requests.current.isLatest(token)) return;
    setEntry({ key, result });
  }, [key, fetcher]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const state: LoadState<T> = entry && entry.key === key ? entry.result : { status: "loading" };
  return { state, reload };
}

/*
 * Ergebnis eines Schreibvorgangs pruefen. Update und Delete muessen mit
 * .select("id") aufgerufen werden: 0 betroffene Zeilen (RLS verweigert
 * oder Eintrag existiert nicht mehr) ist KEIN Erfolg.
 */
export type WriteCheck = { ok: true } | { ok: false; reason: "missing" | "error" | "no-rows" };

export function checkWrite(res: { data?: unknown; error: DbError }, expectRows = true): WriteCheck {
  const kind = classifyError(res.error);
  if (kind) return { ok: false, reason: kind };
  if (expectRows && (!Array.isArray(res.data) || res.data.length === 0)) return { ok: false, reason: "no-rows" };
  return { ok: true };
}

export function writeErrorText(check: WriteCheck, what: string) {
  if (check.ok) return "";
  if (check.reason === "missing") return `${what}: Die Tabelle fehlt noch – bitte das passende SQL-Skript ausführen.`;
  if (check.reason === "no-rows")
    return `${what}: Es wurde nichts geändert. Der Eintrag existiert nicht mehr oder dir fehlt die Berechtigung. Bitte die Seite neu laden.`;
  return `${what}: Speichern fehlgeschlagen. Bitte Verbindung prüfen und erneut versuchen – deine Eingaben bleiben erhalten.`;
}

/* Verhindert doppeltes Absenden (Doppelklick, Enter + Klick). */
export function useBusy() {
  const lock = useRef(false);
  const [busy, setBusy] = useState(false);
  const run = useCallback(async <R,>(task: () => Promise<R>): Promise<R | undefined> => {
    if (lock.current) return undefined;
    lock.current = true;
    setBusy(true);
    try {
      return await task();
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }, []);
  return { busy, run };
}
