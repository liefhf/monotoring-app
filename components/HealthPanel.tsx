"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { isMissingTable, supabase } from "@/lib/supabase";
import { toDateKey } from "@/lib/community";
import {
  AVAILABILITY_LABELS,
  Availability,
  CLEARANCE_LABELS,
  Clearance,
  HEALTH_KIND_LABELS,
  HealthEvent,
  HealthKind,
  currentAvailability,
  durationDays,
  isActive,
} from "@/lib/health";
import { EmptyState, FormField, Modal, Notice, buttonPrimary, buttonSecondary, inputClass } from "@/components/ui";

/*
 * Gesundheit im Athletenprofil: Verletzungen, Erkrankungen und
 * Beschwerden mit Trainingsrelevanz (Trainingsfaehigkeit, Einschraenkung,
 * Zeitraum, Freigabe). Bewusst keine Diagnosefelder.
 * Tabelle health_events (supabase/gesundheit_dokumente.sql).
 */

const AVAILABILITY_TONE: Record<Availability, string> = {
  voll: "bg-app-good/15 text-app-good",
  eingeschraenkt: "bg-app-warn/15 text-app-warn",
  pause: "bg-app-bad/15 text-app-bad",
};

type Draft = {
  kind: HealthKind;
  title: string;
  body_region: string;
  availability: Availability;
  restriction: string;
  start_date: string;
  clearance: Clearance;
  note: string;
  visible_to_athlete: boolean;
};

const emptyDraft = (today: string): Draft => ({
  kind: "verletzung",
  title: "",
  body_region: "",
  availability: "eingeschraenkt",
  restriction: "",
  start_date: today,
  clearance: "nicht_noetig",
  note: "",
  visible_to_athlete: true,
});


