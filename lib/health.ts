/*
 * Gesundheit und Dokumente (reine Berechnung, ohne Datenbank).
 * Keine Diagnosen - nur was fuer Training und Organisation zaehlt.
 */

export type HealthKind = "verletzung" | "erkrankung" | "beschwerde" | "sonstiges";
export type Availability = "voll" | "eingeschraenkt" | "pause";
export type Clearance = "nicht_noetig" | "offen" | "erteilt";

export type HealthEvent = {
  id: string;
  swimmer_id: string;
  kind: HealthKind;
  title: string;
  body_region: string | null;
  availability: Availability;
  restriction: string | null;
  start_date: string;
  end_date: string | null;
  clearance: Clearance;
  note: string | null;
  visible_to_athlete: boolean;
};

export const HEALTH_KIND_LABELS: Record<HealthKind, string> = {
  verletzung: "Verletzung",
  erkrankung: "Erkrankung",
  beschwerde: "Beschwerde",
  sonstiges: "Sonstiges",
};

export const AVAILABILITY_LABELS: Record<Availability, string> = {
  voll: "voll trainingsfähig",
  eingeschraenkt: "eingeschränkt",
  pause: "Trainingspause",
};

export const CLEARANCE_LABELS: Record<Clearance, string> = {
  nicht_noetig: "keine Freigabe nötig",
  offen: "Freigabe ausstehend",
  erteilt: "freigegeben",
};

const DAY = 86_400_000;
const days = (from: string, to: string) => Math.round((Date.parse(to) - Date.parse(from)) / DAY);

/* Laufend = begonnen und (noch) nicht beendet */
export function isActive(event: HealthEvent, today: string) {
  return event.start_date <= today && (event.end_date === null || event.end_date >= today);
}

export function durationDays(event: HealthEvent, today: string) {
  return days(event.start_date, event.end_date && event.end_date < today ? event.end_date : today) + 1;
}

/*
 * Aktuelle Trainingsfaehigkeit aus allen laufenden Eintraegen:
 * die staerkste Einschraenkung zaehlt. Eine offene Freigabe haelt den
 * Athleten auch nach Ende des Eintrags auf "eingeschraenkt", bis der
 * Coach die Freigabe eintraegt.
 */
export function currentAvailability(events: HealthEvent[], today: string): Availability {
  const relevant = events.filter((event) => isActive(event, today) || event.clearance === "offen");
  if (relevant.some((event) => isActive(event, today) && event.availability === "pause")) return "pause";
  if (relevant.some((event) => event.availability !== "voll" || event.clearance === "offen")) return "eingeschraenkt";
  return "voll";
}

/*
 * Text fuer den Gesundheitsstatus. Bei Ladefehler oder fehlender
 * Tabelle NIE "voll trainingsfaehig" - der Status ist dann unbekannt.
 */
export function healthStatusLabel(
  state: { status: "loading" } | { status: "missing" } | { status: "error" } | { status: "ready"; data: HealthEvent[] },
  today: string
): { text: string; availability: Availability | null } {
  if (state.status === "loading") return { text: "wird geladen …", availability: null };
  if (state.status === "missing") return { text: "nicht eingerichtet", availability: null };
  if (state.status === "error") return { text: "Gesundheitsstatus konnte nicht geladen werden", availability: null };
  const availability = currentAvailability(state.data, today);
  return { text: AVAILABILITY_LABELS[availability], availability };
}

export type HealthFlag = { level: "rot" | "gelb"; text: string; reason: string; check: string };

export function healthFlags(events: HealthEvent[], today: string): HealthFlag[] {
  const flags: HealthFlag[] = [];
  for (const event of events) {
    const active = isActive(event, today);
    if (active && event.availability === "pause") {
      flags.push({
        level: "rot",
        text: `Trainingspause: ${event.title} (seit ${durationDays(event, today)} Tagen)`,
        reason: "Nimmt aktuell nicht am Training teil.",
        check: "Verlauf erfragen und Rückkehr ins Training planen.",
      });
    } else if (active && event.availability === "eingeschraenkt") {
      flags.push({
        level: "gelb",
        text: `Eingeschränkt: ${event.title}${event.restriction ? ` – ${event.restriction}` : ""}`,
        reason: "Trainingsinhalte müssen angepasst werden.",
        check: "Einschränkung bei der Planung der Einheit berücksichtigen.",
      });
    }
    if (event.clearance === "offen" && (!active || event.availability !== "pause")) {
      flags.push({
        level: "gelb",
        text: `Freigabe ausstehend: ${event.title}`,
        reason: "Rückkehr zum vollen Training erst nach Freigabe.",
        check: "Freigabe (z. B. ärztlich) einholen und eintragen.",
      });
    }
  }
  return flags;
}

export type DocType = "sportattest" | "einverstaendnis" | "startpass" | "sonstiges";

export type AthleteDocument = {
  id: string;
  swimmer_id: string;
  doc_type: DocType;
  title: string;
  valid_until: string | null;
  file_path: string | null;
  note: string | null;
  created_at: string;
};

export const DOC_TYPE_LABELS: Record<DocType, string> = {
  sportattest: "Sportattest",
  einverstaendnis: "Einverständnis",
  startpass: "Startpass",
  sonstiges: "Sonstiges",
};

export type DocStatus = "gueltig" | "laeuft_ab" | "abgelaufen" | "unbefristet";

/* Erinnerung 30 Tage vor Ablauf */
export const DOC_WARN_DAYS = 30;

export function documentStatus(doc: Pick<AthleteDocument, "valid_until">, today: string): { status: DocStatus; daysLeft: number | null } {
  if (!doc.valid_until) return { status: "unbefristet", daysLeft: null };
  const left = days(today, doc.valid_until);
  if (left < 0) return { status: "abgelaufen", daysLeft: left };
  if (left <= DOC_WARN_DAYS) return { status: "laeuft_ab", daysLeft: left };
  return { status: "gueltig", daysLeft: left };
}
