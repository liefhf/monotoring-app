import { describe, expect, it } from "vitest";
import type { Swimmer, SwimmerResult } from "@/lib/swim";
import { exchangeVerdict, formatExchange, legStrokes, relayLabel, suggestLineup, sumOfSplits } from "@/lib/relays";

const swimmer = (id: string): Swimmer => ({ id, first_name: id, last_name: null, birth_year: 2010, gender: "male" });

const best = (swimmerId: string, stroke: SwimmerResult["stroke"], ms: number): SwimmerResult => ({
  id: `${swimmerId}-${stroke}`,
  swimmer_id: swimmerId,
  result_date: "2026-05-01",
  location: null,
  pool_length: 50,
  distance: 100,
  stroke,
  time_ms: ms,
  points: null,
  round: null,
  is_split: false,
});

describe("Wechselzeiten", () => {
  it("bewertet die Reaktion beim Wechsel", () => {
    expect(exchangeVerdict(-50)?.tone).toBe("bad");
    expect(exchangeVerdict(-20)?.tone).toBe("warn");
    expect(exchangeVerdict(120)?.label).toBe("sehr guter Wechsel");
    expect(exchangeVerdict(300)?.label).toBe("guter Wechsel");
    expect(exchangeVerdict(500)?.tone).toBe("warn");
    expect(exchangeVerdict(900)?.tone).toBe("bad");
    expect(exchangeVerdict(null)).toBeNull();
  });

  it("formatiert Wechselzeiten in Sekunden", () => {
    expect(formatExchange(250)).toBe("+0,25");
    expect(formatExchange(-30)).toBe("−0,03");
  });
});

describe("Staffel-Grunddaten", () => {
  it("kennt die Lagenreihenfolge", () => {
    expect(legStrokes("medley", 4)).toEqual(["backstroke", "breaststroke", "butterfly", "freestyle"]);
    expect(legStrokes("freestyle", 3)).toEqual(["freestyle", "freestyle", "freestyle"]);
  });

  it("beschriftet Staffeln", () => {
    expect(relayLabel({ leg_count: 4, leg_distance: 100, relay_type: "medley" })).toBe("4×100 m Lagen");
  });

  it("summiert Teilzeiten nur wenn alle da sind", () => {
    expect(sumOfSplits([{ leg_number: 1, swimmer_id: "a", stroke: "freestyle", split_ms: 60000, exchange_ms: null }, { leg_number: 2, swimmer_id: "b", stroke: "freestyle", split_ms: 61000, exchange_ms: 200 }])).toBe(121000);
    expect(sumOfSplits([{ leg_number: 1, swimmer_id: "a", stroke: "freestyle", split_ms: null, exchange_ms: null }])).toBeNull();
  });
});

describe("suggestLineup", () => {
  const swimmers = ["A", "B", "C", "D", "E"].map(swimmer);

  it("nimmt fuer Freistil die vier schnellsten", () => {
    const results = [best("A", "freestyle", 60000), best("B", "freestyle", 58000), best("C", "freestyle", 62000), best("D", "freestyle", 59000), best("E", "freestyle", 65000)];
    const lineup = suggestLineup(swimmers, results, "freestyle", 100, 50)!;
    expect(lineup.legs.map((leg) => leg.swimmer.id)).toEqual(["B", "D", "A", "C"]);
    expect(lineup.totalMs).toBe(239000);
  });

  it("findet fuer Lagen die beste Verteilung statt jeweils den Schnellsten", () => {
    // A ist in Ruecken UND Schmetterling am schnellsten - darf aber nur einmal schwimmen.
    const results = [
      best("A", "backstroke", 65000), best("A", "butterfly", 60000),
      best("B", "backstroke", 66000),
      best("C", "breaststroke", 72000),
      best("D", "butterfly", 64000), best("D", "freestyle", 58000),
      best("E", "freestyle", 59000),
    ];
    const lineup = suggestLineup(swimmers, results, "medley", 100, 50)!;
    // Naiv (A Ruecken, D Schmetterling, E Freistil) = 260 s.
    // Optimum: B Ruecken 66, C Brust 72, A Schmetterling 60, D Freistil 58 = 256 s
    expect(lineup.legs.map((leg) => `${leg.swimmer.id}:${leg.stroke}`)).toEqual(["B:backstroke", "C:breaststroke", "A:butterfly", "D:freestyle"]);
    expect(lineup.totalMs).toBe(256000);
  });

  it("gibt null, wenn nicht genug Schwimmer Zeiten haben", () => {
    expect(suggestLineup(swimmers, [best("A", "freestyle", 60000)], "freestyle", 100, 50)).toBeNull();
    expect(suggestLineup(swimmers, [best("A", "backstroke", 60000)], "medley", 100, 50)).toBeNull();
  });
});
