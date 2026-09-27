"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import {
  CALENDAR_COLUMNS,
  CalendarEntry,
  TeamOption,
  formatDay,
  formatEntryWhen,
  getCategory,
  isRegistrationOpen,
} from "@/lib/community";
import CalendarView from "@/components/CalendarView";
import { Modal, Notice, PageHeader, RichText, buttonPrimary, buttonSecondary, inputClass } from "@/components/ui";

/*
 * Termine fuer Athleten: alles aus dem Team-Kalender
 * ihrer Teams (Trainer-Termine sehen sie nicht - das
 * regelt die Datenbank). Anmeldung direkt am Termin.
 */
export default function AthleteTerminePage() {
  const [entries, setEntries] = useState<CalendarEntry[]>([]);
  const [teams, setTeams] = useState<TeamOption[]>([]);
  const [registeredIds, setRegisteredIds] = useState<Set<string>>(new Set());
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ tone: "good" | "bad"; text: string } | null>(null);

  const [selected, setSelected] = useState<CalendarEntry | null>(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  const loadData = useCallback(async () => {
    const [entryResponse, teamResponse, registrationResponse] = await Promise.all([
      supabase.from("calendar_entries").select(CALENDAR_COLUMNS).order("starts_at"),
      supabase.rpc("my_teams"),
      supabase.from("calendar_registrations").select("entry_id"),
    ]);

    if (entryResponse.error) {
      setMessage({ tone: "bad", text: "Termine konnten nicht geladen werden." });
      setLoading(false);
      return;
    }

    const loaded = (entryResponse.data ?? []) as CalendarEntry[];
    setEntries(loaded);
    setTeams((teamResponse.data ?? []) as TeamOption[]);
    setRegisteredIds(new Set((registrationResponse.data ?? []).map((row) => row.entry_id as string)));

    const ids = loaded.filter((entry) => entry.registration_enabled).map((entry) => entry.id);

    if (ids.length > 0) {
      const { data } = await supabase.rpc("entry_registration_counts", { p_entry_ids: ids });
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

  async function register() {
    if (!selected) return;

    setBusy(true);
    const { error } = await supabase.rpc("register_for_entry", { p_entry_id: selected.id, p_note: note });
    setBusy(false);

    if (error) {
      setMessage({ tone: "bad", text: error.message });
      return;
    }

    setMessage({ tone: "good", text: `Du bist für „${selected.title}“ angemeldet ✅` });
    setSelected(null);
    await loadData();
  }

  async function unregister() {
    if (!selected) return;

    setBusy(true);
    const { error } = await supabase.rpc("unregister_from_entry", { p_entry_id: selected.id });
    setBusy(false);

    if (error) {
      setMessage({ tone: "bad", text: error.message });
      return;
    }

    setMessage({ tone: "good", text: `Du bist von „${selected.title}“ abgemeldet.` });
    setSelected(null);
    await loadData();
  }

  const isRegistered = selected ? registeredIds.has(selected.id) : false;
  const count = selected ? counts[selected.id] ?? 0 : 0;
  const full = Boolean(selected?.max_participants && count >= selected.max_participants);

  return (
    <main className="mx-auto max-w-6xl space-y-6 px-4 py-6 sm:px-6">
      <PageHeader icon="calendar" title="Termine" description="Trainings, Wettkämpfe und Trainingslager deiner Teams." />

      {message && <Notice tone={message.tone}>{message.text}</Notice>}

      {loading ? (
        <div className="rounded-2xl border border-app-border bg-app-surface p-10 text-center text-app-muted">
          Termine werden geladen...
        </div>
      ) : (
        <CalendarView
          entries={entries}
          onSelectEntry={(entry) => {
            setSelected(entry);
            setNote("");
          }}
          teamName={teamName}
          registeredIds={registeredIds}
        />
      )}

      <Modal open={Boolean(selected)} title={selected?.title ?? ""} onClose={() => setSelected(null)}>
        {selected && (
          <div className="space-y-5">
            <span className={`inline-block rounded-full px-2.5 py-1 text-xs font-semibold ${getCategory(selected.category).chip}`}>
              {getCategory(selected.category).label}
            </span>

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
              <div className="space-y-3 rounded-2xl border border-app-border p-4">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="font-semibold text-app-heading">
                    {isRegistered ? "Du bist angemeldet ✓" : "Anmeldung"}
                  </p>
                  <p className="text-xs text-app-muted">
                    {count}
                    {selected.max_participants ? ` / ${selected.max_participants}` : ""} angemeldet
                    {selected.registration_deadline && ` · Anmeldeschluss ${formatDay(selected.registration_deadline)}`}
                  </p>
                </div>

                {selected.fee_note && <p className="text-sm text-app-muted">Kosten: {selected.fee_note}</p>}

                {isRegistered ? (
                  isRegistrationOpen(selected) && (
                    <button type="button" onClick={unregister} disabled={busy} className={buttonSecondary}>
                      Abmelden
                    </button>
                  )
                ) : !isRegistrationOpen(selected) ? (
                  <p className="text-sm text-app-warn">Die Anmeldung ist geschlossen.</p>
                ) : full ? (
                  <p className="text-sm text-app-warn">Der Termin ist leider ausgebucht.</p>
                ) : (
                  <div className="space-y-3">
                    <input
                      type="text"
                      value={note}
                      onChange={(event) => setNote(event.target.value)}
                      placeholder="Bemerkung (optional), z. B. „komme später“"
                      className={inputClass}
                    />
                    <button type="button" onClick={register} disabled={busy} className={buttonPrimary}>
                      {busy ? "Wird angemeldet..." : "Jetzt anmelden"}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </Modal>
    </main>
  );
}
