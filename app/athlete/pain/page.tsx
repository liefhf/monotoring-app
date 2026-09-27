"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import {
  BodySpot,
  PAIN_COLUMNS,
  PAIN_ONSETS,
  PAIN_QUALITIES,
  PAIN_TRIGGERS,
  PainReport,
  TRAINING_IMPACTS,
  TrainingImpact,
  getSpot,
  labelFor,
  painColor,
  painWord,
} from "@/lib/pain";
import { formatRelative } from "@/lib/community";
import BodyMap from "@/components/BodyMap";
import { Card, EmptyState, FormField, Modal, Notice, PageHeader, buttonGhost, buttonPrimary, buttonSecondary, inputClass } from "@/components/ui";

/*
 * Schmerzen melden: Stelle am Koerpermodell antippen (Muskel oder
 * Gelenk), Staerke und Details angeben, beliebig viele Stellen
 * sammeln und zusammen absenden. Der Trainer sieht die Meldung;
 * bei Staerke ab 7 oder "kann nicht trainieren" bekommt er einen
 * Hinweis (supabase/schmerzen.sql).
 */

type SpotDraft = {
  spotId: string;
  level: number | null;
  qualities: string[];
  onset: string;
  triggers: string[];
  impact: TrainingImpact | "";
};

const emptyDraft = (spotId: string): SpotDraft => ({ spotId, level: null, qualities: [], onset: "", triggers: [], impact: "" });

