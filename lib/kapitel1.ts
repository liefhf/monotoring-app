/*
 * Kapitel 1 - Grundbegriffe
 *
 * Gemeinsame Listen und Berechnungen fuer:
 *   1.1 Belastung vs. Beanspruchung
 *   1.2 Kraeftigungs-Check
 *   1.3 Was dein Training bewirkt
 *   1.4 Kernziel-Tags
 *   1.5 Ueben vs. Training
 *   1.6 Entwicklungsverlauf (Akzeleration / Retardierung)
 *
 * Wer Begriffe oder Grenzwerte anpassen will, macht das nur hier.
 */

/* ------------------------------------------------------------------ */
/* 1.1 Belastung vs. Beanspruchung                                     */
/* ------------------------------------------------------------------ */

/*
 * Ab dieser Abweichung (gemeldete RPE minus geplante RPE)
 * wird eine Einheit markiert.
 */
export const LOAD_STRAIN_THRESHOLD = 2;

export type LoadStrainStatus =
  | "harder"
  | "easier"
  | "match"
  | "open";

export function getLoadStrainStatus(
  plannedRpe: number | null,
  reportedRpe: number | null
): LoadStrainStatus {
  if (
    plannedRpe === null ||
    reportedRpe === null
  ) {
    return "open";
  }

  const diff = reportedRpe - plannedRpe;

  if (diff >= LOAD_STRAIN_THRESHOLD) {
    return "harder";
  }

  if (diff <= -LOAD_STRAIN_THRESHOLD) {
    return "easier";
  }

  return "match";
}

export const LOAD_STRAIN_LABEL: Record<
  LoadStrainStatus,
  string
> = {
  harder: "härter als geplant",
  easier: "leichter als geplant",
  match: "wie geplant",
  open: "kein Vergleich",
};

export const LOAD_STRAIN_CLASS: Record<
  LoadStrainStatus,
  string
> = {
  harder:
    "border-app-bad/40 bg-app-bad/10 text-app-bad",
  easier:
    "border-app-warn/40 bg-app-warn/10 text-app-warn",
  match:
    "border-app-good/40 bg-app-good/10 text-app-good",
  open:
    "border-app-border bg-app-bg text-app-faint",
};

/*
 * Session-RPE nach Foster: RPE x Dauer in Minuten
 * = Trainingslast in Arbitrary Units (AU).
 */
export function sessionLoad(
  rpe: number | null,
  durationMinutes: number | null
) {
  if (
    rpe === null ||
    durationMinutes === null
  ) {
    return null;
  }

  return Math.round(rpe * durationMinutes);
}

/* ------------------------------------------------------------------ */
/* 1.2 Kraeftigungs-Check                                              */
/* ------------------------------------------------------------------ */

export const MIN_LAND_SESSIONS_PER_WEEK = 2;

/* ------------------------------------------------------------------ */
/* 1.4 Kernziel-Tags                                                   */
/* ------------------------------------------------------------------ */

export const CORE_GOALS = [
  {
    key: "kraft",
    label: "Kraft",
    hint: "Maximal- und Schnellkraft",
  },
  {
    key: "kraftausdauer",
    label: "Kraftausdauer",
    hint: "viele Wiederholungen, kurze Pausen",
  },
  {
    key: "rumpf",
    label: "Rumpfstabilität",
    hint: "Core, Wasserlage, Kraftübertragung",
  },
  {
    key: "beweglichkeit",
    label: "Beweglichkeit",
    hint: "Mobilität Schulter, Hüfte, Sprunggelenk",
  },
  {
    key: "koordination",
    label: "Koordination",
    hint: "Gleichgewicht, Rhythmus, Sprünge",
  },
  {
    key: "schulter",
    label: "Schulterprävention",
    hint: "Rotatorenmanschette, Schulterblatt",
  },
  {
    key: "ruecken_knie",
    label: "Rücken/Knie",
    hint: "Prävention Rücken und Knie (Brust)",
  },
  {
    key: "regeneration",
    label: "Regeneration",
    hint: "Faszien, Dehnen, Entspannung",
  },
] as const;

export type CoreGoalKey =
  (typeof CORE_GOALS)[number]["key"];

/* ------------------------------------------------------------------ */
/* 1.5 Ueben vs. Training                                              */
/* ------------------------------------------------------------------ */

export type PracticeMode = "ueben" | "training";

export const PRACTICE_MODE_LABEL: Record<
  PracticeMode,
  string
> = {
  ueben: "Üben",
  training: "Training",
};

export const PRACTICE_MODE_HINT: Record<
  PracticeMode,
  string
