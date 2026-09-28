/*
 * Gemeinsame Typen und Hilfsfunktionen fuer
 * "Meine Schwimmer" und "Pflichtzeiten".
 *
 * Zeiten werden immer in Millisekunden gespeichert
 * (1:05,23 -> 65230) und nur fuer die Anzeige
 * wieder in Schwimmer-Schreibweise umgewandelt.
 */

export type Stroke =
  | "freestyle"
  | "backstroke"
  | "breaststroke"
  | "butterfly"
  | "medley";

export type Gender = "female" | "male";

export type PoolLength = 25 | 50;

export type Swimmer = {
  id: string;
  first_name: string;
  last_name: string | null;
  birth_year: number | null;
  gender: Gender | null;
};

/* Persoenliche Daten fuer den Tab "Infos" */
export type SwimmerDetails = Swimmer & {
  birth_date: string | null;
  nationality: string | null;
  dsv_id: string | null;
  club_name: string | null;
  club_id: string | null;
  club_since: string | null;
};

export const SWIMMER_DETAIL_COLUMNS =
  "id, first_name, last_name, birth_year, gender, birth_date, nationality, dsv_id, club_name, club_id, club_since";

export type ResultKind = "einzel" | "staffel" | "freiwasser";

/* Einzelstart im Becken (kind = 'einzel') */
export type SwimmerResult = {
  id: string;
  swimmer_id: string;
  result_date: string;
  location: string | null;
  pool_length: PoolLength;
  distance: number;
  stroke: Stroke;
  time_ms: number;
  points: number | null;
  round: string | null;
  is_split: boolean;
};

/* Staffel oder Freiwasser - frei beschriftet, z. B. "4x100 F" oder "5 km" */
export type OtherResult = {
  id: string;
  swimmer_id: string;
  kind: "staffel" | "freiwasser";
  result_date: string;
  location: string | null;
  event_label: string;
  time_ms: number;
  points: number | null;
  placement: number | null;
};

export const RESULT_COLUMNS =
  "id, swimmer_id, kind, result_date, location, pool_length, distance, stroke, event_label, time_ms, points, round, is_split, placement";

/* Start ohne Zeit: DS = disqualifiziert, AB = abgemeldet, NA = nicht angetreten */
export type NonFinishStatus = "DS" | "AB" | "NA";

export type NonFinish = {
  id: string;
  swimmer_id: string;
  result_date: string;
  location: string | null;
  pool_length: PoolLength;
  distance: number;
  stroke: Stroke;
  status: NonFinishStatus;
  reason: string | null;
};

export const NON_FINISH_COLUMNS = "id, swimmer_id, result_date, location, pool_length, distance, stroke, status, reason";

export const NON_FINISH_LABELS: Record<NonFinishStatus, string> = {
  DS: "disqualifiziert",
  AB: "abgemeldet",
  NA: "nicht angetreten",
};

export const ROUNDS = ["Vorlauf", "Zwischenlauf", "Finale"];

export type QualifyingStandard = {
  id: string;
  name: string;
  pool_length: PoolLength;
  valid_from: string | null;
  valid_to: string | null;
  /* true = Zeiten von der 25m- und der 50m-Bahn zaehlen (fehlt/null = nur pool_length) */
  count_both_pools?: boolean | null;
};

export type QualifyingTime = {
  id: string;
  standard_id: string;
  gender: Gender | null;
  birth_year_from: number | null;
  birth_year_to: number | null;
  distance: number;
  stroke: Stroke;
  time_ms: number;
};

/* Reihenfolge und Kuerzel wie in der DSV-Datenbank */
export const STROKES: { value: Stroke; label: string; short: string }[] = [
  { value: "freestyle", label: "Freistil", short: "F" },
  { value: "breaststroke", label: "Brust", short: "B" },
  { value: "backstroke", label: "Rücken", short: "R" },
  { value: "butterfly", label: "Schmetterling", short: "S" },
  { value: "medley", label: "Lagen", short: "L" },
];

export type SwimEvent = {
  distance: number;
  stroke: Stroke;
};

