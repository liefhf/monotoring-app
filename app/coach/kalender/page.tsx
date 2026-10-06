"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import {
  CALENDAR_COLUMNS,
  CATEGORIES,
  CalendarEntry,
  DeadlineTask,
  EntryCategory,
  TeamOption,
  formatDay,
  formatEntryWhen,
  getCategory,
  isoToLocalParts,
  localToIso,
  taskToEntry,
} from "@/lib/community";
import CalendarView from "@/components/CalendarView";
import { Icon } from "@/components/icons";
import {
  FormField,
  Modal,
  Notice,
  PageHeader,
  RichText,
  buttonGhost,
  buttonPrimary,
  buttonSecondary,
  inputClass,
} from "@/components/ui";

/*
 * Terminkalender des Coaches.
 * - "Team-Kalender": Termine, die Athleten sehen
 * - "Trainerkalender": Termine nur fuer Trainer
 * Mit optionaler Terminanmeldung fuer Athleten.
 */

type ViewFilter = "all" | "team" | "coach";

type Draft = {
  id: string | null;
  title: string;
  category: EntryCategory;
  teamId: string;
  visibility: "team" | "coach";
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
  allDay: boolean;
  location: string;
  description: string;
  registrationEnabled: boolean;
  deadlineDate: string;
  deadlineTime: string;
  maxParticipants: string;
  feeNote: string;
};

type Registration = {
  athlete_id: string;
  first_name: string | null;
  last_name: string | null;
  note: string | null;
  created_at: string;
};

function emptyDraft(dayKey?: string): Draft {
  const date = dayKey ?? isoToLocalParts(new Date().toISOString())[0];

  return {
    id: null,
    title: "",
    category: "training",
    teamId: "",
    visibility: "team",
    startDate: date,
    startTime: "17:00",
    endDate: date,
    endTime: "19:00",
    allDay: false,
    location: "",
    description: "",
    registrationEnabled: false,
    deadlineDate: "",
    deadlineTime: "23:59",
    maxParticipants: "",
    feeNote: "",
  };
}

function entryToDraft(entry: CalendarEntry): Draft {
  const [startDate, startTime] = isoToLocalParts(entry.starts_at);
  const [endDate, endTime] = isoToLocalParts(entry.ends_at);
  const [deadlineDate, deadlineTime] = isoToLocalParts(entry.registration_deadline);

  return {
    id: entry.id,
    title: entry.title,
    category: entry.category,
    teamId: entry.team_id ?? "",
    visibility: entry.visibility,
    startDate,
    startTime,
    endDate: endDate || startDate,
    endTime: endTime || startTime,
    allDay: entry.all_day,
    location: entry.location ?? "",
    description: entry.description ?? "",
    registrationEnabled: entry.registration_enabled,
    deadlineDate,
    deadlineTime: deadlineTime || "23:59",
    maxParticipants: entry.max_participants ? `${entry.max_participants}` : "",
    feeNote: entry.fee_note ?? "",
  };
}

