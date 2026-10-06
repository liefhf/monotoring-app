"use client";

import Loader from "@/components/Loader";
import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { formatDate, formatEvent, formatTime, formatTimeDifference } from "@/lib/swim";
import {
  CompetitionStart,
  RATING_CATEGORIES,
  RATING_LABELS,
  START_COLUMNS,
  STATUS_LABELS,
  pacingAnalysis,
} from "@/lib/competitionFeedback";
import { Card, EmptyState, Modal, Notice, PageHeader, RichText, buttonPrimary, buttonSecondary, inputClass } from "@/components/ui";

/*
 * Wettkampf-Feedback fuer Athleten: das Feedback des
 * Trainers zu jedem Start und die eigene Einschaetzung.
 * Sichtbar, sobald der Trainer den Schwimmer mit dem
 * Login verknuepft hat.
 */

type CompetitionInfo = { start_id: string; competition_id: string; competition_name: string; competition_location: string };

const FEELINGS = ["", "😣", "😕", "😐", "🙂", "🤩"];

function Scale({
  value,
  max,
  onChange,
  labels,
}: {
  value: number | null;
  max: number;
  onChange: (value: number) => void;
  labels?: string[];
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {Array.from({ length: max }, (_, index) => index + 1).map((score) => (
        <button
          key={score}
          type="button"
          onClick={() => onChange(score)}
          aria-pressed={value === score}
          className={`flex h-10 min-w-10 items-center justify-center rounded-xl border px-2 text-sm font-semibold transition ${
            value === score ? "border-app-accent bg-app-accent text-app-accent-ink" : "border-app-border text-app-text hover:bg-app-elevated"
          }`}
        >
          {labels ? labels[score] : score}
        </button>
      ))}
    </div>
  );
}

