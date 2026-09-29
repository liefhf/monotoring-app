/*
 * "Mein Wettkampf-Tag": Ernaehrungs- und Trinkplan aus den Startzeiten
 * und eine Standard-Vor-Start-Routine.
 *
 * Grundlage: Studienheft "Zielgruppenspezifische Ernaehrung" (Kap. 4.2
 * Ernaehrung rund um einen Ausdauerwettkampf, 6.4 Wettkampftage, 6.5
 * Regeneration) - allgemeine Empfehlungen, keine individuelle Beratung.
 */

export type PlanItem = { time: string; title: string; detail: string; kind: "essen" | "trinken" | "start" | "regeneration" };

const toMinutes = (time: string) => {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + (m || 0);
};
const toTime = (minutes: number) => {
  const m = ((minutes % 1440) + 1440) % 1440;
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
};

/* starts: Uhrzeiten "HH:MM" der eigenen Starts (sortiert oder unsortiert) */
export function nutritionPlan(starts: { time: string; label: string }[]): PlanItem[] {
  const sorted = starts.filter((start) => /^\d{1,2}:\d{2}$/.test(start.time)).sort((a, b) => toMinutes(a.time) - toMinutes(b.time));
  if (sorted.length === 0) return [];
  const first = toMinutes(sorted[0].time);
  const last = toMinutes(sorted[sorted.length - 1].time);

  const items: PlanItem[] = [
    {
      time: toTime(first - 210),
      title: "Hauptmahlzeit",
      detail: "Kohlenhydratreich, wenig Fett und Ballaststoffe, bekannte Lebensmittel (z. B. Nudeln, Reis, Brötchen mit Honig). Nichts Neues ausprobieren.",
      kind: "essen",
    },
    { time: toTime(first - 120), title: "Trinken", detail: "300–500 ml Wasser oder Saftschorle, danach regelmäßig kleine Schlucke.", kind: "trinken" },
    { time: toTime(first - 60), title: "Kleiner Snack", detail: "Leicht verdaulich, z. B. Banane, Reiswaffel, Müsliriegel.", kind: "essen" },
    { time: toTime(first - 30), title: "Letzte Schlucke", detail: "Nur noch wenig trinken, damit nichts drückt.", kind: "trinken" },
  ];

  sorted.forEach((start, index) => {
    items.push({ time: start.time, title: `Start: ${start.label}`, detail: "", kind: "start" });
    const next = sorted[index + 1];
    if (next) {
      const gap = toMinutes(next.time) - toMinutes(start.time);
      items.push(
        gap >= 90
          ? {
              time: toTime(toMinutes(start.time) + 20),
              title: "Zwischen den Starts",
              detail: "Ausschwimmen, 200–300 ml trinken und einen kleinen Kohlenhydrat-Snack (Banane, Reiswaffel, Traubenzucker in Maßen).",
              kind: "essen",
            }
          : {
              time: toTime(toMinutes(start.time) + 15),
              title: "Zwischen den Starts",
              detail: "Ausschwimmen und ein paar Schlucke trinken – für einen Snack ist die Pause zu kurz.",
              kind: "trinken",
            }
      );
    }
  });

  items.push({
    time: toTime(last + 30),
    title: "Regeneration",
    detail: "Innerhalb von 30–60 Minuten Kohlenhydrate mit Eiweiß (z. B. Brötchen mit Käse, Kakao, Joghurt) und etwa 500 ml trinken.",
    kind: "regeneration",
  });

  return items.sort((a, b) => toMinutes(a.time) - toMinutes(b.time));
}

/* Standard-Routine (Sportpsychologie: Rituale, Aktivationsregulation, Selbstgespraech) */
export const DEFAULT_ROUTINE = [
  "Tasche am Vorabend gepackt (2 Badehosen/Anzüge, 2 Brillen, Kappe, Handtuch, Trinkflasche, Snacks)",
  "Einschwimmen nach Plan",
  "Aufwärmen an Land (Mobilisation Schulter, Aktivierung)",
  "Rennen einmal im Kopf durchgehen (Start, Wenden, Anschlag)",
  "20 Minuten vorher: warm anziehen, Brille prüfen",
  "Im Vorstart: ruhig atmen (4 Sekunden ein, 6 aus)",
  "Mein Satz vor dem Start",
];
