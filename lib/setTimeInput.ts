import { formatTime } from "@/lib/swim";

/*
 * Zeiteingabe fuer Serienzeiten am Beckenrand.
 *
 * Eindeutig (direkt uebernommen):
 *   1:12,40  1:12.40  1:12,4   -> 72 400 ms
 *   32,85    32.85    32       -> 32 850 ms / 32 000 ms (Sekunden unter 60)
 * Kurzschreibweise (nur Ziffern, 5-6 Stellen) = [m]m ss hh, IMMER mit
 * sichtbarer Deutung angezeigt:  11240 -> 1:12,40   021530 -> 2:15,30
 * Mehrdeutig (abgelehnt, nicht still umgedeutet):
 *   112,4  -> 1:12,4 oder 112,4 s (= 1:52,4)?
 *   152    -> 1:52 oder 1,52 s?      3285 -> 32,85 oder 0:32:85?
 * "x" oder "-" = nicht geschwommen, leer = noch nicht erfasst.
 */

export type ParsedTime =
  | { kind: "empty" }
  | { kind: "missed" }
  | { kind: "time"; ms: number; shorthand: boolean; display: string; warning: string | null }
  | { kind: "ambiguous"; message: string }
  | { kind: "invalid"; message: string };

function plausibility(ms: number, distance: number | null) {
  if (!distance) return null;
  const per100 = (ms / distance) * 100;
  // grobe Grenzen ueber alle Lagen und Altersklassen: 0:45 bis 4:00 je 100 m
  if (per100 < 45_000) return "ungewöhnlich schnell für die Strecke – bitte prüfen";
  if (per100 > 240_000) return "ungewöhnlich langsam für die Strecke – bitte prüfen";
  return null;
}

export function parseRepTime(raw: string, distance: number | null = null): ParsedTime {
  const value = raw.trim();
  if (!value) return { kind: "empty" };
  if (/^[-x–—/]$/i.test(value)) return { kind: "missed" };

  const time = (ms: number, shorthand: boolean): ParsedTime => ({
    kind: "time",
    ms,
    shorthand,
    display: formatTime(ms),
    warning: plausibility(ms, distance),
  });

  // m:ss[,hh]
  let m = /^(\d{1,2}):(\d{1,2})(?:[.,](\d{1,2}))?$/.exec(value);
  if (m) {
    const seconds = Number(m[2]);
    if (m[2].length !== 2) return { kind: "invalid", message: "Sekunden bitte zweistellig, z. B. 1:05,30" };
    if (seconds >= 60) return { kind: "invalid", message: "Sekunden müssen unter 60 liegen" };
    const hundredths = m[3] ? Number(m[3].padEnd(2, "0")) : 0;
    return time((Number(m[1]) * 60 + seconds) * 1000 + hundredths * 10, false);
  }

  // ss[,hh]
  m = /^(\d{1,3})(?:[.,](\d{1,2}))?$/.exec(value);
  if (m && (m[2] !== undefined || Number(m[1]) < 60)) {
    const seconds = Number(m[1]);
    if (seconds >= 60) {
      return {
        kind: "ambiguous",
        message: `Mehrdeutig: ${seconds} s (= ${formatTime(seconds * 1000)}) oder ${Math.floor(seconds / 100)}:${String(seconds % 100).padStart(2, "0")}? Bitte mit Doppelpunkt eingeben.`,
      };
    }
    const hundredths = m[2] ? Number(m[2].padEnd(2, "0")) : 0;
    return time(seconds * 1000 + hundredths * 10, false);
  }

  // 3-4 Ziffern ohne Trennzeichen sind nicht eindeutig
  if (/^\d{3,4}$/.test(value)) {
    return { kind: "ambiguous", message: `„${value}“ ist nicht eindeutig – bitte mit Doppelpunkt oder Komma eingeben (z. B. 1:52 oder 32,85).` };
  }

  // Kurzschreibweise: nur Ziffern, 5-6 Stellen, [m]m ss hh
  if (/^\d{5,6}$/.test(value)) {
    const digits = value.padStart(6, "0");
    const minutes = Number(digits.slice(0, 2));
    const seconds = Number(digits.slice(2, 4));
    const hundredths = Number(digits.slice(4, 6));
    if (seconds >= 60) return { kind: "invalid", message: "Kurzschreibweise nicht lesbar (Sekunden ≥ 60)" };
    return time((minutes * 60 + seconds) * 1000 + hundredths * 10, true);
  }

  return { kind: "invalid", message: "Zeit nicht erkannt – z. B. 1:12,40 oder 32,85" };
}

/* gespeicherte Werte -> Eingabetext */
export function repInputValue(ms: number | null, missed: boolean) {
  if (missed) return "x";
  return ms === null ? "" : formatTime(ms);
}