/* Alle Strecken, in der Reihenfolge einer Bestzeitenliste. */
export const SWIM_EVENTS: SwimEvent[] = [
  { distance: 50, stroke: "freestyle" },
  { distance: 100, stroke: "freestyle" },
  { distance: 200, stroke: "freestyle" },
  { distance: 400, stroke: "freestyle" },
  { distance: 800, stroke: "freestyle" },
  { distance: 1500, stroke: "freestyle" },

  { distance: 50, stroke: "breaststroke" },
  { distance: 100, stroke: "breaststroke" },
  { distance: 200, stroke: "breaststroke" },

  { distance: 50, stroke: "backstroke" },
  { distance: 100, stroke: "backstroke" },
  { distance: 200, stroke: "backstroke" },

  { distance: 50, stroke: "butterfly" },
  { distance: 100, stroke: "butterfly" },
  { distance: 200, stroke: "butterfly" },

  { distance: 100, stroke: "medley" },
  { distance: 200, stroke: "medley" },
  { distance: 400, stroke: "medley" },
];

export function getDistancesForStroke(stroke: Stroke) {
  return SWIM_EVENTS.filter((event) => event.stroke === stroke).map(
    (event) => event.distance
  );
}

export function formatStroke(stroke: Stroke) {
  return STROKES.find((item) => item.value === stroke)?.label ?? stroke;
}

export function formatEvent(event: SwimEvent) {
  return `${event.distance} m ${formatStroke(event.stroke)}`;
}

/* DSV-Kurzform: "100 F", "50 S" */
export function formatEventShort(event: SwimEvent) {
  const short = STROKES.find((item) => item.value === event.stroke)?.short ?? "";

  return `${event.distance} ${short}`;
}

/* 100 m Lagen wird nur auf der 25m-Bahn geschwommen. */
export function getEventsForPool(poolLength: PoolLength) {
  return SWIM_EVENTS.filter(
    (event) => !(poolLength === 50 && event.stroke === "medley" && event.distance === 100)
  );
}

