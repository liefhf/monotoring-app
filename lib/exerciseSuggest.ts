import { SuggestedRow, WeekFocus } from "@/lib/weekFocus";

/*
 * Uebungsvorschlaege aus einer freien Eingabe ("Sprint Kraul, Rückenwende, 90 min")
 * plus dem Wochenfokus (Disqualifikationen, Hauptteil A/B, Phase).
 * Regelbasiert, ohne KI: Stichwoerter -> Bausteine aus einer Uebungsbibliothek.
 */

type Topic =
  | "sprint"
  | "ausdauer"
  | "tempo"
  | "technik"
  | "wende"
  | "start"
  | "anschlag"
  | "beine"
  | "arme"
  | "locker"
  | "unterwasser";

type StrokeKey = "Kraul" | "Rücken" | "Brust" | "Schmetterling" | "Lagen";

const STROKE_WORDS: [RegExp, StrokeKey][] = [
  [/kraul|freistil|\bf\b|crawl/, "Kraul"],
  [/rücken|ruecken|\br\b/, "Rücken"],
  [/brust|\bb\b/, "Brust"],
  [/schmetterling|delfin|delphin|butterfly|\bs\b/, "Schmetterling"],
  [/lagen|\bl\b|medley/, "Lagen"],
];

const TOPIC_WORDS: [RegExp, Topic][] = [
  [/sprint|schnell|max|explosiv|antritt/, "sprint"],
  [/ausdauer|\bga\b|ga1|ga2|grundlage|umfang|kilometer/, "ausdauer"],
  [/tempo|renn|wettkampf|pace|laktat|härte|haerte/, "tempo"],
  [/technik|koordination|drill/, "technik"],
  [/wende|rolle/, "wende"],
  [/start|sprung|reaktion/, "start"],
  [/anschlag|zielanschlag/, "anschlag"],
  [/bein|kick/, "beine"],
  [/arm|zug|pull/, "arme"],
  [/locker|regeneration|erholung|kompensation|taper/, "locker"],
  [/unterwasser|delfinbein|tauch|gleit/, "unterwasser"],
];

export type SuggestionRow = SuggestedRow;

export type Suggestion = {
  topics: Topic[];
  strokes: StrokeKey[];
  minutes: number | null;
  rows: SuggestionRow[];
  notes: string[];
};

const row = (
  section: SuggestionRow["section"],
  repetitions: number,
  distance: number,
  exercise: string,
  style: string,
  zone: string,
  intervalTime: string,
  intervalType: "P" | "@" = "P"
): SuggestionRow => ({ section, repetitions, distance, exercise, style, zone, intervalType, intervalTime });

function mainRows(topic: Topic, style: string, label: string): SuggestionRow[] {
  switch (topic) {
    case "sprint":
      return [
        row("hauptblock", 8, 25, `${label}: max. Sprint, volle Erholung`, style, "BZ8 (S)", "60"),
        row("hauptblock", 4, 15, `${label}: aus dem Wasser antreten, 15 m explosiv`, style, "BZ8 (S)", "45"),
        row("hauptblock", 4, 50, `${label}: 12,5 m max + locker ausschwimmen`, style, "BZ5 (GA2)", "40"),
      ];
    case "ausdauer":
      return [
        row("hauptblock", 8, 100, `${label}: gleichmäßig, Zugzahl konstant`, style, "BZ3 (GA1)", "20"),
        row("hauptblock", 4, 200, `${label}: 1–4 steigern (GA1 → GA2)`, style, "BZ4 (GA2)", "30"),
      ];
    case "tempo":
      return [
        row("hauptblock", 6, 50, `${label}: Renntempo, Wende scharf`, style, "BZ6 (WA)", "60"),
        row("hauptblock", 3, 100, `${label}: 2. Hälfte schneller (negativ splitten)`, style, "BZ4 (GA2)", "30"),
        row("hauptblock", 4, 50, `${label}: Broken – 25 m Renntempo, 10 s Pause, 25 m`, style, "BZ6 (WA)", "60"),
      ];
    case "beine":
      return [
        row("hauptblock", 8, 50, `${label} Beine mit Brett, 25 m schnell / 25 m locker`, "Beine", "BZ4 (GA2)", "20"),
        row("hauptblock", 4, 100, `${label} Beine ohne Brett in Seitlage`, "Beine", "BZ3 (GA1)", "20"),
      ];
    case "arme":
      return [
        row("hauptblock", 6, 100, `${label} Arme mit Pullbuoy + Paddles, langer Zug`, "Arme", "BZ3 (GA1)", "20"),
        row("hauptblock", 4, 50, `${label} Arme mit Pullbuoy, kräftig durchziehen`, "Arme", "BZ4 (GA2)", "20"),
      ];
    case "locker":
      return [row("hauptblock", 4, 100, `${label} locker, Technik sauber halten`, style, "BZ2 (GA1)", "15")];
    default:
      return [];
  }
}

