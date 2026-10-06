import { supabase } from "@/lib/supabase";
import { formatTime, parseSwimTimeToMs } from "@/lib/swim";

/*
 * Serienzeiten je Trainingseinheit (Tabelle training_set_times,
 * siehe supabase/serienzeiten.sql). Vergleich mit der letzten Einheit,
 * in der derselbe Athlet dieselbe Serie (gleicher Name) geschwommen ist.
 */

export type SetTimeRow = {
  training_session_id: string;
  swimmer_id: string;
  set_label: string;
  stroke: string | null;
  interval_seconds: number | null;
  times_ms: (number | null)[];
  note: string | null;
};

export type SetStats = {
  count: number;
  planned: number;
  averageMs: number | null;
  bestMs: number | null;
  /* Mittel der letzten Haelfte minus Mittel der ersten Haelfte (positiv = langsamer geworden) */
  dropOffMs: number | null;
  /* Wiederholungen, die innerhalb des Abgangs geschwommen wurden */
  withinInterval: number | null;
};

/* "1:41 1:40 - 1:51" -> [101000, 100000, null, 111000]; "-", "x", "/" = nicht geschwommen */
export function parseTimesInput(value: string) {
  const tokens = value.trim().split(/[\s;|]+/).filter(Boolean);
  const times: (number | null)[] = [];
  const invalid: string[] = [];
  for (const token of tokens) {
    if (/^[-x/✓—–]$/i.test(token)) {
      times.push(null);
      continue;
    }
    const ms = parseSwimTimeToMs(token);
    if (ms === null) invalid.push(token);
    else times.push(ms);
  }
  return { times, invalid };
}

export function formatTimesInput(times: (number | null)[]) {
  return times.map((ms) => (ms === null ? "-" : formatTime(ms))).join(" ");
}

/* "1:40" -> 100, "90" -> 90 */
export function parseIntervalSeconds(value: string) {
  const ms = parseSwimTimeToMs(value);
  return ms === null ? null : Math.round(ms / 1000);
}

export function formatInterval(seconds: number) {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

const mean = (values: number[]) => (values.length ? values.reduce((sum, v) => sum + v, 0) / values.length : null);

export function setStats(times: (number | null)[], intervalSeconds: number | null): SetStats {
  const valid = times.filter((ms): ms is number => ms !== null);
  const half = Math.floor(valid.length / 2);
  const first = mean(valid.slice(0, half));
  const last = mean(valid.slice(valid.length - half));
  return {
    count: valid.length,
    planned: times.length,
    averageMs: mean(valid),
    bestMs: valid.length ? Math.min(...valid) : null,
    dropOffMs: half > 0 && first !== null && last !== null ? last - first : null,
    withinInterval: intervalSeconds ? valid.filter((ms) => ms <= intervalSeconds * 1000).length : null,
  };
}

export async function loadSessionSetTimes(sessionId: string) {
  const { data, error } = await supabase
    .from("training_set_times")
    .select("training_session_id, swimmer_id, set_label, stroke, interval_seconds, times_ms, note")
    .eq("training_session_id", sessionId);
  return { rows: (data ?? []) as SetTimeRow[], missingTable: Boolean(error) };
}

/* Je Athlet + Serie der zuletzt davor geschwommene Eintrag (fruehere Einheit) */
export async function loadPreviousSetTimes(swimmerIds: string[], labels: string[], beforeDate: string) {
  if (swimmerIds.length === 0 || labels.length === 0) return [];
  const { data } = await supabase
    .from("training_set_times")
    .select("swimmer_id, set_label, stroke, interval_seconds, times_ms, training_sessions!inner(session_date)")
    .in("swimmer_id", swimmerIds)
    .in("set_label", labels)
    .lt("training_sessions.session_date", beforeDate);
  const rows = (data ?? []) as unknown as (Omit<SetTimeRow, "training_session_id" | "note"> & {
    training_sessions: { session_date: string };
  })[];
  const latest = new Map<string, (typeof rows)[number]>();
  for (const row of rows) {
    const key = `${row.swimmer_id}|${row.set_label}`;
    const current = latest.get(key);
    if (!current || row.training_sessions.session_date > current.training_sessions.session_date) latest.set(key, row);
  }
  return [...latest.values()].map((row) => ({ ...row, date: row.training_sessions.session_date }));
}

export async function saveSetTimes(row: SetTimeRow) {
  const { error } = await supabase
    .from("training_set_times")
    .upsert({ ...row, updated_at: new Date().toISOString() }, { onConflict: "training_session_id,swimmer_id,set_label" });
  return error?.message ?? null;
}