> = {
  ueben:
    "Bewegung lernen und verbessern – Qualität vor Belastung, ausgeruht, mit Pausen.",
  training:
    "Organismus gezielt belasten, um eine Anpassung auszulösen – Umfang und Intensität zählen.",
};

export const PRACTICE_MODE_CLASS: Record<
  PracticeMode,
  string
> = {
  ueben:
    "border-sky-700 bg-sky-950/60 text-sky-300",
  training:
    "border-app-sand/50 bg-app-sand/10 text-app-sand",
};

export function parsePracticeMode(
  value: string | null | undefined
): PracticeMode | null {
  return value === "ueben" ||
    value === "training"
    ? value
    : null;
}

/* ------------------------------------------------------------------ */
/* 1.3 Was dein Training bewirkt                                       */
/* ------------------------------------------------------------------ */

export type EffectCardKey =
  | "ga1"
  | "ga2"
  | "wa"
  | "sprint"
  | "technik"
  | "land"
  | "praevention"
  | "regeneration";

export const EFFECT_CARDS: {
  key: EffectCardKey;
  title: string;
  tag: string;
  text: string;
}[] = [
  {
    key: "ga1",
    title: "Grundlagenausdauer",
    tag: "BZ1–BZ3 · GA1",
    text: "Dein Herz pumpt mit jedem Schlag mehr Blut, die Muskeln bekommen mehr feine Blutgefäße und nutzen Fett besser als Energie. Du erholst dich schneller – auch zwischen harten Serien.",
  },
  {
    key: "ga2",
    title: "Tempo halten",
    tag: "BZ4–BZ5 · GA2",
    text: "Du trainierst an deiner Schwelle. Dein Körper lernt, Laktat schneller abzubauen – so kannst du ein höheres Tempo länger halten.",
  },
  {
    key: "wa",
    title: "Wettkampfhärte",
    tag: "BZ6–BZ7 · WA/SA",
    text: "Hohe Intensität nahe am Wettkampftempo. Du lernst, mit Übersäuerung umzugehen und am Ende eines Rennens noch Kraft zu haben.",
  },
  {
    key: "sprint",
    title: "Schnelligkeit",
    tag: "BZ8 · Sprint",
    text: "Kurz, maximal, mit langen Pausen. Nerven und Muskeln arbeiten schneller zusammen – für Start, Wende und Endspurt.",
  },
  {
    key: "technik",
    title: "Technik üben",
    tag: "Üben",
    text: "Hier geht es nicht ums Müdewerden, sondern ums Lernen. Saubere Wiederholungen speichern die Bewegung ab – erst richtig, dann schnell.",
  },
  {
    key: "land",
    title: "Kraft an Land",
    tag: "Landtraining",
    text: "Stärkere Muskeln geben dir mehr Abdruck und Stabilität im Wasser – und schützen Schulter, Rücken und Knie vor Überlastung.",
  },
  {
    key: "praevention",
    title: "Prävention",
    tag: "Mobilität & Stabilität",
    text: "Kleine Übungen mit großer Wirkung: Sie halten deine Gelenke beweglich und stabil, damit du ohne Verletzungspause durch die Saison kommst.",
  },
  {
    key: "regeneration",
    title: "Erholung",
    tag: "Anpassung",
    text: "Stärker wirst du nicht im Training, sondern in der Pause danach. Schlaf, Essen und lockere Einheiten gehören deshalb zum Plan.",
  },
];

/*
 * Ordnet eine Belastungszone aus dem Trainingseditor
 * (z. B. "BZ2 (GA1)") einer Infokarte zu.
 */
export function zoneToEffectCard(
  zone: string | null
): EffectCardKey | null {
  if (!zone) {
    return null;
  }

  const match = zone.match(/BZ\s*(\d)/i);

  if (!match) {
    return null;
  }

  const level = Number(match[1]);

  if (level <= 3) return "ga1";
  if (level <= 5) return "ga2";
  if (level <= 7) return "wa";

  return "sprint";
}

export function coreGoalToEffectCard(
  goal: string
): EffectCardKey | null {
  if (
    goal === "kraft" ||
    goal === "kraftausdauer" ||
    goal === "rumpf"
  ) {
    return "land";
  }

  if (
    goal === "beweglichkeit" ||
    goal === "koordination" ||
    goal === "schulter" ||
    goal === "ruecken_knie"
  ) {
    return "praevention";
  }

  if (goal === "regeneration") {
    return "regeneration";
  }

  return null;
}

/* ------------------------------------------------------------------ */
/* 1.6 Entwicklungsverlauf                                             */
/* ------------------------------------------------------------------ */

export type Sex = "male" | "female";

