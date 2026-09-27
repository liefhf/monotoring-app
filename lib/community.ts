/*
 * Gemeinsame Typen und Hilfsfunktionen fuer
 * Terminkalender, Terminanmeldung, News-Wall
 * und Gruppenraeume (Coach- und Athletenbereich).
 */

export type TeamOption = {
  id: string;
  name: string;
  is_coach: boolean;
};

export type EntryCategory =
  | "training"
  | "wettkampf"
  | "trainingslager"
  | "besprechung"
  | "sonstiges";

export type CalendarEntry = {
  id: string;
  coach_id: string;
  team_id: string | null;
  title: string;
  description: string | null;
  location: string | null;
  category: EntryCategory;
  visibility: "team" | "coach";
  starts_at: string;
  ends_at: string | null;
  all_day: boolean;
  registration_enabled: boolean;
  registration_deadline: string | null;
  max_participants: number | null;
  fee_note: string | null;
};

export const CALENDAR_COLUMNS =
  "id, coach_id, team_id, title, description, location, category, visibility, starts_at, ends_at, all_day, registration_enabled, registration_deadline, max_participants, fee_note";

export type NewsPost = {
  id: string;
  coach_id: string;
  team_id: string | null;
  title: string;
  body: string;
  pinned: boolean;
  created_at: string;
};

export type TeamMessage = {
  id: string;
  team_id: string;
  author_id: string;
  author_name: string | null;
  author_role: string | null;
  body: string;
  created_at: string;
};

export type TeamFile = {
  id: string;
  team_id: string;
  uploader_id: string;
  storage_path: string;
  file_name: string;
  size_bytes: number | null;
  created_at: string;
};

/*
 * Kategorien mit Farbe. Die Farben sind Klassen aus
 * dem Designsystem (globals.css), damit sie in hell
 * und dunkel funktionieren.
 */
export const CATEGORIES: {
  value: EntryCategory;
  label: string;
  dot: string;
  chip: string;
}[] = [
  { value: "training", label: "Training", dot: "bg-cat-training", chip: "bg-cat-training/15 text-cat-training" },
  { value: "wettkampf", label: "Wettkampf", dot: "bg-cat-competition", chip: "bg-cat-competition/15 text-cat-competition" },
  { value: "trainingslager", label: "Trainingslager", dot: "bg-cat-camp", chip: "bg-cat-camp/15 text-cat-camp" },
  { value: "besprechung", label: "Besprechung", dot: "bg-cat-meeting", chip: "bg-cat-meeting/15 text-cat-meeting" },
  { value: "sonstiges", label: "Sonstiges", dot: "bg-app-muted", chip: "bg-app-muted/15 text-app-muted" },
];

export function getCategory(value: EntryCategory) {
  return CATEGORIES.find((category) => category.value === value) ?? CATEGORIES[4];
}

export const WEEKDAYS = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];

export const MONTH_NAMES = [
  "Januar", "Februar", "März", "April", "Mai", "Juni",
  "Juli", "August", "September", "Oktober", "November", "Dezember",
];

/* Lokales Datum als "2026-09-27" */
export function toDateKey(date: Date) {
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");

  return `${date.getFullYear()}-${month}-${day}`;
}

/* Wochen eines Monats (Montag zuerst) als Datumsraster fuer die Monatsansicht */
export function getMonthGrid(year: number, month: number) {
  const first = new Date(year, month, 1);
  const offset = (first.getDay() + 6) % 7;
  const start = new Date(year, month, 1 - offset);
  const weeks: Date[][] = [];

  for (let week = 0; week < 6; week++) {
    const days: Date[] = [];

    for (let day = 0; day < 7; day++) {
      days.push(new Date(start.getFullYear(), start.getMonth(), start.getDate() + week * 7 + day));
    }

    /* Die sechste Woche nur, wenn sie noch Tage des Monats enthaelt */
    if (week < 5 || days[0].getMonth() === month) {
      weeks.push(days);
    }
  }

  return weeks;
}

/* Liegt der Termin (auch mehrtaegig) an diesem Tag? */
export function entryOnDay(entry: CalendarEntry, dayKey: string) {
  const startKey = toDateKey(new Date(entry.starts_at));
  const endKey = entry.ends_at ? toDateKey(new Date(entry.ends_at)) : startKey;

  return dayKey >= startKey && dayKey <= endKey;
}

export function formatTimeOfDay(iso: string) {
  return new Date(iso).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });
}

export function formatDay(iso: string) {
  return new Date(iso).toLocaleDateString("de-DE", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

/* "Sa, 04.10.2026 · 09:00–12:00" / mehrtaegig / ganztaegig */
export function formatEntryWhen(entry: CalendarEntry) {
  const start = new Date(entry.starts_at);
  const end = entry.ends_at ? new Date(entry.ends_at) : null;
  const sameDay = !end || toDateKey(start) === toDateKey(end);

  if (entry.all_day) {
    return sameDay ? formatDay(entry.starts_at) : `${formatDay(entry.starts_at)} – ${formatDay(entry.ends_at!)}`;
  }

  if (sameDay) {
    return `${formatDay(entry.starts_at)} · ${formatTimeOfDay(entry.starts_at)}${
      end ? `–${formatTimeOfDay(entry.ends_at!)}` : ""
    }`;
  }

  return `${formatDay(entry.starts_at)} ${formatTimeOfDay(entry.starts_at)} – ${formatDay(entry.ends_at!)} ${formatTimeOfDay(entry.ends_at!)}`;
}

/* "vor 5 Min.", "gestern", "12.09.2026" */
export function formatRelative(iso: string) {
  const date = new Date(iso);
  const diffMinutes = Math.round((Date.now() - date.getTime()) / 60000);

  if (diffMinutes < 1) return "gerade eben";
  if (diffMinutes < 60) return `vor ${diffMinutes} Min.`;

  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) return `vor ${diffHours} Std.`;

  const diffDays = Math.round(diffHours / 24);
  if (diffDays === 1) return "gestern";
  if (diffDays < 7) return `vor ${diffDays} Tagen`;

  return date.toLocaleDateString("de-DE");
}

export function formatFileSize(bytes: number | null) {
  if (bytes === null) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;

  return `${(bytes / 1024 / 1024).toFixed(1).replace(".", ",")} MB`;
}

export function isRegistrationOpen(entry: CalendarEntry) {
  if (!entry.registration_enabled) return false;
  if (new Date(entry.starts_at).getTime() < Date.now()) return false;
  if (entry.registration_deadline && new Date(entry.registration_deadline).getTime() < Date.now()) return false;

  return true;
}

/* "2026-09-27" + "18:30" -> ISO mit lokaler Zeitzone */
export function localToIso(date: string, time: string) {
  return new Date(`${date}T${time || "00:00"}:00`).toISOString();
}

/* ISO -> ["2026-09-27", "18:30"] in lokaler Zeit fuer Formularfelder */
export function isoToLocalParts(iso: string | null): [string, string] {
  if (!iso) return ["", ""];

  const date = new Date(iso);

  return [
    toDateKey(date),
    `${`${date.getHours()}`.padStart(2, "0")}:${`${date.getMinutes()}`.padStart(2, "0")}`,
  ];
}
