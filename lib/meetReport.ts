import {
  QualifyingStandard,
  QualifyingTime,
  Swimmer,
  SwimmerResult,
  findBestForStandard,
  findQualifyingTime,
} from "@/lib/swim";

/*
 * Wettkampf-Auswertung aus den Einzelergebnissen der Athleten.
 * Ein "Wettkampf" = gleicher Ort + gleicher Monat + gleiche Bahn
 * (der DSV liefert nur den Monat, nicht den genauen Tag).
 */

export type Meet = {
  key: string;
  location: string;
  month: string; // "2026-09"
  pool: number;
  firstDate: string;
  starts: number;
  swimmers: number;
};

export type MeetStart = {
  result: SwimmerResult;
  swimmer: Swimmer;
  /* bisherige Bestzeit auf derselben Bahn vor diesem Wettkampf */
  previousBest: SwimmerResult | null;
  previousDiff: number | null;
  required: QualifyingTime | null;
  requiredDiff: number | null;
  /* Pflichtzeit mit diesem Start erstmals im Qualifikationszeitraum erreicht */
  newlyQualified: boolean;
};

export function meetKey(result: SwimmerResult) {
  return `${result.location ?? ""}|${result.result_date.slice(0, 7)}|${result.pool_length}`;
}

export function listMeets(results: SwimmerResult[]): Meet[] {
  const meets = new Map<string, Meet & { ids: Set<string> }>();

  for (const result of results) {
    if (!result.location) {
      continue;
    }

    const key = meetKey(result);
    const meet =
      meets.get(key) ??
      meets
        .set(key, {
          key,
          location: result.location,
          month: result.result_date.slice(0, 7),
          pool: result.pool_length,
          firstDate: result.result_date,
          starts: 0,
          swimmers: 0,
          ids: new Set(),
        })
        .get(key)!;

    meet.starts += 1;
    meet.ids.add(result.swimmer_id);
    meet.swimmers = meet.ids.size;
    if (result.result_date < meet.firstDate) meet.firstDate = result.result_date;
  }

  return [...meets.values()]
    .map((meet) => ({ key: meet.key, location: meet.location, month: meet.month, pool: meet.pool, firstDate: meet.firstDate, starts: meet.starts, swimmers: meet.swimmers }))
    .sort((a, b) => b.firstDate.localeCompare(a.firstDate) || a.location.localeCompare(b.location));
}

export function evaluateMeet(
  meet: Meet,
  results: SwimmerResult[],
  swimmers: Swimmer[],
  standard: QualifyingStandard | null,
  standardTimes: QualifyingTime[]
): MeetStart[] {
  const swimmerById = new Map(swimmers.map((swimmer) => [swimmer.id, swimmer]));
  const starts: MeetStart[] = [];

  for (const result of results) {
    if (meetKey(result) !== meet.key) {
      continue;
    }

    const swimmer = swimmerById.get(result.swimmer_id);

    if (!swimmer) {
      continue;
    }

    const sameEvent = (other: SwimmerResult) =>
      other.swimmer_id === result.swimmer_id &&
      other.distance === result.distance &&
      other.stroke === result.stroke;

    /* "vorher" = alles vor dem Monat dieses Wettkampfs */
    const before = results.filter((other) => sameEvent(other) && other.result_date < `${meet.month}-01`);

    const previousBest =
      before
        .filter((other) => other.pool_length === result.pool_length)
        .sort((a, b) => a.time_ms - b.time_ms)[0] ?? null;

    const poolCounts = standard && (standard.count_both_pools || standard.pool_length === result.pool_length);
    const required = poolCounts ? findQualifyingTime(standardTimes, swimmer, result) : null;
    const inPeriod =
      !standard ||
      ((!standard.valid_from || result.result_date >= standard.valid_from) &&
        (!standard.valid_to || result.result_date <= standard.valid_to));
    const bestBefore = standard && required ? findBestForStandard(before, result, standard) : null;

    starts.push({
      result,
      swimmer,
      previousBest,
      previousDiff: previousBest ? result.time_ms - previousBest.time_ms : null,
      required,
      requiredDiff: required ? result.time_ms - required.time_ms : null,
      newlyQualified:
        Boolean(required) &&
        inPeriod &&
        result.time_ms <= required!.time_ms &&
        !(bestBefore && bestBefore.time_ms <= required!.time_ms),
    });
  }

  return starts;
}
