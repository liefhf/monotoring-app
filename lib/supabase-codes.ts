/*
 * true, wenn eine Tabelle (noch) nicht existiert - z. B. weil ein
 * SQL-Skript aus supabase/ noch nicht ausgefuehrt wurde.
 * Eigene Datei ohne Supabase-Client, damit sie in Tests nutzbar ist.
 */
export function isMissingTable(code: string | undefined) {
  return code === "42P01" || code === "PGRST205";
}
