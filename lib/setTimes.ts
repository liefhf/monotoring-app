import { supabase } from "@/lib/supabase";
import { checkWrite, classifyError, writeErrorText } from "@/lib/loadState";
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
  /* Kontext (Skript 27, optional) */
  distance?: number | null;
  repetitions?: number | null;
  pool_length?: number | null;
  zone?: string | null;
  interval_type?: string | null;
  target_ms?: number | null;
  missed_reps?: number[] | null;
  plan_key?: string | null;
  materials?: string[] | null;
  updated_at?: string;
};

/* Geplante Serie aus dem Trainingsplan */
export type PlannedSeries = {
  plan_key: string;
  label: string;
  distance: number;
  repetitions: number;
  stroke: string | null;
  zone: string | null;
  interval_type: string | null;
  interval_seconds: number | null;
  materials: string[];
};

/* "8×200 Kraul GA2 @3:00" */
export function seriesLabel(row: { repetitions: number; distance: number; style?: string | null; zone?: string | null; interval_type?: string | null; interval_time?: string | null }) {
  const parts = [`${row.repetitions > 1 ? `${row.repetitions}×` : ""}${row.distance}`];
  if (row.style && row.style !== "Beliebig") parts.push(row.style);
  if (row.zone) parts.push(row.zone);
  if (row.interval_time) parts.push(`${row.interval_type === "@" ? "@" : "P "}${row.interval_time}`);
  return parts.join(" ");
}

/* Abgang/Pause "3:00" -> 180 s; "20" (Pause in s) -> 20 */
export function intervalToSeconds(value: string | null | undefined) {
  if (!value) return null;
  const m = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (m) return Number(m[1]) * 60 + Number(m[2]);
  const n = Number(value.replace(",", "."));
  return Number.isFinite(n) && n > 0 ? Math.round(n) : null;
}

/* Wasser-Serien einer Einheit (nur Serien mit mindestens 2 Wiederholungen) */
export async function loadPlannedSeries(sessionId: string): Promise<{ series: PlannedSeries[]; failed: boolean }> {
  const sections = await supabase.from("training_sections").select("id, sort_order").eq("training_session_id", sessionId).order("sort_order");
  if (sections.error) return { series: [], failed: true };
  const list = (sections.data ?? []) as { id: string; sort_order: number }[];
  if (!list.length) return { series: [], failed: false };
  const rows = await supabase
    .from("training_rows")
    .select("section_id, repetitions, distance, style, zone, interval_type, interval_time, materials, sort_order")
    .in("section_id", list.map((x) => x.id))
    .order("sort_order");
  if (rows.error) return { series: [], failed: true };
  const order = new Map(list.map((x) => [x.id, x.sort_order]));
  const typed = (rows.data ?? []) as { section_id: string; repetitions: number; distance: number; style: string | null; zone: string | null; interval_type: string | null; interval_time: string | null; materials: string[] | null; sort_order: number }[];
  return {
    failed: false,
    series: typed
      .filter((row) => row.repetitions >= 2 && row.distance > 0)
      .sort((a, b) => (order.get(a.section_id) ?? 0) - (order.get(b.section_id) ?? 0) || a.sort_order - b.sort_order)
      .map((row) => ({
        plan_key: `${order.get(row.section_id) ?? 0}.${row.sort_order}`,
        label: seriesLabel(row),
        distance: row.distance,
        repetitions: row.repetitions,
        stroke: row.style && row.style !== "Beliebig" ? row.style : null,
        zone: row.zone,
        interval_type: row.interval_type,
        interval_seconds: intervalToSeconds(row.interval_time),
        materials: row.materials ?? [],
      })),
  };
}

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
  // "*": Kontextspalten aus Skript 27 sind optional
  const { data, error } = await supabase.from("training_set_times").select("*").eq("training_session_id", sessionId);
  const kind = classifyError(error);
  return { rows: (data ?? []) as SetTimeRow[], missingTable: kind === "missing", failed: kind === "error" };
}

/* Fruehere Serien derselben Athleten mit gleicher Strecke (Vergleich wird danach geprueft) */
export async function loadEarlierSeries(swimmerIds: string[], distance: number, beforeDate: string) {
  if (!swimmerIds.length) return { rows: [] as (SetTimeRow & { date: string })[], failed: false };
  const { data, error } = await supabase
    .from("training_set_times")
    .select("*, training_sessions!inner(session_date, pool_length)")
    .in("swimmer_id", swimmerIds)
    .eq("distance", distance)
    .lt("training_sessions.session_date", beforeDate);
  if (error) return { rows: [], failed: classifyError(error) === "error" };
  const rows = (data ?? []) as unknown as (SetTimeRow & { training_sessions: { session_date: string; pool_length: number | null } })[];
  return { rows: rows.map((row) => ({ ...row, pool_length: row.pool_length ?? row.training_sessions.pool_length, date: row.training_sessions.session_date })), failed: false };
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

const LEGACY_COLUMNS = ["training_session_id", "swimmer_id", "set_label", "stroke", "interval_seconds", "times_ms", "note"] as const;

/* Speichert eine Athletenzeile. null = gespeichert, sonst Fehlertext. 0 Zeilen = Fehler. */
export async function saveSetTimes(row: SetTimeRow) {
  const { updated_at: _ignored, ...clean } = row;
  void _ignored;
  const attempt = (values: Record<string, unknown>) =>
    supabase
      .from("training_set_times")
      .upsert({ ...values, updated_at: new Date().toISOString() }, { onConflict: "training_session_id,swimmer_id,set_label" })
      .select("swimmer_id");
  let res = await attempt(clean);
  // Kontextspalten fehlen noch (Skript 27): ohne sie speichern, Zeiten gehen nicht verloren
  if (res.error && (res.error.code === "PGRST204" || res.error.code === "42703")) {
    res = await attempt(Object.fromEntries(LEGACY_COLUMNS.map((key) => [key, (clean as Record<string, unknown>)[key] ?? null])));
  }
  const check = checkWrite(res);
  return check.ok ? null : writeErrorText(check, "Serienzeiten");
}
