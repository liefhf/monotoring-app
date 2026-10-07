/*
 * Schmerzfrage im Check-in. Drei Antworten statt eines Schalters, der
 * automatisch auf "Nein" stand: "keine_angabe" wird getrennt von "nein"
 * gespeichert (Spalte befinden_entries.pain_answer, Skript 25).
 * has_pain bleibt fuer alle Auswertungen erhalten (true nur bei "ja").
 */
export type PainAnswer = "ja" | "nein" | "keine_angabe";

export function painAnswerFromEntry(entry: { has_pain: boolean | null; pain_answer?: PainAnswer | null }): PainAnswer | null {
  if (entry.pain_answer) return entry.pain_answer;
  // Alte Eintraege: false kann eine unbeantwortete Voreinstellung sein -> neu fragen
  return entry.has_pain ? "ja" : null;
}

/* true, wenn die Spalte pain_answer in der Datenbank (noch) fehlt */
export function withoutPainAnswer(error: { code?: string; message?: string }) {
  return (error.code === "PGRST204" || error.code === "42703") && /pain_answer/.test(error.message ?? "");
}