const MONTHS = ["Jan", "Feb", "Mrz", "Apr", "Mai", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dez"];

/* "2026-06-14" -> "Jun" */
export function formatMonthShort(date: string) {
  return MONTHS[Number(date.slice(5, 7)) - 1] ?? "";
}

/* "2026-06-14" -> "6/2026" */
export function formatMonthYear(date: string) {
  return `${Number(date.slice(5, 7))}/${date.slice(0, 4)}`;
}

/*
 * Rohdaten aus swimmer_results in Einzelstarts und
 * Staffel/Freiwasser aufteilen. Alte Zeilen ohne kind
 * gelten als Einzelstart.
 */
export function splitResults(rows: Record<string, unknown>[]) {
  const pool: SwimmerResult[] = [];
  const other: OtherResult[] = [];

  for (const row of rows) {
    const kind = (row.kind as ResultKind | undefined) ?? "einzel";

    if (kind === "einzel") {
      pool.push({ ...(row as SwimmerResult), is_split: Boolean(row.is_split) });
    } else {
      other.push(row as OtherResult);
    }
  }

  return { pool, other };
}

export function eventKey(event: SwimEvent) {
  return `${event.distance}-${event.stroke}`;
}

export function formatGender(gender: Gender | null) {
  if (gender === "female") {
    return "weiblich";
  }

  if (gender === "male") {
    return "männlich";
  }

  return "–";
}

export function getSwimmerName(swimmer: Swimmer) {
  return `${swimmer.first_name} ${swimmer.last_name ?? ""}`.trim();
}

/* 65230 -> "1:05,23", 31450 -> "31,45" */
export function formatTime(timeMs: number) {
  const totalHundredths = Math.round(timeMs / 10);
  const minutes = Math.floor(totalHundredths / 6000);
  const seconds = (totalHundredths % 6000) / 100;

  if (minutes === 0) {
    return seconds.toFixed(2).replace(".", ",");
  }

  return `${minutes}:${seconds.toFixed(2).padStart(5, "0").replace(".", ",")}`;
}

/* Abstand zur Pflichtzeit: "-1,23" (schneller) oder "+0,45" (langsamer) */
export function formatTimeDifference(diffMs: number) {
  const sign = diffMs > 0 ? "+" : diffMs < 0 ? "−" : "±";

  return `${sign}${formatTime(Math.abs(diffMs))}`;
}

/*
 * Akzeptiert "31,45", "31.45", "1:05,23" und "1:05.23".
 * Gibt null zurueck, wenn die Eingabe keine gueltige Zeit ist.
 */
export function parseSwimTimeToMs(value: string) {
  const cleanValue = value.trim().replace(",", ".");

  if (!cleanValue) {
    return null;
  }

  let minutes = 0;
  let secondsText = cleanValue;

  if (cleanValue.includes(":")) {
    const parts = cleanValue.split(":");

    if (parts.length !== 2 || parts[0] === "") {
      return null;
    }

    minutes = Number(parts[0]);
    secondsText = parts[1];
  }

  const seconds = Number(secondsText);

  if (
    secondsText === "" ||
    Number.isNaN(minutes) ||
    Number.isNaN(seconds) ||
    minutes < 0 ||
    seconds < 0 ||
    (cleanValue.includes(":") && seconds >= 60)
  ) {
    return null;
  }

  const timeMs = Math.round((minutes * 60 + seconds) * 1000);

  return timeMs > 0 ? timeMs : null;
}

/* "2026-09-27" -> "27.09.2026" */
export function formatDate(date: string | null) {
  if (!date) {
    return "–";
  }

  const [year, month, day] = date.split("-");

  if (!year || !month || !day) {
    return date;
  }

  return `${day}.${month}.${year}`;
}

export function getYear(date: string) {
  return Number(date.slice(0, 4));
}

/*
 * Bestzeit, die fuer eine Pflichtzeiten-Liste zaehlt: Qualifikationszeitraum
 * beachten und - falls die Liste es erlaubt - beide Bahnlaengen.
 */
export function findBestForStandard(
  results: SwimmerResult[],
  event: SwimEvent,
  standard: QualifyingStandard
) {
  return findBestResult(results, event, standard.count_both_pools ? null : standard.pool_length, {
    from: standard.valid_from,
    to: standard.valid_to,
  });
}

/*
 * Schnellste Zeit fuer eine Strecke. poolLength null = beide Bahnen.
 * Optional nur innerhalb eines Zeitraums (fuer Qualifikationszeitraeume).
 */
export function findBestResult(
  results: SwimmerResult[],
  event: SwimEvent,
  poolLength: PoolLength | null,
  period?: { from: string | null; to: string | null }
) {
  let best: SwimmerResult | null = null;

  for (const result of results) {
    if (
      result.distance !== event.distance ||
      result.stroke !== event.stroke ||
      (poolLength !== null && result.pool_length !== poolLength)
    ) {
      continue;
    }

    if (period?.from && result.result_date < period.from) {
      continue;
    }

    if (period?.to && result.result_date > period.to) {
      continue;
    }

    if (
      !best ||
      result.time_ms < best.time_ms ||
      (result.time_ms === best.time_ms &&
        result.result_date > best.result_date)
    ) {
      best = result;
    }
  }

  return best;
}

/*
 * Gilt diese Pflichtzeit fuer diesen Schwimmer?
 * Fehlen beim Schwimmer Jahrgang oder Geschlecht, passt
 * nur eine Pflichtzeit, die dafuer keine Einschraenkung hat.
 */
export function qualifyingTimeApplies(
  time: QualifyingTime,
  swimmer: Swimmer
) {
  if (time.gender && time.gender !== swimmer.gender) {
    return false;
  }

  if (time.birth_year_from !== null || time.birth_year_to !== null) {
    if (swimmer.birth_year === null) {
      return false;
    }

    if (
      time.birth_year_from !== null &&
      swimmer.birth_year < time.birth_year_from
    ) {
      return false;
    }

    if (
      time.birth_year_to !== null &&
      swimmer.birth_year > time.birth_year_to
    ) {
      return false;
    }
  }

  return true;
}

/*
 * Die fuer den Schwimmer gueltige Pflichtzeit einer Strecke.
 * Passen mehrere (z. B. "alle" und "Jahrgang 2011"), gilt
 * die strengste, also die schnellste Zeit.
 */
export function findQualifyingTime(
  times: QualifyingTime[],
  swimmer: Swimmer,
  event: SwimEvent
) {
  let match: QualifyingTime | null = null;

  for (const time of times) {
    if (
      time.distance !== event.distance ||
      time.stroke !== event.stroke ||
      !qualifyingTimeApplies(time, swimmer)
    ) {
      continue;
    }

    if (!match || time.time_ms < match.time_ms) {
      match = time;
    }
  }

  return match;
}

export function formatBirthYearRange(
  from: number | null,
  to: number | null
) {
  if (from === null && to === null) {
    return "alle";
  }

  if (from !== null && to !== null) {
    return from === to ? `${from}` : `${from}–${to}`;
  }

  if (from !== null) {
    return `${from} und jünger`;
  }

  return `${to} und älter`;
}

/* Gemeinsame Tailwind-Klassen fuer Eingabefelder */
export const inputClass =
  "w-full rounded-xl border border-app-border bg-app-bg px-4 py-3 text-sm outline-none transition focus:border-app-accent";
