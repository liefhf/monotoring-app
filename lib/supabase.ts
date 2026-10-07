import { createClient } from "@supabase/supabase-js";
import { trackedFetch } from "@/lib/loadingTracker";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/* trackedFetch: Ladebalken oben laeuft, solange Daten geladen werden */
export const supabase = createClient(supabaseUrl, supabaseAnonKey, { global: { fetch: trackedFetch } });

/*
 * true, wenn eine Tabelle (noch) nicht existiert - z. B. weil ein
 * SQL-Skript aus supabase/ noch nicht ausgefuehrt wurde. Seiten zeigen
 * dann einen Hinweis statt eines Fehlers.
 */
export function isMissingTable(code: string | undefined) {
  return code === "42P01" || code === "PGRST205";
}