export default function CoachKalenderPage() {
  const [entries, setEntries] = useState<CalendarEntry[]>([]);
  const [tasks, setTasks] = useState<CalendarEntry[]>([]);
  const [teams, setTeams] = useState<TeamOption[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ tone: "good" | "bad"; text: string } | null>(null);

  const [view, setView] = useState<ViewFilter>("all");
  const [teamFilter, setTeamFilter] = useState("");

  const [draft, setDraft] = useState<Draft | null>(null);
  const [saving, setSaving] = useState(false);
  const [selected, setSelected] = useState<CalendarEntry | null>(null);
  const [registrations, setRegistrations] = useState<Registration[]>([]);

  const loadData = useCallback(async () => {
    const [entryResponse, teamResponse] = await Promise.all([
      supabase.from("calendar_entries").select(CALENDAR_COLUMNS).order("starts_at"),
      supabase.rpc("my_teams"),
    ]);

    if (entryResponse.error) {
      setMessage({
        tone: "bad",
        text: entryResponse.error.message.includes("calendar_entries")
          ? "Der Kalender ist noch nicht eingerichtet. Bitte führe supabase/termine_news_gruppen.sql im Supabase SQL-Editor aus."
          : `Termine konnten nicht geladen werden: ${entryResponse.error.message}`,
      });
      setLoading(false);
      return;
    }

    const loaded = (entryResponse.data ?? []) as CalendarEntry[];
    setEntries(loaded);
    setTeams(((teamResponse.data ?? []) as TeamOption[]).filter((team) => team.is_coach));

    /* Fristen aus der Saisonplanung mit anzeigen (nur Trainer) */
    const { data: userData } = await supabase.auth.getUser();
    const { data: taskData } = await supabase
      .from("calendar_tasks")
      .select("id, team_id, title, due_date, completed, description")
      .order("due_date");

    setTasks(((taskData ?? []) as DeadlineTask[]).map((task) => taskToEntry(task, userData.user?.id ?? "")));

    const withRegistration = loaded.filter((entry) => entry.registration_enabled).map((entry) => entry.id);

    if (withRegistration.length > 0) {
      const { data } = await supabase.rpc("entry_registration_counts", { p_entry_ids: withRegistration });
      const next: Record<string, number> = {};

      for (const row of (data ?? []) as { entry_id: string; registered: number }[]) {
        next[row.entry_id] = row.registered;
      }

      setCounts(next);
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Daten beim Oeffnen laden
    loadData();
  }, [loadData]);

  const teamName = useCallback(
    (teamId: string | null) =>
      teamId ? teams.find((team) => team.id === teamId)?.name ?? "Team" : "Alle Teams",
    [teams]
  );

  const visibleEntries = useMemo(
    () =>
      [...entries, ...tasks].filter(
        (entry) =>
          (view === "all" || entry.visibility === view) &&
          (!teamFilter || entry.team_id === teamFilter || entry.team_id === null)
      ),
    [entries, tasks, view, teamFilter]
  );

  async function openEntry(entry: CalendarEntry) {
    setSelected(entry);
    setRegistrations([]);

    if (entry.category === "frist") return;

    if (entry.registration_enabled) {
      const { data } = await supabase.rpc("entry_registrations_for_coach", { p_entry_id: entry.id });
      setRegistrations((data ?? []) as Registration[]);
    }
  }

  function updateDraft<K extends keyof Draft>(key: K, value: Draft[K]) {
    setDraft((current) => {
      if (!current) return current;

      const next = { ...current, [key]: value };

      /* Endet vor dem Start? Dann Ende mitziehen. */
      if (key === "startDate" && next.endDate < next.startDate) {
        next.endDate = next.startDate;
      }

      /* Trainerkalender-Termine haben keine Anmeldung */
      if (key === "visibility" && value === "coach") {
        next.registrationEnabled = false;
      }

      return next;
    });
  }

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!draft) return;

    const startsAt = localToIso(draft.startDate, draft.allDay ? "00:00" : draft.startTime);
    const endsAt = draft.endDate
      ? localToIso(draft.endDate, draft.allDay ? "23:59" : draft.endTime)
      : null;

    if (endsAt && endsAt < startsAt) {
      setMessage({ tone: "bad", text: "Das Ende liegt vor dem Beginn." });
      return;
    }

    const max = draft.maxParticipants.trim() ? Number(draft.maxParticipants) : null;

    if (max !== null && (!Number.isInteger(max) || max < 1)) {
      setMessage({ tone: "bad", text: "Die Höchstzahl muss eine ganze Zahl ab 1 sein." });
      return;
    }

    const payload = {
      title: draft.title.trim(),
      category: draft.category,
      team_id: draft.teamId || null,
      visibility: draft.visibility,
      starts_at: startsAt,
      ends_at: endsAt,
      all_day: draft.allDay,
      location: draft.location.trim() || null,
      description: draft.description.trim() || null,
      registration_enabled: draft.registrationEnabled,
      registration_deadline:
        draft.registrationEnabled && draft.deadlineDate
          ? localToIso(draft.deadlineDate, draft.deadlineTime)
          : null,
      max_participants: draft.registrationEnabled ? max : null,
      fee_note: draft.registrationEnabled ? draft.feeNote.trim() || null : null,
    };

    setSaving(true);

    const { error } = draft.id
      ? await supabase.from("calendar_entries").update(payload).eq("id", draft.id)
      : await supabase.from("calendar_entries").insert(payload);

    setSaving(false);

    if (error) {
      setMessage({ tone: "bad", text: `Termin konnte nicht gespeichert werden: ${error.message}` });
      return;
    }

    setMessage({ tone: "good", text: draft.id ? "Termin geändert ✅" : "Termin angelegt ✅" });
    setDraft(null);
    setSelected(null);
    await loadData();
  }

  async function handleDelete(entry: CalendarEntry) {
    if (!window.confirm(`„${entry.title}“ wirklich löschen? Anmeldungen werden ebenfalls gelöscht.`)) {
      return;
    }

    const { error } = await supabase.from("calendar_entries").delete().eq("id", entry.id);

    if (error) {
      setMessage({ tone: "bad", text: `Termin konnte nicht gelöscht werden: ${error.message}` });
      return;
    }

    setSelected(null);
    setMessage({ tone: "good", text: "Termin gelöscht." });
    await loadData();
  }

  const viewOptions: { value: ViewFilter; label: string }[] = [
    { value: "all", label: "Alle" },
    { value: "team", label: "Team-Kalender" },
    { value: "coach", label: "Trainerkalender" },
  ];

  return (
    <main className="mx-auto max-w-7xl space-y-6">
      <PageHeader
        icon="calendar"
        title="Kalender"
        description="Team-Termine sehen deine Athleten, Termine im Trainerkalender nur du. Mit Anmeldung können sich Athleten selbst eintragen."
        actions={
          <button type="button" onClick={() => setDraft(emptyDraft())} className={buttonPrimary}>
            <Icon name="plus" className="h-4 w-4" />
            Termin
          </button>
        }
      />

      {message && <Notice tone={message.tone}>{message.text}</Notice>}

      <div className="flex flex-wrap items-center gap-3">
        <div className="inline-flex rounded-xl border border-app-border bg-app-surface p-1">
          {viewOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setView(option.value)}
              className={`rounded-lg px-3 py-1.5 text-sm transition ${
                view === option.value
                  ? "bg-app-accent font-semibold text-app-accent-ink"
                  : "text-app-text hover:bg-app-elevated"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>

        {teams.length > 1 && (
          <select
            value={teamFilter}
            onChange={(event) => setTeamFilter(event.target.value)}
            aria-label="Team filtern"
            className={`${inputClass} w-auto py-2`}
          >
            <option value="">Alle Teams</option>
            {teams.map((team) => (
              <option key={team.id} value={team.id}>
                {team.name}
              </option>
            ))}
          </select>
        )}

        <div className="flex flex-wrap gap-3 text-xs text-app-muted">
          {CATEGORIES.map((category) => (
            <span key={category.value} className="inline-flex items-center gap-1.5">
              <span className={`h-2 w-2 rounded-full ${category.dot}`} />
              {category.label}
            </span>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="rounded-[20px] border border-app-border bg-app-surface shadow-app p-10 text-center text-app-muted">
          Kalender wird geladen...
        </div>
      ) : (
        <CalendarView
          entries={visibleEntries}
          onSelectEntry={openEntry}
          onSelectDay={(dayKey) => setDraft(emptyDraft(dayKey))}
          teamName={teamName}
          registrationCounts={counts}
        />
      )}

      {/* Termin ansehen */}
      <Modal open={Boolean(selected)} title={selected?.title ?? ""} onClose={() => setSelected(null)}>
        {selected && (
          <div className="space-y-5">
            <div className="flex flex-wrap gap-2">
              <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${getCategory(selected.category).chip}`}>
                {getCategory(selected.category).label}
              </span>
              <span className="rounded-full bg-app-elevated px-2.5 py-1 text-xs font-medium text-app-muted">
                {selected.visibility === "coach" ? "Trainerkalender – nur für Trainer" : "Team-Kalender – Athleten sehen den Termin"}
              </span>
            </div>

            <dl className="grid gap-3 text-sm sm:grid-cols-[110px_1fr]">
              <dt className="text-app-muted">Wann</dt>
              <dd className="font-medium text-app-heading">{formatEntryWhen(selected)}</dd>
              <dt className="text-app-muted">Für</dt>
              <dd className="text-app-heading">{teamName(selected.team_id)}</dd>
              {selected.location && (
                <>
                  <dt className="text-app-muted">Ort</dt>
                  <dd className="text-app-heading">{selected.location}</dd>
                </>
              )}
            </dl>

            {selected.description && (
              <RichText text={selected.description} className="rounded-xl bg-app-bg p-3 text-sm text-app-text" />
            )}

            {selected.registration_enabled && (
              <div className="rounded-2xl border border-app-border">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-app-border px-4 py-3">
                  <p className="font-semibold text-app-heading">
                    Anmeldungen: {registrations.length}
                    {selected.max_participants ? ` / ${selected.max_participants}` : ""}
                  </p>
                  <p className="text-xs text-app-muted">
                    {selected.registration_deadline
                      ? `Anmeldeschluss ${formatDay(selected.registration_deadline)}`
                      : "ohne Anmeldeschluss"}
                  </p>
                </div>
                {selected.fee_note && (
                  <p className="border-b border-app-border px-4 py-2 text-sm text-app-muted">Kosten: {selected.fee_note}</p>
                )}
                {registrations.length === 0 ? (
                  <p className="px-4 py-4 text-sm text-app-muted">Noch niemand angemeldet.</p>
                ) : (
                  <ol className="divide-y divide-app-border">
                    {registrations.map((registration, index) => (
                      <li key={registration.athlete_id} className="flex items-baseline justify-between gap-3 px-4 py-2.5 text-sm">
                        <span className="text-app-heading">
                          {index + 1}. {`${registration.first_name ?? ""} ${registration.last_name ?? ""}`.trim() || "Athlet"}
                          {registration.note && <span className="ml-2 text-app-muted">– {registration.note}</span>}
                        </span>
                        <span className="shrink-0 text-xs text-app-faint">
                          {new Date(registration.created_at).toLocaleDateString("de-DE")}
                        </span>
                      </li>
                    ))}
                  </ol>
                )}
              </div>
            )}

            {selected.category === "frist" ? (
              <div className="flex flex-wrap items-center justify-between gap-2 border-t border-app-border pt-4">
                <p className="text-sm text-app-muted">Frist aus der Saisonplanung – dort abhaken oder ändern.</p>
                <Link href="/coach/training/season" className={buttonPrimary}>
                  Zur Saisonplanung
                </Link>
              </div>
            ) : (
              <div className="flex flex-wrap justify-between gap-2 border-t border-app-border pt-4">
                <button type="button" onClick={() => handleDelete(selected)} className={`${buttonGhost} text-app-bad`}>
                  Löschen
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setDraft(entryToDraft(selected));
                    setSelected(null);
                  }}
                  className={buttonPrimary}
                >
                  Bearbeiten
                </button>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Termin anlegen / bearbeiten */}
      <Modal open={Boolean(draft)} title={draft?.id ? "Termin bearbeiten" : "Neuer Termin"} onClose={() => setDraft(null)} wide>
        {draft && (
          <form onSubmit={handleSave} className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-[1fr_200px]">
              <FormField label="Titel *">
                <input
                  type="text"
                  value={draft.title}
                  onChange={(event) => updateDraft("title", event.target.value)}
                  required
                  autoFocus
                  placeholder="z. B. Trainingslager Ostern"
                  className={inputClass}
                />
              </FormField>

              <FormField label="Kategorie">
                <select
                  value={draft.category}
                  onChange={(event) => updateDraft("category", event.target.value as EntryCategory)}
                  className={inputClass}
                >
                  {CATEGORIES.map((category) => (
                    <option key={category.value} value={category.value}>
                      {category.label}
                    </option>
                  ))}
                </select>
              </FormField>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {(["team", "coach"] as const).map((visibility) => (
                <button
                  key={visibility}
                  type="button"
                  onClick={() => updateDraft("visibility", visibility)}
                  className={`rounded-2xl border p-3 text-left transition ${
                    draft.visibility === visibility
                      ? "border-app-accent bg-app-accent/10"
                      : "border-app-border hover:bg-app-elevated"
                  }`}
                >
                  <span className="flex items-center gap-2 font-semibold text-app-heading">
                    <Icon name={visibility === "team" ? "teams" : "lock"} className="h-4 w-4" />
                    {visibility === "team" ? "Team-Kalender" : "Trainerkalender"}
                  </span>
                  <span className="mt-0.5 block text-xs text-app-muted">
                    {visibility === "team" ? "Athleten des Teams sehen den Termin." : "Nur für Trainer sichtbar."}
                  </span>
                </button>
              ))}
            </div>

            <FormField label="Für welches Team?">
              <select value={draft.teamId} onChange={(event) => updateDraft("teamId", event.target.value)} className={inputClass}>
                <option value="">Alle meine Teams</option>
                {teams.map((team) => (
                  <option key={team.id} value={team.id}>
                    {team.name}
                  </option>
                ))}
              </select>
            </FormField>

            <label className="flex items-center gap-2 text-sm text-app-text">
              <input type="checkbox" checked={draft.allDay} onChange={(event) => updateDraft("allDay", event.target.checked)} />
              Ganztägig
            </label>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid grid-cols-[1fr_110px] gap-2">
                <FormField label="Beginn *">
                  <input type="date" value={draft.startDate} onChange={(event) => updateDraft("startDate", event.target.value)} required className={inputClass} />
                </FormField>
                {!draft.allDay && (
                  <FormField label="Uhrzeit">
                    <input type="time" value={draft.startTime} onChange={(event) => updateDraft("startTime", event.target.value)} className={inputClass} />
                  </FormField>
                )}
              </div>
              <div className="grid grid-cols-[1fr_110px] gap-2">
                <FormField label="Ende">
                  <input type="date" value={draft.endDate} min={draft.startDate} onChange={(event) => updateDraft("endDate", event.target.value)} className={inputClass} />
                </FormField>
                {!draft.allDay && (
                  <FormField label="Uhrzeit">
                    <input type="time" value={draft.endTime} onChange={(event) => updateDraft("endTime", event.target.value)} className={inputClass} />
                  </FormField>
                )}
              </div>
            </div>

            <FormField label="Ort">
              <input type="text" value={draft.location} onChange={(event) => updateDraft("location", event.target.value)} placeholder="z. B. Hallenbad Darmstadt" className={inputClass} />
            </FormField>

            <FormField label="Beschreibung">
              <textarea
                value={draft.description}
                onChange={(event) => updateDraft("description", event.target.value)}
                rows={3}
                placeholder="Treffpunkt, Mitbringen, Links …"
                className={inputClass}
              />
            </FormField>

            {draft.visibility === "team" && (
              <div className="rounded-2xl border border-app-border p-4">
                <label className="flex items-center gap-2 font-semibold text-app-heading">
                  <input
                    type="checkbox"
                    checked={draft.registrationEnabled}
                    onChange={(event) => updateDraft("registrationEnabled", event.target.checked)}
                  />
                  Terminanmeldung für Athleten
                </label>
                <p className="mt-1 text-xs text-app-muted">Athleten melden sich in der App an und ab. Du siehst die Liste.</p>

                {draft.registrationEnabled && (
                  <div className="mt-4 grid gap-4 sm:grid-cols-2">
                    <div className="grid grid-cols-[1fr_110px] gap-2">
                      <FormField label="Anmeldeschluss">
                        <input type="date" value={draft.deadlineDate} onChange={(event) => updateDraft("deadlineDate", event.target.value)} className={inputClass} />
                      </FormField>
                      <FormField label="Uhrzeit">
                        <input type="time" value={draft.deadlineTime} onChange={(event) => updateDraft("deadlineTime", event.target.value)} className={inputClass} />
                      </FormField>
                    </div>
                    <FormField label="Höchstzahl Teilnehmer">
                      <input type="number" min={1} value={draft.maxParticipants} onChange={(event) => updateDraft("maxParticipants", event.target.value)} placeholder="unbegrenzt" className={inputClass} />
                    </FormField>
                    <FormField
                      label="Kosten (Hinweis)"
                      hint="Nur ein Hinweis für die Athleten, z. B. „45 € – bitte bar beim Training“. Es wird nichts abgebucht."
                      className="sm:col-span-2"
                    >
                      <input type="text" value={draft.feeNote} onChange={(event) => updateDraft("feeNote", event.target.value)} className={inputClass} />
                    </FormField>
                  </div>
                )}
              </div>
            )}

            <div className="flex justify-end gap-2 border-t border-app-border pt-4">
              <button type="button" onClick={() => setDraft(null)} className={buttonSecondary}>
                Abbrechen
              </button>
              <button type="submit" disabled={saving} className={buttonPrimary}>
                {saving ? "Speichern..." : "Speichern"}
              </button>
            </div>
          </form>
        )}
      </Modal>
    </main>
  );
}
