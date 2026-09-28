import { supabase } from "@/lib/supabase";
import { CALENDAR_COLUMNS, CalendarEntry, formatEntryWhen } from "@/lib/community";
import { NON_FINISH_COLUMNS, NonFinish } from "@/lib/swim";

/* Naechster Wettkampf aus dem Kalender (Kategorie "wettkampf", ab heute) */
export async function loadUpcomingCompetitions() {
  const { data } = await supabase
    .from("calendar_entries")
    .select(CALENDAR_COLUMNS)
    .eq("category", "wettkampf")
    .gte("starts_at", new Date(new Date().setHours(0, 0, 0, 0)).toISOString())
    .order("starts_at");

  return (data ?? []) as CalendarEntry[];
}

/* "Priorität A (Pflicht!) · ..." -> "A" */
export function competitionPriority(entry: CalendarEntry) {
  return entry.description?.match(/Priorit[äa]t:?\s*([ABC])/i)?.[1]?.toUpperCase() ?? null;
}

export function daysUntil(entry: CalendarEntry) {
  const start = new Date(entry.starts_at);
  start.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((start.getTime() - today.getTime()) / 86_400_000);
}

export function describeCompetition(entry: CalendarEntry) {
  const priority = competitionPriority(entry);
  const days = daysUntil(entry);
  return `${entry.title} · ${formatEntryWhen(entry)}${priority ? ` · Priorität ${priority}` : ""} · ${
    days === 0 ? "heute" : days === 1 ? "morgen" : `in ${days} Tagen`
  }`;
}

/* Starts ohne Zeit; fehlt die Tabelle noch (Skript nicht ausgefuehrt), leer */
export async function loadNonFinishes(swimmerId?: string) {
  let query = supabase.from("swimmer_non_finishes").select(NON_FINISH_COLUMNS).order("result_date");
  if (swimmerId) query = query.eq("swimmer_id", swimmerId);
  const { data, error } = await query;
  return { rows: (data ?? []) as NonFinish[], missingTable: Boolean(error) };
}