export default function HealthPanel({ swimmerId }: { swimmerId: string }) {
  const [today] = useState(() => toDateKey(new Date()));
  const [events, setEvents] = useState<HealthEvent[] | null>(null);
  const [missing, setMissing] = useState(false);
  const [message, setMessage] = useState<{ tone: "good" | "bad"; text: string } | null>(null);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Draft>(() => emptyDraft(today));
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const { data, error } = await supabase.from("health_events").select("*").eq("swimmer_id", swimmerId).order("start_date", { ascending: false });
    if (error) {
      setMissing(isMissingTable(error.code));
      setEvents([]);
      return;
    }
    setEvents((data ?? []) as HealthEvent[]);
  }, [swimmerId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Daten beim Oeffnen laden
    load();
  }, [load]);

  async function handleSave(event: FormEvent) {
    event.preventDefault();
    if (!draft.title.trim()) return;
    setSaving(true);
    const { error } = await supabase.from("health_events").insert({
      swimmer_id: swimmerId,
      kind: draft.kind,
      title: draft.title.trim(),
      body_region: draft.body_region.trim() || null,
      availability: draft.availability,
      restriction: draft.restriction.trim() || null,
      start_date: draft.start_date,
      clearance: draft.clearance,
      note: draft.note.trim() || null,
      visible_to_athlete: draft.visible_to_athlete,
    });
    setSaving(false);
    if (error) {
      setMessage({ tone: "bad", text: "Eintrag konnte nicht gespeichert werden." });
      return;
    }
    setOpen(false);
    setDraft(emptyDraft(today));
    setMessage({ tone: "good", text: "Eintrag gespeichert." });
    load();
  }

  async function update(id: string, patch: Partial<HealthEvent>, done: string) {
    const { error } = await supabase.from("health_events").update({ ...patch, updated_at: new Date().toISOString() }).eq("id", id);
    setMessage(error ? { tone: "bad", text: "Änderung konnte nicht gespeichert werden." } : { tone: "good", text: done });
    if (!error) load();
  }

  if (events === null) return <div className="mt-6 h-32 animate-pulse rounded-[20px] bg-app-elevated" aria-label="Wird geladen" />;

  if (missing) {
    return (
      <div className="mt-6">
        <Notice tone="warn">
          Gesundheit ist noch nicht eingerichtet. Bitte im Supabase SQL-Editor <b>supabase/gesundheit_dokumente.sql</b> ausführen (Skript 23).
        </Notice>
      </div>
    );
  }

  const status = currentAvailability(events, today);
  const active = events.filter((item) => isActive(item, today) || item.clearance === "offen");
  const past = events.filter((item) => !active.includes(item));

  return (
    <section className="mt-6 rounded-[20px] border border-app-border/60 bg-app-surface p-4 shadow-app sm:p-[22px]">
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="flex-1 text-[15px] font-bold text-app-heading">Gesundheit & Trainingsfähigkeit</h2>
        <span className={`rounded-full px-2.5 py-1 text-xs font-extrabold ${AVAILABILITY_TONE[status]}`}>{AVAILABILITY_LABELS[status]}</span>
        <button type="button" onClick={() => setOpen(true)} className={buttonPrimary}>
          + Eintrag
        </button>
      </div>

      {message && (
        <div className="mt-3">
          <Notice tone={message.tone}>{message.text}</Notice>
        </div>
      )}

      {events.length === 0 ? (
        <EmptyState icon="heart" title="Keine Einträge">
          Verletzungen, Erkrankungen oder Beschwerden mit Einfluss aufs Training hier festhalten.
        </EmptyState>
      ) : (
        <>
          {active.length > 0 && (
            <ul className="mt-4 space-y-3">
              {active.map((item) => (
                <li key={item.id} className="rounded-[14px] border border-app-border/60 bg-app-elevated/40 p-3.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-bold text-app-heading">{item.title}</span>
                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-extrabold ${AVAILABILITY_TONE[item.availability]}`}>
                      {AVAILABILITY_LABELS[item.availability]}
                    </span>
                    {item.clearance === "offen" && <span className="rounded-full bg-app-soon/15 px-2 py-0.5 text-[11px] font-extrabold text-app-soon">Freigabe ausstehend</span>}
                  </div>
                  <p className="mt-1 text-[13px] text-app-muted">
                    {HEALTH_KIND_LABELS[item.kind]}
                    {item.body_region ? ` · ${item.body_region}` : ""} · seit {new Date(`${item.start_date}T12:00:00`).toLocaleDateString("de-DE")} (
                    {durationDays(item, today)} Tage)
                  </p>
                  {item.restriction && <p className="mt-1 text-sm text-app-text">Einschränkung: {item.restriction}</p>}
                  {item.note && <p className="mt-1 text-[13px] text-app-muted">{item.note}</p>}
                  <div className="mt-3 flex flex-wrap gap-2">
                    {isActive(item, today) && item.availability === "pause" && (
                      <button type="button" className={buttonSecondary} onClick={() => update(item.id, { availability: "eingeschraenkt" }, "Auf „eingeschränkt“ gesetzt.")}>
                        Wieder eingeschränkt im Training
                      </button>
                    )}
                    {isActive(item, today) && (
                      <button type="button" className={buttonSecondary} onClick={() => update(item.id, { end_date: today }, "Als beendet eingetragen.")}>
                        Beendet (heute)
                      </button>
                    )}
                    {item.clearance === "offen" && (
                      <button type="button" className={buttonSecondary} onClick={() => update(item.id, { clearance: "erteilt" }, "Freigabe eingetragen.")}>
                        Freigabe erteilt
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}

          {past.length > 0 && (
            <div className="mt-5">
              <p className="label-caps mb-2">Verlauf</p>
              <ul className="divide-y divide-app-border/60">
                {past.map((item) => (
                  <li key={item.id} className="flex flex-wrap items-baseline gap-x-3 py-2 text-sm">
                    <span className="num w-44 shrink-0 text-[13px] text-app-muted">
                      {new Date(`${item.start_date}T12:00:00`).toLocaleDateString("de-DE")}
                      {item.end_date ? ` – ${new Date(`${item.end_date}T12:00:00`).toLocaleDateString("de-DE")}` : ""}
                    </span>
                    <span className="min-w-0 flex-1 text-app-heading">{item.title}</span>
                    <span className="text-[13px] text-app-muted">
                      {HEALTH_KIND_LABELS[item.kind]} · {durationDays(item, today)} Tage
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}

      <Modal open={open} title="Gesundheit eintragen" onClose={() => setOpen(false)}>
        <form onSubmit={handleSave} className="grid gap-3 sm:grid-cols-2">
          <FormField label="Was? *" className="sm:col-span-2">
            <input className={inputClass} required value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} placeholder="z. B. Schulter rechts, Erkältung" />
          </FormField>
          <FormField label="Art">
            <select className={inputClass} value={draft.kind} onChange={(e) => setDraft({ ...draft, kind: e.target.value as HealthKind })}>
              {(Object.keys(HEALTH_KIND_LABELS) as HealthKind[]).map((kind) => (
                <option key={kind} value={kind}>
                  {HEALTH_KIND_LABELS[kind]}
                </option>
              ))}
            </select>
          </FormField>
          <FormField label="Körperregion">
            <input className={inputClass} value={draft.body_region} onChange={(e) => setDraft({ ...draft, body_region: e.target.value })} placeholder="optional" />
          </FormField>
          <FormField label="Trainingsfähigkeit">
            <select className={inputClass} value={draft.availability} onChange={(e) => setDraft({ ...draft, availability: e.target.value as Availability })}>
              {(Object.keys(AVAILABILITY_LABELS) as Availability[]).map((value) => (
                <option key={value} value={value}>
                  {AVAILABILITY_LABELS[value]}
                </option>
              ))}
            </select>
          </FormField>
          <FormField label="Seit">
            <input type="date" className={inputClass} value={draft.start_date} onChange={(e) => setDraft({ ...draft, start_date: e.target.value })} />
          </FormField>
          <FormField label="Einschränkung im Training" className="sm:col-span-2">
            <input className={inputClass} value={draft.restriction} onChange={(e) => setDraft({ ...draft, restriction: e.target.value })} placeholder="z. B. kein Delfin, nur Beine, keine Starts" />
          </FormField>
          <FormField label="Freigabe">
            <select className={inputClass} value={draft.clearance} onChange={(e) => setDraft({ ...draft, clearance: e.target.value as Clearance })}>
              {(Object.keys(CLEARANCE_LABELS) as Clearance[]).map((value) => (
                <option key={value} value={value}>
                  {CLEARANCE_LABELS[value]}
                </option>
              ))}
            </select>
          </FormField>
          <label className="flex min-h-11 items-center gap-2 self-end text-sm text-app-text">
            <input type="checkbox" checked={draft.visible_to_athlete} onChange={(e) => setDraft({ ...draft, visible_to_athlete: e.target.checked })} className="h-5 w-5" />
            Athlet sieht den Eintrag
          </label>
          <FormField label="Notiz" className="sm:col-span-2">
            <textarea className={`${inputClass} min-h-20`} value={draft.note} onChange={(e) => setDraft({ ...draft, note: e.target.value })} />
          </FormField>
          <p className="text-xs text-app-faint sm:col-span-2">Keine Diagnosen eintragen – nur, was fürs Training wichtig ist.</p>
          <button type="submit" disabled={saving} className={`${buttonPrimary} sm:col-span-2`}>
            {saving ? "Speichern …" : "Speichern"}
          </button>
        </form>
      </Modal>
    </section>
  );
}
