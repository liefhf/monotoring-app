/*
 * Staffeln: Typen, Wechselzeit-Bewertung und Aufstellungshelfer.
 * Reine Rechenfunktionen, getestet in relays.test.ts.
 */
import type { PoolLength, Stroke, Swimmer, SwimmerResult } from "@/lib/swim";
import { findBestResult } from "@/lib/swim";

export type RelayType = "freestyle" | "medley";
export type LegStroke = Exclude<Stroke, "medley">;

export type RelayLeg = {
  id?: string;
  relay_id?: string;
  leg_number: number;
  swimmer_id: string;
  stroke: LegStroke;
  split_ms: number | null;
  exchange_ms: number | null;
};

export type Relay = {
  id: string;
  competition_id: string;
  event_id: string | null;
  name: string | null;
  start_date: string;
  pool_length: PoolLength;
  relay_type: RelayType;
  leg_distance: number;
  leg_count: number;
  time_ms: number | null;
  status: "ok" | "dsq" | "dns" | "dnf";
  placement: number | null;
  points: number | null;
  rating_exchanges: number | null;
  went_well: string | null;
  to_improve: string | null;
  competition_relay_legs?: RelayLeg[];
};

export const RELAY_COLUMNS =
  "id, competition_id, event_id, name, start_date, pool_length, relay_type, leg_distance, leg_count, time_ms, status, placement, points, rating_exchanges, went_well, to_improve, competition_relay_legs(id, relay_id, leg_number, swimmer_id, stroke, split_ms, exchange_ms)";

/* Reihenfolge der Lagenstaffel: Ruecken, Brust, Schmetterling, Freistil */
export const MEDLEY_ORDER: LegStroke[] = ["backstroke", "breaststroke", "butterfly", "freestyle"];

export function legStrokes(type: RelayType, legCount: number): LegStroke[] {
  return type === "medley" ? MEDLEY_ORDER.slice(0, legCount) : Array.from({ length: legCount }, () => "freestyle");
}

export function relayLabel(relay: Pick<Relay, "leg_count" | "leg_distance" | "relay_type">) {
  return `${relay.leg_count}×${relay.leg_distance} m ${relay.relay_type === "medley" ? "Lagen" : "Freistil"}`;
}

/*
 * Wechselzeit (Reaktion beim Staffelwechsel) in ms.
 * Erlaubt ist ab -30 ms (FINA/DSV: -0,03 s), darunter droht
 * die Disqualifikation.
 */
export function exchangeVerdict(ms: number | null) {
  if (ms === null) return null;
  if (ms < -30) return { tone: "bad" as const, label: "Frühstart – DSQ-Gefahr" };
  if (ms < 0) return { tone: "warn" as const, label: "sehr riskant" };
  if (ms <= 150) return { tone: "good" as const, label: "sehr guter Wechsel" };
  if (ms <= 350) return { tone: "good" as const, label: "guter Wechsel" };
  if (ms <= 600) return { tone: "warn" as const, label: "Zeit verschenkt" };

  return { tone: "bad" as const, label: "zu langsam" };
}

export function formatExchange(ms: number) {
  const sign = ms > 0 ? "+" : ms < 0 ? "−" : "±";

  return `${sign}${(Math.abs(ms) / 1000).toFixed(2).replace(".", ",")}`;
}

/* Summe der Teilzeiten - zum Abgleich mit der Endzeit */
export function sumOfSplits(legs: RelayLeg[]) {
  if (legs.length === 0 || legs.some((leg) => !leg.split_ms)) return null;

  return legs.reduce((sum, leg) => sum + leg.split_ms!, 0);
}

/*
 * Aufstellungshelfer.
 * Freistil: die schnellsten Schwimmer nach Einzel-Bestzeit.
 * Lagen: die Kombination verschiedener Schwimmer mit der
 * kleinsten Summe der Bestzeiten (alle Zuordnungen durchprobiert).
 * Schwimmer ohne Bestzeit in einer Lage kommen dort nicht in Frage.
 */
export function suggestLineup(
  swimmers: Swimmer[],
  results: SwimmerResult[],
  type: RelayType,
  legDistance: number,
  poolLength: PoolLength,
  legCount = 4
) {
  const strokes = legStrokes(type, legCount);
  const bestOf = (swimmerId: string, stroke: LegStroke) =>
    findBestResult(
      results.filter((result) => result.swimmer_id === swimmerId),
      { distance: legDistance, stroke },
      poolLength
    )?.time_ms ?? null;

  if (type === "freestyle") {
    const ranked = swimmers
      .map((swimmer) => ({ swimmer, time: bestOf(swimmer.id, "freestyle") }))
      .filter((item): item is { swimmer: Swimmer; time: number } => item.time !== null)
      .sort((a, b) => a.time - b.time)
      .slice(0, legCount);

    if (ranked.length < legCount) return null;

    return {
      legs: ranked.map((item, index) => ({ swimmer: item.swimmer, stroke: "freestyle" as LegStroke, bestMs: item.time, leg: index + 1 })),
      totalMs: ranked.reduce((sum, item) => sum + item.time, 0),
    };
  }

  /* Lagen: pro Lage die Kandidaten (Top 8 genuegen fuer das Optimum in der Praxis) */
  const candidates = strokes.map((stroke) =>
    swimmers
      .map((swimmer) => ({ swimmer, time: bestOf(swimmer.id, stroke) }))
      .filter((item): item is { swimmer: Swimmer; time: number } => item.time !== null)
      .sort((a, b) => a.time - b.time)
      .slice(0, 8)
  );

  if (candidates.some((list) => list.length === 0)) return null;

  let best: { picks: { swimmer: Swimmer; time: number }[]; total: number } | null = null;

  function search(index: number, used: Set<string>, picks: { swimmer: Swimmer; time: number }[], total: number) {
    if (best && total >= best.total) return;

    if (index === strokes.length) {
      best = { picks: [...picks], total };
      return;
    }

    for (const candidate of candidates[index]) {
      if (used.has(candidate.swimmer.id)) continue;

      used.add(candidate.swimmer.id);
      picks.push(candidate);
      search(index + 1, used, picks, total + candidate.time);
      picks.pop();
      used.delete(candidate.swimmer.id);
    }
  }

  search(0, new Set(), [], 0);

  if (!best) return null;

  const found = best as { picks: { swimmer: Swimmer; time: number }[]; total: number };

  return {
    legs: found.picks.map((pick, index) => ({ swimmer: pick.swimmer, stroke: strokes[index], bestMs: pick.time, leg: index + 1 })),
    totalMs: found.total,
  };
}
