/*
 * Schnelleingabe fuer Serien, so wie Trainer sie auf die Tafel schreiben:
 *   "8x200 Kraul GA2 @3:00"   "4 × 50 Beine P20"   "400 locker ein"
 * Erkannt werden Wiederholungen, Strecke, Lage, Zone und Abgang/Pause.
 * Alles Uebrige wird zur Uebung (Freitext). Mehrere Serien = mehrere Zeilen.
 */

export type ParsedSet = {
  repetitions: number;
  distance: number;
  style: string | null;
  zone: string | null;
  intervalType: "P" | "@" | null;
  intervalTime: string;
  exercise: string;
};

/* Lagen wie im Trainingseditor; Kurzformen wie auf der Tafel */
const STYLE_WORDS: [RegExp, string][] = [
  [/^(kraul|freistil|f|k|fr)$/i, "Kraul"],
  [/^(rücken|ruecken|r)$/i, "Rücken"],
  [/^(brust|b)$/i, "Brust"],
  [/^(schmetterling|delfin|delphin|s|d)$/i, "Schmetterling"],
  [/^(lagen|im|l)$/i, "Lagen"],
  [/^beine?$/i, "Beine"],
  [/^arme?$/i, "Arme"],
  [/^(beliebig|frei|wahl)$/i, "Beliebig"],
];

/* Zonen wie im Editor ("BZ4 (GA2)"); GA1 -> BZ2 als untere GA1-Zone */
export const ZONE_LABELS = ["BZ1 (Rekom)", "BZ2 (GA1)", "BZ3 (GA1)", "BZ4 (GA2)", "BZ5 (GA2)", "BZ6 (WA)", "BZ7 (SA)", "BZ8 (S)"];
const ZONE_ALIASES: Record<string, number> = { REKOM: 1, KOM: 1, GA1: 2, GA2: 4, WA: 6, SA: 7, S: 8 };

function formatInterval(raw: string) {
  const value = raw.replace(",", ":").replace(".", ":");
  if (/^\d{1,2}:\d{2}$/.test(value)) return value;
  if (/^\d{1,3}$/.test(value)) {
    const seconds = Number(value);
    return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
  }
  return value;
}

export function parseSetLine(line: string): ParsedSet | null {
  let text = line.trim();
  if (!text) return null;

  let intervalType: ParsedSet["intervalType"] = null;
  let intervalTime = "";
  const interval = /(?:^|\s)(@|p|pause)\s*(\d{1,2}[:.,]\d{2}|\d{1,3})(?:\s*s)?(?=\s|$)/i.exec(text);
  if (interval) {
    intervalType = interval[1] === "@" ? "@" : "P";
    intervalTime = formatInterval(interval[2]);
    text = (text.slice(0, interval.index) + " " + text.slice(interval.index + interval[0].length)).trim();
  }

  const volume = /^(?:(\d{1,3})\s*[x×*]\s*)?(\d{2,4})\s*m?\b/i.exec(text);
  if (!volume) return null;
  /* "10 min locker" ist eine Zeit, keine Strecke - lieber nicht erkennen als falsch */
  if (/^\s*(min|minuten|sek|sekunden|sec|s\b|h\b|std)/i.test(text.slice(volume[0].length)) && !/m$/i.test(volume[0].trim())) return null;
  const repetitions = volume[1] ? Number(volume[1]) : 1;
  const distance = Number(volume[2]);
  if (!repetitions || !distance) return null;
  text = text.slice(volume[0].length).trim();

  let style: string | null = null;
  let zone: string | null = null;
  const rest: string[] = [];
  for (const word of text.split(/\s+/).filter(Boolean)) {
    const bz = /^bz\s*([1-8])$/i.exec(word);
    const alias = ZONE_ALIASES[word.toUpperCase()];
    const styleMatch = STYLE_WORDS.find(([pattern]) => pattern.test(word));
    if (!zone && bz) zone = ZONE_LABELS[Number(bz[1]) - 1];
    else if (!zone && alias && !(word.toUpperCase() === "S" && !style && styleMatch)) zone = ZONE_LABELS[alias - 1];
    else if (!style && styleMatch) style = styleMatch[1];
    else rest.push(word);
  }

  return { repetitions, distance, style, zone, intervalType, intervalTime, exercise: rest.join(" ") };
}

export function parseSetBlock(text: string) {
  return text
    .split(/\n|;/)
    .map(parseSetLine)
    .filter((set): set is ParsedSet => set !== null);
}

export function totalMeters(sets: Pick<ParsedSet, "repetitions" | "distance">[]) {
  return sets.reduce((sum, set) => sum + set.repetitions * set.distance, 0);
}