/* Technikuebungen je Lage (je 25 m gedacht, auf der 50m-Bahn werden daraus 50er) */
const DRILLS: Record<Exclude<StrokeKey, "Lagen">, string[]> = {
  Kraul: [
    "Kraul Abschlagschwimmen, Hand vorne kurz halten",
    "Kraul Einarm (anderer Arm vorne), Atmung zur Zugarmseite",
    "Kraul Reißverschluss: Daumen an der Körperseite hochziehen",
    "Kraul 6-Beinschläge – 1 Zug (Seitlage, Rotation)",
    "Kraul Faustschwimmen, dann offene Hand",
  ],
  Rücken: [
    "Rücken Einarm, Schulter führt aus dem Wasser",
    "Rücken Doppelarm, Hüfte hoch halten",
    "Rücken 6 Beine Seitlage – 3 Züge (Rotation)",
    "Rücken mit Becher/Brett auf der Stirn, Kopf ruhig",
  ],
  Brust: [
    "Brust 2 Beinschläge – 1 Zug, lange Gleitphase",
    "Brust Beine in Rückenlage, Knie bleiben unter Wasser",
    "Brust Arme mit Kraulbeinen, Zug schnell nach vorn schieben",
    "Brust Zugzahl zählen, pro Bahn 1 Zug weniger",
  ],
  Schmetterling: [
    "Schmetterling Einarm (anderer Arm vorne), 2 Beinschläge pro Zug",
    "Schmetterling 3 Züge Rechts – 3 Links – 3 Ganz",
    "Delfinbeine in Rückenlage, Bewegung aus der Hüfte",
    "Schmetterling ganze Lage 12,5 m sauber, Rest locker Kraul",
  ],
};

function techniqueRows(topic: Topic, style: string, label: string): SuggestionRow[] {
  switch (topic) {
    case "technik": {
      if (style === "Lagen") {
        return (["Schmetterling", "Rücken", "Brust", "Kraul"] as const).map((stroke) =>
          row("technik", 2, 25, `${DRILLS[stroke][0]} / ${DRILLS[stroke][1]}`, stroke, "BZ1 (Rekom)", "15")
        ).concat([row("technik", 4, 100, "Lagen-Übergänge: Wechsel S→R, R→B, B→F sauber, ohne Stopp", "Lagen", "BZ2 (GA1)", "20")]);
      }
      const drills = DRILLS[style as keyof typeof DRILLS] ?? DRILLS.Kraul;
      return [
        ...drills.slice(0, 3).map((drill) => row("technik", 4, 25, drill, style, "BZ1 (Rekom)", "15")),
        row("technik", 4, 50, `${label} Zugzahl reduzieren (−2 pro Bahn)`, style, "BZ2 (GA1)", "20"),
      ];
    }
    case "wende":
      return style === "Rücken"
        ? [row("technik", 8, 25, "Rückenwende: Drehen in Bauchlage, letzter Armzug, sofort Rolle – kein Gleiten", "Rücken", "BZ1 (Rekom)", "20")]
        : style === "Brust" || style === "Schmetterling"
          ? [row("technik", 8, 25, `${label}-Wende: beidhändiger gleichzeitiger Anschlag, schnell abdrehen`, style, "BZ1 (Rekom)", "20")]
          : [row("technik", 8, 25, `${label}-Wende: schnell anschwimmen, kompakte Rolle, 3 Delfinbeine raus`, style, "BZ2 (GA1)", "20")];
    case "start":
      return [row("technik", 6, 15, `${label}-Start vom Block: Reaktion, Eintauchen, Übergang`, style, "BZ8 (S)", "45")];
    case "anschlag":
      return [row("technik", 4, 25, `${label}: Zielanschlag – Zugrhythmus anpassen, nicht gleiten`, style, "BZ6 (WA)", "30")];
    case "unterwasser":
      return [row("technik", 6, 25, "Unterwasser-Delfinbeine: 10–15 m, dann ruhig ausschwimmen", "Beine", "BZ4 (GA2)", "30")];
    default:
      return [];
  }
}