export default function AthleteWettkaempfePage() {
  const [starts, setStarts] = useState<CompetitionStart[]>([]);
  const [infos, setInfos] = useState<CompetitionInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ tone: "good" | "bad"; text: string } | null>(null);

  const [editing, setEditing] = useState<CompetitionStart | null>(null);
  const [feeling, setFeeling] = useState<number | null>(null);
  const [effort, setEffort] = useState<number | null>(null);
  const [nervousness, setNervousness] = useState<number | null>(null);
  const [note, setNote] = useState("");

  const loadData = useCallback(async () => {
    const [startResponse, infoResponse] = await Promise.all([
      supabase.from("competition_starts").select(START_COLUMNS).order("start_date", { ascending: false }),
      supabase.rpc("my_competition_starts"),
    ]);

    setStarts(((startResponse.data ?? []) as CompetitionStart[]).map((start) => ({ ...start, split_times_ms: start.split_times_ms ?? [] })));
    setInfos((infoResponse.data ?? []) as CompetitionInfo[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Daten beim Oeffnen laden
    loadData();
  }, [loadData]);

  const groups = useMemo(() => {
    const byCompetition = new Map<string, { name: string; location: string; starts: CompetitionStart[] }>();

    for (const start of starts) {
      const info = infos.find((item) => item.start_id === start.id);
      const group = byCompetition.get(start.competition_id) ?? {
        name: info?.competition_name ?? "Wettkampf",
        location: info?.competition_location ?? "",
        starts: [],
      };

      group.starts.push(start);
      byCompetition.set(start.competition_id, group);
    }

    return [...byCompetition.entries()];
  }, [starts, infos]);

  function openReflection(start: CompetitionStart) {
    setEditing(start);
    setFeeling(start.athlete_feeling);
    setEffort(start.athlete_effort);
    setNervousness(start.athlete_nervousness);
    setNote(start.athlete_note ?? "");
  }

  async function saveReflection() {
    if (!editing) return;

    const { error } = await supabase.rpc("athlete_reflect_start", {
      p_start_id: editing.id,
      p_feeling: feeling,
      p_effort: effort,
      p_nervousness: nervousness,
      p_note: note,
    });

    if (error) {
      setMessage({ tone: "bad", text: `Konnte nicht gespeichert werden: ${error.message}` });
      return;
    }

    setMessage({ tone: "good", text: "Danke! Deine Einschätzung ist gespeichert ✅" });
    setEditing(null);
    await loadData();
  }

  return (
    <main className="mx-auto max-w-3xl space-y-6 px-4 py-6 sm:px-6">
      <PageHeader icon="trophy" title="Meine Wettkämpfe" description="Feedback deines Trainers zu jedem Start – und deine eigene Einschätzung." />

      {message && <Notice tone={message.tone}>{message.text}</Notice>}

      {loading ? (
        <div className="rounded-[20px] border border-app-border bg-app-surface shadow-app p-10 text-center text-app-muted"><Loader /></div>
      ) : groups.length === 0 ? (
        <Card>
          <EmptyState icon="trophy" title="Noch kein Wettkampf-Feedback">
            Sobald dein Trainer dir Feedback zu einem Wettkampf gibt, erscheint es hier.
          </EmptyState>
        </Card>
      ) : (
        groups.map(([competitionId, group]) => (
          <Card key={competitionId} title={group.name} description={group.location}>
            <ul className="divide-y divide-app-border">
              {group.starts.map((start) => {
                const pacing = pacingAnalysis(start);
                const rated = RATING_CATEGORIES.filter((category) => start[category.key] !== null);

                return (
                  <li key={start.id} className="space-y-3 px-5 py-4">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <div>
                        <p className="font-semibold text-app-heading">
                          {formatEvent(start)} <span className="text-sm font-normal text-app-muted">{start.pool_length}m · {formatDate(start.start_date)}</span>
                        </p>
                        <p className="text-2xl font-bold text-app-heading">
                          {start.status === "ok" && start.time_ms ? formatTime(start.time_ms) : STATUS_LABELS[start.status]}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-1.5 text-xs">
                        {start.placement && <span className="rounded-full bg-app-accent/12 px-2 py-0.5 font-semibold text-app-accent">Platz {start.placement}</span>}
                        {start.goal_time_ms && start.time_ms && (
                          <span
                            className={`rounded-full px-2 py-0.5 font-semibold ${
                              start.time_ms <= start.goal_time_ms ? "bg-app-good/15 text-app-good" : "bg-app-warn/15 text-app-warn"
                            }`}
                          >
                            Ziel {formatTime(start.goal_time_ms)} ({formatTimeDifference(start.time_ms - start.goal_time_ms)})
                          </span>
                        )}
                      </div>
                    </div>

                    {rated.length > 0 && (
                      <div className="grid gap-x-6 gap-y-1 sm:grid-cols-2">
                        {rated.map((category) => (
                          <div key={category.key} className="flex items-center gap-2 text-sm">
                            <span className="w-28 text-app-muted">{category.label}</span>
                            <span className="h-2 flex-1 overflow-hidden rounded-full bg-app-elevated">
                              <span
                                className={`block h-full rounded-full ${start[category.key]! >= 4 ? "bg-app-good" : start[category.key] === 3 ? "bg-app-warn" : "bg-app-bad"}`}
                                style={{ width: `${start[category.key]! * 20}%` }}
                              />
                            </span>
                            <span className="w-20 text-xs text-app-muted">{RATING_LABELS[start[category.key]!]}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {pacing && (
                      <p className="text-sm text-app-muted">
                        Teilzeiten: {pacing.laps.map((lap) => formatTime(lap.ms)).join(" · ")} – {pacing.verdict}
                      </p>
                    )}

                    {start.went_well && (
                      <div className="rounded-xl border border-app-good/30 bg-app-good/8 p-3 text-sm">
                        <p className="font-semibold text-app-good">Das lief gut</p>
                        <RichText text={start.went_well} className="text-app-text" />
                      </div>
                    )}
                    {start.to_improve && (
                      <div className="rounded-xl border border-app-warn/30 bg-app-warn/8 p-3 text-sm">
                        <p className="font-semibold text-app-warn">Daran arbeiten wir</p>
                        <RichText text={start.to_improve} className="text-app-text" />
                      </div>
                    )}
                    {start.coach_note && <RichText text={start.coach_note} className="text-sm text-app-text" />}

                    <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-app-bg/60 px-3 py-2">
                      <span className="text-sm text-app-muted">
                        {start.athlete_updated_at
                          ? `Deine Einschätzung: ${FEELINGS[start.athlete_feeling ?? 0] || "–"} · Anstrengung ${start.athlete_effort ?? "–"}/10`
                          : "Wie war es für dich?"}
                      </span>
                      <button type="button" onClick={() => openReflection(start)} className={buttonSecondary}>
                        {start.athlete_updated_at ? "Ändern" : "Einschätzen"}
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          </Card>
        ))
      )}

      <Modal open={Boolean(editing)} title="Deine Einschätzung" onClose={() => setEditing(null)}>
        {editing && (
          <div className="space-y-5">
            <p className="text-sm text-app-muted">
              {formatEvent(editing)} · {editing.time_ms ? formatTime(editing.time_ms) : STATUS_LABELS[editing.status]}
            </p>

            <div>
              <p className="mb-2 text-sm font-medium text-app-text">Wie hast du dich im Rennen gefühlt?</p>
              <Scale value={feeling} max={5} onChange={setFeeling} labels={FEELINGS} />
            </div>

            <div>
              <p className="mb-2 text-sm font-medium text-app-text">Wie anstrengend war es? (1 = locker … 10 = alles gegeben)</p>
              <Scale value={effort} max={10} onChange={setEffort} />
            </div>

            <div>
              <p className="mb-2 text-sm font-medium text-app-text">Wie nervös warst du vorher? (1 = ruhig … 5 = sehr nervös)</p>
              <Scale value={nervousness} max={5} onChange={setNervousness} />
            </div>

            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-app-text">Was möchtest du deinem Trainer sagen?</span>
              <textarea
                value={note}
                onChange={(event) => setNote(event.target.value)}
                rows={3}
                placeholder="z. B. „Die Wende war zu weit weg“, „Hinten ging mir die Luft aus“"
                className={inputClass}
              />
            </label>

            <div className="flex justify-end gap-2 border-t border-app-border pt-4">
              <button type="button" onClick={() => setEditing(null)} className={buttonSecondary}>
                Abbrechen
              </button>
              <button type="button" onClick={saveReflection} className={buttonPrimary}>
                Speichern
              </button>
            </div>
          </div>
        )}
      </Modal>
    </main>
  );
}