function Chips({
  options,
  selected,
  onToggle,
}: {
  options: { value: string; label: string }[];
  selected: string[];
  onToggle: (value: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((option) => {
        const active = selected.includes(option.value);

        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onToggle(option.value)}
            aria-pressed={active}
            className={`rounded-full border px-3 py-1.5 text-sm transition ${
              active ? "border-app-accent bg-app-accent font-semibold text-app-accent-ink" : "border-app-border text-app-text hover:bg-app-elevated"
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

export default function PainReportPage() {
  const [drafts, setDrafts] = useState<SpotDraft[]>([]);
  const [editing, setEditing] = useState<SpotDraft | null>(null);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ tone: "good" | "bad" | "warn"; text: string } | null>(null);
  const [history, setHistory] = useState<PainReport[] | null>(null);

  const loadHistory = useCallback(async () => {
    const since = new Date(Date.now() - 42 * 86400000).toISOString();
    const { data } = await supabase
      .from("pain_reports")
      .select(PAIN_COLUMNS)
      .gte("created_at", since)
      .order("created_at", { ascending: false });

    setHistory((data ?? []) as PainReport[]);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Daten beim Oeffnen laden
    loadHistory();
  }, [loadHistory]);

  const levels = useMemo(
    () => Object.fromEntries(drafts.filter((draft) => draft.level).map((draft) => [draft.spotId, draft.level as number])),
    [drafts]
  );

  function selectSpot(spot: BodySpot) {
    setEditing(drafts.find((draft) => draft.spotId === spot.id) ?? emptyDraft(spot.id));
  }

  function toggle(list: string[], value: string) {
    return list.includes(value) ? list.filter((item) => item !== value) : [...list, value];
  }

  function applyEditing() {
    if (!editing?.level) return;

    setDrafts((current) => {
      const others = current.filter((draft) => draft.spotId !== editing.spotId);
      return [...others, editing];
    });
    setEditing(null);
  }

  function removeSpot(spotId: string) {
    setDrafts((current) => current.filter((draft) => draft.spotId !== spotId));
    setEditing(null);
  }

  async function submit() {
    if (drafts.length === 0) return;

    setSaving(true);
    setMessage(null);

    const { data: userData } = await supabase.auth.getUser();

    if (!userData.user) {
      setSaving(false);
      setMessage({ tone: "bad", text: "Bitte melde dich neu an." });
      return;
    }

    const group = crypto.randomUUID();
    const rows = drafts.map((draft) => {
      const spot = getSpot(draft.spotId)!;

      return {
        athlete_id: userData.user.id,
        pain_type: spot.type,
        body_region: spot.region,
        side: spot.side,
        pain_level: draft.level,
        note: note.trim() || null,
        spot_id: spot.id,
        spot_label: spot.label,
        body_view: spot.view,
        qualities: draft.qualities,
        onset: draft.onset || null,
        triggers: draft.triggers,
        training_impact: draft.impact || null,
        report_group: group,
      };
    });

    const { error } = await supabase.from("pain_reports").insert(rows);

    setSaving(false);

    if (error) {
      setMessage({
        tone: "bad",
        text: error.message.includes("column")
          ? "Die Schmerzmeldung ist noch nicht eingerichtet. Dein Trainer muss supabase/schmerzen.sql ausführen."
          : `Meldung konnte nicht gespeichert werden: ${error.message}`,
      });
      return;
    }

    setDrafts([]);
    setNote("");
    setMessage({ tone: "good", text: "Danke! Deine Meldung ist bei deinem Trainer angekommen. Gute Besserung 💙" });
    window.scrollTo({ top: 0, behavior: "smooth" });
    await loadHistory();
  }

  /* Verlauf nach Meldung gruppieren */
  const groups = useMemo(() => {
    const map = new Map<string, PainReport[]>();

    for (const report of history ?? []) {
      const key = report.report_group ?? report.id;
      map.set(key, [...(map.get(key) ?? []), report]);
    }

    return [...map.values()];
  }, [history]);

  const editingSpot = editing ? getSpot(editing.spotId) : null;
  const editingExists = editing ? drafts.some((draft) => draft.spotId === editing.spotId) : false;

  return (
    <main className="mx-auto max-w-3xl space-y-6 px-4 py-6 sm:px-6">
      <PageHeader icon="heart" title="Schmerzen melden" description="Tippe auf die Stelle, die weh tut – Muskel oder Gelenk (Punkte). Du kannst mehrere Stellen angeben." />

      {message && <Notice tone={message.tone}>{message.text}</Notice>}

      <Card padded>
        <BodyMap levels={levels} selectedId={editing?.spotId} onSelect={selectSpot} />

        <div className="mt-4 flex flex-wrap items-center justify-center gap-4 text-xs text-app-muted">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-sm border border-app-border bg-app-elevated" /> Muskel
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-full border border-app-muted bg-app-surface" /> Gelenk
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-3 w-16 rounded-full" style={{ background: `linear-gradient(90deg, ${painColor(1)}, ${painColor(5)}, ${painColor(10)})` }} />
            leicht → stark
          </span>
        </div>
      </Card>

      {drafts.length > 0 && (
        <Card title={`Deine Meldung (${drafts.length} ${drafts.length === 1 ? "Stelle" : "Stellen"})`}>
          <ul className="divide-y divide-app-border">
            {drafts.map((draft) => {
              const spot = getSpot(draft.spotId);

              return (
                <li key={draft.spotId} className="flex items-center gap-3 px-5 py-3">
                  <span
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white"
                    style={{ background: painColor(draft.level ?? 1) }}
                  >
                    {draft.level}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-medium text-app-heading">{spot?.label}</span>
                    <span className="block truncate text-xs text-app-muted">
                      {[painWord(draft.level ?? 1), ...draft.qualities.map((q) => labelFor(PAIN_QUALITIES, q)), labelFor(PAIN_ONSETS, draft.onset)]
                        .filter(Boolean)
                        .join(" · ")}
                    </span>
                  </span>
                  <button type="button" onClick={() => setEditing(draft)} className={buttonGhost}>
                    Ändern
                  </button>
                </li>
              );
            })}
          </ul>
          <div className="space-y-4 border-t border-app-border p-5">
            <FormField label="Möchtest du noch etwas dazu sagen? (optional)">
              <textarea
                value={note}
                onChange={(event) => setNote(event.target.value)}
                rows={2}
                placeholder="z. B. „Seit dem Krafttraining am Montag“"
                className={inputClass}
              />
            </FormField>
            <button type="button" onClick={submit} disabled={saving} className={`${buttonPrimary} w-full py-3`}>
              {saving ? "Wird gesendet..." : "Meldung an den Trainer senden"}
            </button>
          </div>
        </Card>
      )}

      <Card title="Meine letzten Meldungen" description="Die letzten 6 Wochen">
        {history === null ? (
          <p className="p-5 text-sm text-app-muted">Wird geladen...</p>
        ) : groups.length === 0 ? (
          <EmptyState icon="heart" title="Keine Meldungen">
            Schön – hoffentlich bleibt das so!
          </EmptyState>
        ) : (
          <ul className="divide-y divide-app-border">
            {groups.map((group) => (
              <li key={group[0].report_group ?? group[0].id} className="space-y-2 px-5 py-3">
                <p className="text-xs text-app-faint">{formatRelative(group[0].created_at)}</p>
                <div className="flex flex-wrap gap-1.5">
                  {group.map((report) => (
                    <span
                      key={report.id}
                      className="inline-flex items-center gap-1.5 rounded-full border border-app-border px-2.5 py-1 text-sm text-app-heading"
                    >
                      <span className="h-2.5 w-2.5 rounded-full" style={{ background: painColor(report.pain_level) }} />
                      {report.spot_label ?? report.body_region} · {report.pain_level}
                    </span>
                  ))}
                </div>
                {group[0].note && <p className="text-sm text-app-muted">„{group[0].note}“</p>}
              </li>
            ))}
          </ul>
        )}
      </Card>

      {/* Details zu einer Stelle */}
      <Modal open={Boolean(editing)} title={editingSpot?.label ?? ""} onClose={() => setEditing(null)}>
        {editing && (
          <div className="space-y-5">
            <div>
              <p className="mb-2 text-sm font-medium text-app-text">
                Wie stark? <span className="text-app-muted">(1 = kaum spürbar, 10 = unerträglich)</span>
              </p>
              <div className="grid grid-cols-5 gap-1.5 sm:grid-cols-10">
                {Array.from({ length: 10 }, (_, index) => index + 1).map((level) => (
                  <button
                    key={level}
                    type="button"
                    onClick={() => setEditing({ ...editing, level })}
                    aria-pressed={editing.level === level}
                    className={`h-11 rounded-xl border-2 text-base font-bold transition ${
                      editing.level === level ? "scale-105 border-app-heading text-white" : "border-transparent text-white opacity-60 hover:opacity-100"
                    }`}
                    style={{ background: painColor(level) }}
                  >
                    {level}
                  </button>
                ))}
              </div>
              {editing.level && <p className="mt-1.5 text-sm font-medium text-app-heading">{painWord(editing.level)}</p>}
            </div>

            <div>
              <p className="mb-2 text-sm font-medium text-app-text">Wie fühlt es sich an?</p>
              <Chips options={PAIN_QUALITIES} selected={editing.qualities} onToggle={(value) => setEditing({ ...editing, qualities: toggle(editing.qualities, value) })} />
            </div>

            <div>
              <p className="mb-2 text-sm font-medium text-app-text">Seit wann?</p>
              <Chips options={PAIN_ONSETS} selected={editing.onset ? [editing.onset] : []} onToggle={(value) => setEditing({ ...editing, onset: editing.onset === value ? "" : value })} />
            </div>

            <div>
              <p className="mb-2 text-sm font-medium text-app-text">Wann tut es weh?</p>
              <Chips options={PAIN_TRIGGERS} selected={editing.triggers} onToggle={(value) => setEditing({ ...editing, triggers: toggle(editing.triggers, value) })} />
            </div>

            <div>
              <p className="mb-2 text-sm font-medium text-app-text">Kannst du trainieren?</p>
              <div className="grid gap-1.5 sm:grid-cols-3">
                {TRAINING_IMPACTS.map((impact) => (
                  <button
                    key={impact.value}
                    type="button"
                    onClick={() => setEditing({ ...editing, impact: editing.impact === impact.value ? "" : impact.value })}
                    aria-pressed={editing.impact === impact.value}
                    className={`rounded-xl border px-3 py-2.5 text-sm transition ${
                      editing.impact === impact.value
                        ? impact.value === "none"
                          ? "border-app-bad bg-app-bad/12 font-semibold text-app-bad"
                          : impact.value === "limited"
                            ? "border-app-warn bg-app-warn/12 font-semibold text-app-warn"
                            : "border-app-good bg-app-good/12 font-semibold text-app-good"
                        : "border-app-border text-app-text hover:bg-app-elevated"
                    }`}
                  >
                    {impact.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap justify-between gap-2 border-t border-app-border pt-4">
              {editingExists ? (
                <button type="button" onClick={() => removeSpot(editing.spotId)} className={`${buttonGhost} text-app-bad`}>
                  Stelle entfernen
                </button>
              ) : (
                <span />
              )}
              <div className="flex gap-2">
                <button type="button" onClick={() => setEditing(null)} className={buttonSecondary}>
                  Abbrechen
                </button>
                <button type="button" onClick={applyEditing} disabled={!editing.level} className={buttonPrimary}>
                  {editing.level ? "Übernehmen" : "Stärke wählen"}
                </button>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </main>
  );
}
