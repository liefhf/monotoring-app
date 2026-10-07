/*
 * Welche Befinden-Skala hat sich veraendert? Mittelwert der letzten
 * 14 Tage gegen die 14 Tage davor (je Skala 1-10, hoeher = besser).
 * Nur mit mindestens 3 Eintraegen je Zeitraum - sonst ist ein
 * Vergleich nicht belastbar. Kleine Schwankungen (< 0,5) werden nicht
 * gezeigt, weil sie im Rauschen subjektiver Skalen liegen.
 */

export type ScaleEntry = {
  entry_date: string;
  sleep_quality: number;
  energy: number;
  muscle_feeling: number;
  stress: number;
  mood: number;
};

export const SCALES: { key: keyof Omit<ScaleEntry, "entry_date">; label: string }[] = [
  { key: "sleep_quality", label: "Schlaf" },
  { key: "energy", label: "Energie" },
  { key: "muscle_feeling", label: "Muskelgefühl" },
  { key: "stress", label: "Entspannung" },
  { key: "mood", label: "Stimmung" },
];

const DAY = 86_400_000;
const MIN_ENTRIES = 3;
const MIN_CHANGE = 0.5;

export function scaleTrend(entries: ScaleEntry[], today: string) {
  const age = (date: string) => Math.round((Date.parse(today) - Date.parse(date)) / DAY);
  const recent = entries.filter((entry) => age(entry.entry_date) >= 0 && age(entry.entry_date) < 14);
  const before = entries.filter((entry) => age(entry.entry_date) >= 14 && age(entry.entry_date) < 28);
  if (recent.length < MIN_ENTRIES || before.length < MIN_ENTRIES) return [];

  const mean = (list: ScaleEntry[], key: (typeof SCALES)[number]["key"]) => list.reduce((sum, entry) => sum + entry[key], 0) / list.length;

  return SCALES.map((scale) => ({ ...scale, change: Math.round((mean(recent, scale.key) - mean(before, scale.key)) * 10) / 10 }))
    .filter((item) => Math.abs(item.change) >= MIN_CHANGE)
    .sort((a, b) => a.change - b.change);
}