export function parseSex(
  value: string | null | undefined
): Sex | null {
  if (!value) {
    return null;
  }

  const normalized = value.trim().toLowerCase();

  if (
    ["male", "m", "männlich", "maennlich"].includes(
      normalized
    )
  ) {
    return "male";
  }

  if (
    ["female", "w", "f", "weiblich"].includes(
      normalized
    )
  ) {
    return "female";
  }

  return null;
}

/*
 * Mittleres Alter beim maximalen Wachstumsschub (APHV)
 * in Referenzpopulationen. Wer mehr als ein Jahr davon
 * abweicht, gilt als frueh bzw. spaet entwickelt.
 */
export const REFERENCE_APHV: Record<Sex, number> = {
  male: 13.8,
  female: 11.8,
};

export const MATURITY_TOLERANCE_YEARS = 1;

/* Grenze, ab der die Reifeschaetzung nicht mehr angezeigt wird. */
export const YOUTH_MAX_AGE = 18;

export function ageInYears(
  birthDate: string,
  atDate: string
) {
  const birth = new Date(`${birthDate}T12:00:00`);
  const at = new Date(`${atDate}T12:00:00`);

  return (
    (at.getTime() - birth.getTime()) /
    (365.25 * 24 * 60 * 60 * 1000)
  );
}

/*
 * Reifeabstand (Maturity Offset) nach Mirwald et al. 2002.
 * Ergebnis in Jahren: negativ = Wachstumsschub steht noch
 * bevor, positiv = liegt schon hinter dem Athleten.
 * Schaetzfehler ca. +/- 0,5-1 Jahr.
 */
export function maturityOffset({
  sex,
  age,
  heightCm,
  sittingHeightCm,
  weightKg,
}: {
  sex: Sex;
  age: number;
  heightCm: number;
  sittingHeightCm: number;
  weightKg: number;
}) {
  const legLength = heightCm - sittingHeightCm;
  const weightHeightRatio =
    (weightKg / heightCm) * 100;

  if (sex === "male") {
    return (
      -9.236 +
      0.0002708 * (legLength * sittingHeightCm) -
      0.001663 * (age * legLength) +
      0.007216 * (age * sittingHeightCm) +
      0.02292 * weightHeightRatio
    );
  }

  return (
    -9.376 +
    0.0001882 * (legLength * sittingHeightCm) +
    0.0022 * (age * legLength) +
    0.005841 * (age * sittingHeightCm) -
    0.002658 * (age * weightKg) +
    0.07693 * weightHeightRatio
  );
}

export type MaturityStatus =
  | "early"
  | "average"
  | "late";

export function getMaturityStatus(
  estimatedAphv: number,
  sex: Sex
): MaturityStatus {
  const diff = estimatedAphv - REFERENCE_APHV[sex];

  if (diff < -MATURITY_TOLERANCE_YEARS) {
    return "early";
  }

  if (diff > MATURITY_TOLERANCE_YEARS) {
    return "late";
  }

  return "average";
}

export const MATURITY_LABEL: Record<
  MaturityStatus,
  string
> = {
  early: "Hinweis auf Akzeleration (früh entwickelt)",
  average: "altersgemäße Entwicklung",
  late: "Hinweis auf Retardierung (spät entwickelt)",
};

export const MATURITY_ADVICE: Record<
  MaturityStatus,
  string
> = {
  early:
    "Leistungen können gerade durch den körperlichen Vorsprung entstehen. Vorsicht bei Auswahlentscheidungen – der Vorteil schrumpft oft, wenn Gleichaltrige aufholen.",
  average:
    "Biologisches und kalendarisches Alter passen etwa zusammen.",
  late:
    "Leistungsrückstand ist oft entwicklungsbedingt, nicht fehlendes Talent. Geduld – nicht vorschnell aussortieren, Technik und Koordination betonen.",
};

/*
 * Wachstumsgeschwindigkeit in cm pro Jahr, ab dieser
 * Schwelle deutet sie auf einen laufenden Wachstumsschub.
 */
export const GROWTH_SPURT_CM_PER_YEAR = 7;

/* Mindestabstand zweier Messungen fuer eine sinnvolle Rate. */
export const MIN_DAYS_BETWEEN_MEASUREMENTS = 60;

/* ------------------------------------------------------------------ */
/* Datum                                                               */
/* ------------------------------------------------------------------ */

export function toDateString(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export function startOfWeek(date: Date) {
  const copy = new Date(date);
  const day = (copy.getDay() + 6) % 7;

  copy.setHours(12, 0, 0, 0);
  copy.setDate(copy.getDate() - day);

  return copy;
}

export function formatDayMonth(dateString: string) {
  return new Date(
    `${dateString}T12:00:00`
  ).toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
  });
}