export function suggestExercises(input: string, week: WeekFocus | null, poolLength: 25 | 50 = 25): Suggestion {
  const text = input.toLowerCase();
  const topics = TOPIC_WORDS.filter(([pattern]) => pattern.test(text)).map(([, topic]) => topic);
  const strokes = STROKE_WORDS.filter(([pattern]) => pattern.test(text)).map(([, stroke]) => stroke);
  const minutesMatch = text.match(/(\d{2,3})\s*(min|minuten)/);
  const minutes = minutesMatch ? Number(minutesMatch[1]) : null;
  const notes: string[] = [];

  const rows: SuggestionRow[] = [
    row("einschwimmen", 1, 600, "Einschwimmen ganze Lage beliebig", "Beliebig", "BZ2 (GA1)", ""),
    row("einschwimmen", 1, 200, "Beine Kraul mit Brett", "Beine", "BZ4 (GA2)", ""),
  ];
  const strokeList: StrokeKey[] = strokes.length ? strokes : ["Kraul"];

  /* Wochenfokus: Technik aus Disqualifikationen gehoert immer dazu */
  for (const item of week?.technique ?? []) {
    if (item.title.startsWith("Rücken") && !(topics.includes("wende") && strokeList.includes("Rücken"))) {
      rows.push(...techniqueRows("wende", "Rücken", "Rücken").map((entry) => ({ ...entry, exercise: `${entry.exercise} (${item.athletes.join(", ")})` })));
      notes.push(`Aus dem Wochenfokus ergänzt: ${item.title} (${item.athletes.join(", ")})`);
    }
  }

  /* Regelrelevante Fehler aus dem letzten Wettkampf gehoeren immer dazu */
  for (const block of week?.blocks ?? []) {
    if (block.id.startsWith("fehler-") && block.title.startsWith("⚠")) {
      rows.push(...block.rows);
      notes.push(`Aus dem Wettkampf ergänzt: ${block.title.replace("⚠ Aus dem Wettkampf: ", "")} (${block.why})`);
    }
  }

  const technique = topics.filter((topic) => ["technik", "wende", "start", "anschlag", "unterwasser"].includes(topic));
  const main = topics.filter((topic) => ["sprint", "ausdauer", "tempo", "beine", "arme", "locker"].includes(topic));

  for (const topic of technique) {
    for (const stroke of topic === "unterwasser" ? [strokeList[0]] : strokeList) rows.push(...techniqueRows(topic, stroke, stroke));
  }

  /* Hauptteil: ohne Stichwort nach Phase des Wochenfokus */
  const phaseMain: Topic = week?.phase === "taper" ? "locker" : week?.phase === "vorbereitung" ? "tempo" : "ausdauer";
  const mainTopics = main.length ? main : [phaseMain];
  if (!main.length) notes.push(`Kein Hauptteil-Stichwort erkannt – nach Phase „${week?.phase ?? "offen"}“ gewählt.`);

  for (const topic of mainTopics) {
    if (strokes.length) {
      for (const stroke of strokeList) rows.push(...mainRows(topic, stroke, stroke));
    } else if (week && (week.mainA.length || week.mainB.length)) {
      /* Keine Lage genannt: Hauptteil A in Hauptlage, B in Nebenlage */
      const lanes = (groups: typeof week.mainA) => groups.map((group) => `${group.label}: ${group.athletes.join(", ")}`).join(" · ");
      rows.push(...mainRows(topic, "Beliebig", `Hauptteil A Hauptlage (${lanes(week.mainA)})`));
      if (week.mainB.length) rows.push(...mainRows(topic, "Beliebig", `Hauptteil B Nebenlage (${lanes(week.mainB)})`).slice(0, 1));
    } else {
      rows.push(...mainRows(topic, "Kraul", "Kraul"));
    }
  }

  /* Pflichtzeiten in Reichweite: knappe 50er bekommen einen Sprintreiz */
  const close50 = (week?.targets ?? []).filter((target) => target.event.distance <= 50);
  if (close50.length && !mainTopics.includes("sprint") && week?.phase !== "aufbau") {
    const names = [...new Set(close50.flatMap((target) => target.athletes.map((athlete) => athlete.name)))];
    rows.push(row("hauptblock", 4, 25, `Start + 15 m max – knapp an der Pflichtzeit: ${names.join(", ")}`, "Beliebig", "BZ8 (S)", "60"));
    notes.push("Ergänzt wegen Pflichtzeit in Reichweite (50 m).");
  }

  rows.push(row("ausschwimmen", 1, 200, "Ausschwimmen locker", "Beliebig", "BZ1 (Rekom)", ""));

  /* Grob an die Dauer anpassen: Hauptblock-Wiederholungen skalieren */
  if (minutes) {
    const meters = rows.reduce((sum, entry) => sum + entry.repetitions * entry.distance, 0);
    const target = minutes * 40; // ca. 40 m pro Minute inkl. Pausen
    const factor = Math.max(0.5, Math.min(2, target / Math.max(meters, 1)));
    for (const entry of rows) {
      if (entry.section === "hauptblock") entry.repetitions = Math.max(2, Math.round(entry.repetitions * factor));
    }
    notes.push(`Umfang grob auf ${minutes} min angepasst (ca. ${Math.round(target / 100) / 10} km).`);
  }

  if (poolLength === 50) notes.push("An die 50m-Bahn angepasst: 25er werden zu 50ern, Wenden-Übungen ab Bahnmitte.");
  return { topics, strokes, minutes, rows: fitPool(rows, poolLength), notes };
}

/*
 * Bahnlaenge: auf der 50m-Bahn gehen 25er nicht auf. Wenden/Anschlag ab
 * Bahnmitte (25 m bleiben), sonst 50er mit halb so vielen Wiederholungen.
 * 15er (Starts, Antritte) bleiben.
 */
export function fitPool(rows: SuggestionRow[], poolLength: 25 | 50): SuggestionRow[] {
  if (poolLength === 25) return rows;
  return rows.map((entry) => {
    if (entry.distance !== 25) return entry;
    if (/wende|anschlag/i.test(entry.exercise)) return { ...entry, exercise: `ab Bahnmitte: ${entry.exercise}` };
    return { ...entry, distance: 50, repetitions: Math.max(2, Math.ceil(entry.repetitions / 2)) };
  });
}
