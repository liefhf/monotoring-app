"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import {
  PoolLength,
  QualifyingStandard,
  QualifyingTime,
  RESULT_COLUMNS,
  ROUNDS,
  STROKES,
  Stroke,
  Swimmer,
  SwimmerResult,
  formatDate,
  formatEvent,
  formatTime,
  formatTimeDifference,
  getDistancesForStroke,
  getSwimmerName,
  parseSwimTimeToMs,
  splitResults,
} from "@/lib/swim";
import {
  CompetitionStart,
  RATING_CATEGORIES,
  RATING_LABELS,
  RatingKey,
  START_COLUMNS,
  STATUS_LABELS,
  StartEvaluation,
  StartStatus,
  suggestTimes,
  evaluateStart,
  formatPercent,
  lapTimes,
  pacingAnalysis,
  percentDiff,
  roundFromType,
  strokeFromText,
  summarize,
} from "@/lib/competitionFeedback";
import { Icon } from "@/components/icons";
import RelayPanel from "@/components/RelayPanel";
import ProtocolImport from "@/components/ProtocolImport";
import {
  Card,
  EmptyState,
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
 * Wettkampf-Feedback und Auswertung.
 * Pro Start: Zeiten, Zwischenzeiten, Noten und Feedback.
 * Endzeiten landen automatisch in den Ergebnissen des
 * Schwimmers (Datenbank-Trigger), dadurch aktualisieren
 * sich Bestzeiten und Entwicklung von selbst.
 */

type Tab = "starts" | "staffeln" | "auswertung" | "fazit";

type Competition = {
  id: string;
  name: string;
  start_date: string;
  end_date: string | null;
  location: string;
};

type EventOption = {
  id: string;
  number: number;
  label: string;
  distance: number;
  stroke: Stroke;
  round: string | null;
  date: string;
};

type Review = {
  summary: string;
  went_well: string;
  to_improve: string;
  next_steps: string;
};

type Draft = {
  id: string | null;
  swimmerId: string;
  eventId: string;
  date: string;
  poolLength: PoolLength;
  distance: string;
  stroke: Stroke;
  round: string;
  entryTime: string;
  goalTime: string;
  time: string;
  splits: string;
  status: StartStatus;
  placement: string;
  points: string;
  ratings: Record<RatingKey, number | null>;
  wentWell: string;
  toImprove: string;
  coachNote: string;
  shared: boolean;
};

const emptyRatings = (): Record<RatingKey, number | null> => ({
  rating_start: null,
  rating_turns: null,
  rating_underwater: null,
  rating_technique: null,
  rating_pacing: null,
  rating_finish: null,
});

const msToInput = (ms: number | null) => (ms ? formatTime(ms) : "");

function parseOptionalTime(value: string) {
  if (!value.trim()) return { ok: true, ms: null as number | null };

  const ms = parseSwimTimeToMs(value);

  return { ok: ms !== null, ms };
}

/* "30,12  1:03,50; 1:37,2" -> [30120, 63500, 97200] */
function parseSplits(value: string) {
  const parts = value
    .split(/[\s;/|]+/)
    .map((part) => part.trim())
    .filter(Boolean);
  const result: number[] = [];

  for (const part of parts) {
    const ms = parseSwimTimeToMs(part);

    if (ms === null) return null;

    result.push(ms);
  }

  return result.sort((a, b) => a - b);
}

function RatingPicker({ value, onChange }: { value: number | null; onChange: (value: number | null) => void }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((score) => (
        <button
          key={score}
          type="button"
          onClick={() => onChange(value === score ? null : score)}
          title={RATING_LABELS[score]}
          aria-label={`${score} – ${RATING_LABELS[score]}`}
          aria-pressed={value === score}
          className={`h-8 w-8 rounded-lg border text-sm font-semibold transition ${
            value !== null && score <= value
              ? score <= 2
                ? "border-app-bad bg-app-bad/15 text-app-bad"
                : score === 3
                  ? "border-app-warn bg-app-warn/15 text-app-warn"
                  : "border-app-good bg-app-good/15 text-app-good"
              : "border-app-border text-app-faint hover:bg-app-elevated"
          }`}
        >
          {score}
        </button>
      ))}
    </div>
  );
}

function Badge({ tone, children }: { tone: "good" | "bad" | "warn" | "accent" | "muted"; children: React.ReactNode }) {
  const tones = {
    good: "bg-app-good/15 text-app-good",
    bad: "bg-app-bad/15 text-app-bad",
    warn: "bg-app-warn/15 text-app-warn",
    accent: "bg-app-accent/12 text-app-accent",
    muted: "bg-app-elevated text-app-muted",
  };

  return <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${tones[tone]}`}>{children}</span>;
}

function DiffText({ ms, reference }: { ms: number | null; reference?: number | null }) {
  if (ms === null) return <span className="text-app-faint">–</span>;

  return (
    <span className={ms < 0 ? "text-app-good" : ms > 0 ? "text-app-bad" : "text-app-muted"}>
      {formatTimeDifference(ms)}
      {reference ? <span className="ml-1 text-xs opacity-75">({formatPercent(percentDiff(reference + ms, reference))})</span> : null}
    </span>
  );
}

export default function WettkampfAuswertungPage() {
  const params = useParams();
  const competitionId = typeof params.id === "string" ? params.id : "";

  const [competition, setCompetition] = useState<Competition | null>(null);
  const [events, setEvents] = useState<EventOption[]>([]);
  const [swimmers, setSwimmers] = useState<Swimmer[]>([]);
  const [starts, setStarts] = useState<CompetitionStart[]>([]);
  const [results, setResults] = useState<SwimmerResult[]>([]);
  const [standards, setStandards] = useState<QualifyingStandard[]>([]);
  const [qualifyingTimes, setQualifyingTimes] = useState<QualifyingTime[]>([]);
  const [review, setReview] = useState<Review>({ summary: "", went_well: "", to_improve: "", next_steps: "" });
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ tone: "good" | "bad" | "warn"; text: string } | null>(null);

  const [tab, setTab] = useState<Tab>("starts");
  const [standardId, setStandardId] = useState("");
  const [draft, setDraft] = useState<Draft | null>(null);
  const [saving, setSaving] = useState(false);
  const [lastPool, setLastPool] = useState<PoolLength>(50);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [showImport, setShowImport] = useState(false);

  const loadData = useCallback(async () => {
    const [competitionResponse, sectionResponse, swimmerResponse, startResponse, resultResponse, standardResponse, timeResponse, reviewResponse] =
      await Promise.all([
        supabase.from("competitions").select("id, name, start_date, end_date, location").eq("id", competitionId).single(),
        supabase.from("competition_sections").select("id, section_date").eq("competition_id", competitionId),
        supabase.from("swimmers").select("id, first_name, last_name, birth_year, gender").order("first_name"),
        supabase.from("competition_starts").select(START_COLUMNS).eq("competition_id", competitionId).order("start_date"),
        supabase.from("swimmer_results").select(RESULT_COLUMNS),
        supabase.from("qualifying_standards").select("id, name, pool_length, valid_from, valid_to").order("created_at", { ascending: false }),
        supabase.from("qualifying_times").select("id, standard_id, gender, birth_year_from, birth_year_to, distance, stroke, time_ms"),
        supabase.from("competition_reviews").select("summary, went_well, to_improve, next_steps").eq("competition_id", competitionId).maybeSingle(),
      ]);

    if (competitionResponse.error || !competitionResponse.data) {
      setMessage({ tone: "bad", text: "Wettkampf konnte nicht geladen werden." });
      setLoading(false);
      return;
    }

    if (startResponse.error) {
      setMessage({
        tone: "bad",
        text: startResponse.error.message.includes("competition_starts")
          ? "Das Wettkampf-Feedback ist noch nicht eingerichtet. Bitte führe supabase/wettkampf_feedback.sql im Supabase SQL-Editor aus."
          : `Starts konnten nicht geladen werden: ${startResponse.error.message}`,
      });
    }

    const loadedCompetition = competitionResponse.data as Competition;
    setCompetition(loadedCompetition);

    /* Wettkampffolge als Auswahl fuer die Disziplin (ohne Staffeln) */
    const sections = (sectionResponse.data ?? []) as { id: string; section_date: string }[];

    if (sections.length > 0) {
      const { data: eventData } = await supabase
        .from("competition_events")
        .select("id, section_id, event_number, distance_m, relay_count, stroke, gender, round_type, age_group_text")
        .in("section_id", sections.map((section) => section.id))
        .order("event_number");

      const options: EventOption[] = [];

      for (const event of (eventData ?? []) as {
        id: string;
        section_id: string;
        event_number: number;
        distance_m: number;
        relay_count: number | null;
        stroke: string;
        gender: string;
        round_type: string;
        age_group_text: string | null;
      }[]) {
        const stroke = strokeFromText(event.stroke);

        if (!stroke || (event.relay_count && event.relay_count > 1)) continue;

        const round = roundFromType(event.round_type);
        const gender = event.gender === "female" ? "w" : event.gender === "male" ? "m" : "mix";

        options.push({
          id: event.id,
          number: event.event_number,
          label: `WK ${event.event_number} · ${event.distance_m} m ${event.stroke} (${gender})${round ? ` · ${round}` : ""}${
            event.age_group_text ? ` · ${event.age_group_text}` : ""
          }`,
          distance: event.distance_m,
          stroke,
          round,
          date: sections.find((section) => section.id === event.section_id)?.section_date ?? loadedCompetition.start_date,
        });
      }

      setEvents(options);
    }

    setSwimmers((swimmerResponse.data ?? []) as Swimmer[]);
    setStarts(((startResponse.data ?? []) as CompetitionStart[]).map((start) => ({ ...start, split_times_ms: start.split_times_ms ?? [] })));
    setResults(splitResults(resultResponse.data ?? []).pool);
    setStandards((standardResponse.data ?? []) as QualifyingStandard[]);
    setQualifyingTimes((timeResponse.data ?? []) as QualifyingTime[]);

    if (reviewResponse.data) {
      const data = reviewResponse.data as Record<keyof Review, string | null>;
      setReview({
        summary: data.summary ?? "",
        went_well: data.went_well ?? "",
        to_improve: data.to_improve ?? "",
        next_steps: data.next_steps ?? "",
      });
    }

    setLoading(false);
  }, [competitionId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Daten beim Oeffnen laden
    if (competitionId) loadData();
  }, [competitionId, loadData]);

  const swimmerById = useMemo(() => new Map(swimmers.map((swimmer) => [swimmer.id, swimmer])), [swimmers]);
  const standardTimes = standardId ? qualifyingTimes.filter((time) => time.standard_id === standardId) : null;
  const selectedStandard = standards.find((standard) => standard.id === standardId) ?? null;

  const evaluations = useMemo(
    () =>
      starts.map((start) =>
        evaluateStart(
          start,
          results,
          swimmerById.get(start.swimmer_id),
          standardTimes && selectedStandard?.pool_length === start.pool_length ? standardTimes : null
        )
      ),
    [starts, results, swimmerById, standardTimes, selectedStandard]
  );

  const summary = useMemo(() => summarize(evaluations), [evaluations]);

  /* Fuer den Protokoll-Import: Wettkampfnummer -> Wettkampf der Folge */
  const eventsByNumber = useMemo(
    () => Object.fromEntries(events.map((event) => [event.number, { id: event.id, date: event.date }])),
    [events]
  );

  const bySwimmer = useMemo(() => {
    const groups = new Map<string, StartEvaluation[]>();

    for (const evaluation of evaluations) {
      const list = groups.get(evaluation.start.swimmer_id) ?? [];
      list.push(evaluation);
      groups.set(evaluation.start.swimmer_id, list);
    }

    return [...groups.entries()].sort((a, b) =>
      getSwimmerName(swimmerById.get(a[0]) ?? ({ first_name: "?" } as Swimmer)).localeCompare(
        getSwimmerName(swimmerById.get(b[0]) ?? ({ first_name: "?" } as Swimmer)),
        "de"
      )
    );
  }, [evaluations, swimmerById]);

  /* ---------- Formular ---------- */

  function newDraft(swimmerId = ""): Draft {
    return {
      id: null,
      swimmerId,
      eventId: "",
      date: competition?.start_date ?? "",
      poolLength: lastPool,
      distance: "100",
      stroke: "freestyle",
      round: "",
      entryTime: "",
      goalTime: "",
      time: "",
      splits: "",
      status: "ok",
      placement: "",
      points: "",
      ratings: emptyRatings(),
      wentWell: "",
      toImprove: "",
      coachNote: "",
      shared: true,
    };
  }

  function draftFromStart(start: CompetitionStart): Draft {
    return {
      id: start.id,
      swimmerId: start.swimmer_id,
      eventId: start.event_id ?? "",
      date: start.start_date,
      poolLength: start.pool_length,
      distance: `${start.distance}`,
      stroke: start.stroke,
      round: start.round ?? "",
      entryTime: msToInput(start.entry_time_ms),
      goalTime: msToInput(start.goal_time_ms),
      time: msToInput(start.time_ms),
      splits: start.split_times_ms.map(formatTime).join("  "),
      status: start.status,
      placement: start.placement ? `${start.placement}` : "",
      points: start.points !== null ? `${start.points}` : "",
      ratings: {
        rating_start: start.rating_start,
        rating_turns: start.rating_turns,
        rating_underwater: start.rating_underwater,
        rating_technique: start.rating_technique,
        rating_pacing: start.rating_pacing,
        rating_finish: start.rating_finish,
      },
      wentWell: start.went_well ?? "",
      toImprove: start.to_improve ?? "",
      coachNote: start.coach_note ?? "",
      shared: start.shared_with_athlete,
    };
  }

  function updateDraft<K extends keyof Draft>(key: K, value: Draft[K]) {
    setDraft((current) => {
      if (!current) return current;

      const next = { ...current, [key]: value };

      if (key === "eventId") {
        const event = events.find((item) => item.id === value);

        if (event) {
          next.distance = `${event.distance}`;
          next.stroke = event.stroke;
          next.round = event.round ?? "";
          next.date = event.date;
        }
      }

      if (key === "stroke") {
        const distances = getDistancesForStroke(value as Stroke);

        if (!distances.includes(Number(next.distance))) next.distance = `${distances[0]}`;
      }

      return next;
    });
  }

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!draft) return;

    if (!draft.swimmerId) {
      setMessage({ tone: "bad", text: "Bitte wähle einen Schwimmer." });
      return;
    }

    const entry = parseOptionalTime(draft.entryTime);
    const goal = parseOptionalTime(draft.goalTime);
    const final = parseOptionalTime(draft.time);
    const splits = parseSplits(draft.splits);

    if (!entry.ok || !goal.ok || !final.ok || splits === null) {
      setMessage({ tone: "bad", text: "Eine Zeit ist nicht lesbar. Schreibweise z. B. 31,45 oder 1:05,23." });
      return;
    }

    if (draft.status === "ok" && !final.ms) {
      setMessage({ tone: "bad", text: "Für einen gewerteten Start brauche ich die Endzeit." });
      return;
    }

    const placement = draft.placement.trim() ? Number(draft.placement) : null;
    const points = draft.points.trim() ? Number(draft.points) : null;

    if ((placement !== null && !(placement >= 1)) || (points !== null && !(points >= 0))) {
      setMessage({ tone: "bad", text: "Platz und Punkte bitte als Zahl eintragen." });
      return;
    }

    const payload = {
      competition_id: competitionId,
      swimmer_id: draft.swimmerId,
      event_id: draft.eventId || null,
      start_date: draft.date,
      pool_length: draft.poolLength,
      distance: Number(draft.distance),
      stroke: draft.stroke,
      round: draft.round || null,
      entry_time_ms: entry.ms,
      goal_time_ms: goal.ms,
      time_ms: final.ms,
      split_times_ms: splits,
      status: draft.status,
      placement,
      points,
      ...draft.ratings,
      went_well: draft.wentWell.trim() || null,
      to_improve: draft.toImprove.trim() || null,
      coach_note: draft.coachNote.trim() || null,
      shared_with_athlete: draft.shared,
    };

    setSaving(true);

    const { error } = draft.id
      ? await supabase.from("competition_starts").update(payload).eq("id", draft.id)
      : await supabase.from("competition_starts").insert(payload);

    setSaving(false);

    if (error) {
      setMessage({ tone: "bad", text: `Start konnte nicht gespeichert werden: ${error.message}` });
      return;
    }

    setLastPool(draft.poolLength);
    setMessage({ tone: "good", text: "Start gespeichert ✅ – die Zeit steht jetzt auch bei den Ergebnissen des Schwimmers." });
    setDraft(null);
    await loadData();
  }

  async function handleDelete(start: CompetitionStart) {
    if (!window.confirm("Diesen Start samt Feedback löschen? Die Zeit wird auch aus den Ergebnissen des Schwimmers entfernt.")) return;

    const { error } = await supabase.from("competition_starts").delete().eq("id", start.id);

    if (error) {
      setMessage({ tone: "bad", text: `Start konnte nicht gelöscht werden: ${error.message}` });
      return;
    }

    setDraft(null);
    await loadData();
  }

  /* Fuer alle Starts ohne Zielzeit einen Vorschlag eintragen */
  async function suggestAllGoals() {
    const updates = starts
      .filter((start) => !start.goal_time_ms)
      .map((start) => ({ start, suggestion: suggestTimes(results, start) }))
      .filter((item) => item.suggestion);

    if (updates.length === 0) {
      setMessage({ tone: "warn", text: "Kein Vorschlag möglich – entweder haben alle Starts schon eine Zielzeit oder es fehlen frühere Zeiten." });
      return;
    }

    for (const { start, suggestion } of updates) {
      await supabase
        .from("competition_starts")
        .update({ goal_time_ms: suggestion!.goalMs, entry_time_ms: start.entry_time_ms ?? suggestion!.entryMs })
        .eq("id", start.id);
    }

    setMessage({ tone: "good", text: `${updates.length} Zielzeit${updates.length === 1 ? "" : "en"} vorgeschlagen (Bestzeit −1 %). Du kannst sie im Feedback anpassen.` });
    await loadData();
  }

  /* ---------- Fazit ---------- */

  function suggestSummary() {
    const lines = [
      `${summary.starts} Starts von ${bySwimmer.length} Schwimmer${bySwimmer.length === 1 ? "" : "n"}.`,
      summary.valid > 0
        ? `${summary.personalBests} neue Bestzeit${summary.personalBests === 1 ? "" : "en"} (${Math.round((summary.personalBests / summary.valid) * 100)} % der gewerteten Starts)${
            summary.firstTimes ? `, davon ${summary.firstTimes} erstmals geschwommen` : ""
          }.`
        : null,
      summary.averageImprovement !== null
        ? `Im Schnitt ${formatPercent(summary.averageImprovement)} zur bisherigen Bestzeit.`
        : null,
      summary.goalsSet ? `${summary.goalsReached} von ${summary.goalsSet} Zielzeiten erreicht.` : null,
      summary.invalid ? `${summary.invalid} Start${summary.invalid === 1 ? "" : "s"} nicht gewertet (DSQ/nicht angetreten).` : null,
    ].filter(Boolean);

    setReview((current) => ({
      summary: lines.join(" "),
      went_well: current.went_well || summary.strongest.map((category) => `${category.label} (Ø ${category.average!.toFixed(1).replace(".", ",")})`).join(", "),
      to_improve: current.to_improve || summary.weakest.map((category) => `${category.label} (Ø ${category.average!.toFixed(1).replace(".", ",")})`).join(", "),
      next_steps: current.next_steps || summary.weakest.map((category) => `${category.label}: ${category.drill}`).join("\n"),
    }));
  }

  async function saveReview(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const { error } = await supabase.from("competition_reviews").upsert({
      competition_id: competitionId,
      summary: review.summary.trim() || null,
      went_well: review.went_well.trim() || null,
      to_improve: review.to_improve.trim() || null,
      next_steps: review.next_steps.trim() || null,
      updated_at: new Date().toISOString(),
    });

    setMessage(error ? { tone: "bad", text: `Fazit konnte nicht gespeichert werden: ${error.message}` } : { tone: "good", text: "Fazit gespeichert ✅" });
  }

  /* ---------- Anzeige ---------- */

  if (loading) {
    return (
      <main className="mx-auto max-w-6xl">
        <div className="rounded-2xl border border-app-border bg-app-surface p-10 text-center text-app-muted">Wird geladen...</div>
      </main>
    );
  }

  if (!competition) {
    return (
      <main className="mx-auto max-w-6xl space-y-4">
        <Notice tone="bad">{message?.text ?? "Wettkampf nicht gefunden."}</Notice>
        <Link href="/coach/competitions" className={buttonSecondary}>
          ← Wettkämpfe
        </Link>
      </main>
    );
  }

  const tabs: { value: Tab; label: string }[] = [
    { value: "starts", label: `Starts & Feedback (${starts.length})` },
    { value: "auswertung", label: "Auswertung" },
    { value: "staffeln", label: "Staffeln" },
    { value: "fazit", label: "Fazit" },
  ];

  const kpis = [
    { label: "Starts", value: `${summary.starts}`, hint: `${bySwimmer.length} Schwimmer` },
    {
      label: "Bestzeiten",
      value: `${summary.personalBests}`,
      hint: summary.valid ? `${Math.round((summary.personalBests / summary.valid) * 100)} % der gewerteten Starts` : "–",
      tone: "text-app-good",
    },
    {
      label: "Ø zur alten Bestzeit",
      value: summary.averageImprovement !== null ? formatPercent(summary.averageImprovement) : "–",
      hint: "negativ = schneller",
      tone: summary.averageImprovement !== null && summary.averageImprovement < 0 ? "text-app-good" : "text-app-heading",
    },
    { label: "Zielzeiten erreicht", value: summary.goalsSet ? `${summary.goalsReached} / ${summary.goalsSet}` : "–", hint: "mit gesetzter Zielzeit" },
    { label: "Nicht gewertet", value: `${summary.invalid}`, hint: "DSQ, nicht angetreten, aufgegeben", tone: summary.invalid ? "text-app-warn" : "text-app-heading" },
  ];

  return (
    <main className="mx-auto max-w-6xl space-y-6">
      <Link href={`/coach/competitions/${competitionId}`} className="text-sm text-app-accent hover:underline print:hidden">
        ← Zurück zum Wettkampf
      </Link>

      <PageHeader
        icon="trophy"
        eyebrow="Auswertung & Feedback"
        title={competition.name}
        description={`${formatDate(competition.start_date)}${competition.end_date ? ` – ${formatDate(competition.end_date)}` : ""} · ${competition.location}`}
        actions={
          <div className="flex flex-wrap gap-2 print:hidden">
            <button type="button" onClick={() => setShowImport(true)} className={buttonSecondary}>
              Protokoll importieren
            </button>
            {starts.some((start) => !start.goal_time_ms) && (
              <button type="button" onClick={suggestAllGoals} className={buttonSecondary} title="Bestzeit −1 % für alle Starts ohne Zielzeit">
                Zielzeiten vorschlagen
              </button>
            )}
            <button type="button" onClick={() => window.print()} className={buttonSecondary}>
              Drucken / PDF
            </button>
            <button type="button" onClick={() => setDraft(newDraft())} className={buttonPrimary}>
              <Icon name="plus" className="h-4 w-4" />
              Start erfassen
            </button>
          </div>
        }
      />

      {message && <Notice tone={message.tone}>{message.text}</Notice>}

      {swimmers.length === 0 && (
        <Notice tone="warn">
          Du hast noch keine Athleten angelegt.{" "}
          <Link href="/coach/schwimmer" className="underline">
            Zu den Athleten
          </Link>
        </Notice>
      )}

      <nav className="flex flex-wrap gap-1 border-b border-app-border print:hidden">
        {tabs.map((item) => (
          <button
            key={item.value}
            type="button"
            onClick={() => setTab(item.value)}
            className={`-mb-px border-b-2 px-4 py-2.5 text-sm transition ${
              tab === item.value ? "border-app-accent font-semibold text-app-accent" : "border-transparent text-app-muted hover:text-app-heading"
            }`}
          >
            {item.label}
          </button>
        ))}
      </nav>

      {/* ============ STARTS & FEEDBACK ============ */}
      {tab === "starts" &&
        (bySwimmer.length === 0 ? (
          <Card>
            <EmptyState icon="stopwatch" title="Noch keine Starts erfasst">
              Trag für jeden Schwimmer die geschwommenen Disziplinen ein – mit Zeit, Zwischenzeiten und deinem Feedback.
            </EmptyState>
            <div className="flex justify-center pb-8">
              <button type="button" onClick={() => setDraft(newDraft())} className={buttonPrimary}>
                Ersten Start erfassen
              </button>
            </div>
          </Card>
        ) : (
          <div className="space-y-5">
            {bySwimmer.map(([swimmerId, items]) => {
              const swimmer = swimmerById.get(swimmerId);
              const pbs = items.filter((item) => item.isPersonalBest).length;

              return (
                <Card
                  key={swimmerId}
                  title={
                    <Link href={`/coach/schwimmer/${swimmerId}`} className="hover:text-app-accent">
                      {swimmer ? getSwimmerName(swimmer) : "Schwimmer"}
                    </Link>
                  }
                  description={`${items.length} Start${items.length === 1 ? "" : "s"} · ${pbs} Bestzeit${pbs === 1 ? "" : "en"}`}
                  action={
                    <button type="button" onClick={() => setDraft(newDraft(swimmerId))} className={`${buttonGhost} print:hidden`}>
                      <Icon name="plus" className="h-4 w-4" /> Start
                    </button>
                  }
                >
                  <ul className="divide-y divide-app-border">
                    {items.map((evaluation) => {
                      const { start } = evaluation;
                      const pacing = pacingAnalysis(start);
                      const open = expanded === start.id;

                      return (
                        <li key={start.id} className="px-5 py-3">
                          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                            <button
                              type="button"
                              onClick={() => setExpanded(open ? null : start.id)}
                              className="flex min-w-0 flex-1 items-center gap-3 text-left"
                              aria-expanded={open}
                            >
                              <span className="w-40 shrink-0 font-semibold text-app-heading">
                                {formatEvent(start)}
                                <span className="block text-xs font-normal text-app-muted">
                                  {start.pool_length}m{start.round ? ` · ${start.round}` : ""}
                                </span>
                              </span>
                              <span className="w-20 shrink-0 text-lg font-bold text-app-heading">
                                {start.status === "ok" && start.time_ms ? formatTime(start.time_ms) : "–"}
                              </span>
                              <span className="flex flex-wrap gap-1">
                                {start.status !== "ok" && <Badge tone="warn">{STATUS_LABELS[start.status]}</Badge>}
                                {evaluation.isPersonalBest && <Badge tone="good">{evaluation.previous ? "Bestzeit" : "erstmals"}</Badge>}
                                {evaluation.diffToPreviousMs !== null && evaluation.diffToPreviousMs !== 0 && (
                                  <Badge tone={evaluation.diffToPreviousMs < 0 ? "good" : "muted"}>
                                    {formatTimeDifference(evaluation.diffToPreviousMs)} zur BZ
                                  </Badge>
                                )}
                                {evaluation.goalReached !== null && (
                                  <Badge tone={evaluation.goalReached ? "good" : "bad"}>{evaluation.goalReached ? "Ziel ✓" : "Ziel verfehlt"}</Badge>
                                )}
                                {start.placement && <Badge tone="accent">Platz {start.placement}</Badge>}
                                {evaluation.average !== null && (
                                  <Badge tone={evaluation.average >= 4 ? "good" : evaluation.average >= 3 ? "warn" : "bad"}>
                                    Ø Note {evaluation.average.toFixed(1).replace(".", ",")}
                                  </Badge>
                                )}
                                {start.athlete_updated_at && <Badge tone="accent">Einschätzung vom Athleten</Badge>}
                              </span>
                            </button>
                            <button type="button" onClick={() => setDraft(draftFromStart(start))} className={`${buttonSecondary} py-1.5 print:hidden`}>
                              Feedback
                            </button>
                          </div>

                          {open && (
                            <div className="mt-4 grid gap-4 rounded-2xl bg-app-bg/60 p-4 md:grid-cols-2">
                              <dl className="grid grid-cols-[130px_1fr] gap-y-1.5 text-sm">
                                <dt className="text-app-muted">Meldezeit</dt>
                                <dd>
                                  {start.entry_time_ms ? formatTime(start.entry_time_ms) : "–"}{" "}
                                  {evaluation.diffToEntryMs !== null && <DiffText ms={evaluation.diffToEntryMs} />}
                                </dd>
                                <dt className="text-app-muted">Zielzeit</dt>
                                <dd>
                                  {start.goal_time_ms ? formatTime(start.goal_time_ms) : "–"}{" "}
                                  {evaluation.diffToGoalMs !== null && <DiffText ms={evaluation.diffToGoalMs} />}
                                </dd>
                                <dt className="text-app-muted">Alte Bestzeit</dt>
                                <dd>
                                  {evaluation.previous ? `${formatTime(evaluation.previous.time_ms)} (${formatDate(evaluation.previous.result_date)})` : "–"}
                                </dd>
                                {start.points !== null && (
                                  <>
                                    <dt className="text-app-muted">Punkte</dt>
                                    <dd>{start.points}</dd>
                                  </>
                                )}
                              </dl>

                              <div className="space-y-1.5">
                                {RATING_CATEGORIES.map((category) => {
                                  const value = start[category.key];

                                  return (
                                    <div key={category.key} className="flex items-center gap-2 text-sm">
                                      <span className="w-32 shrink-0 text-app-muted">{category.label}</span>
                                      <span className="h-2 flex-1 overflow-hidden rounded-full bg-app-elevated">
                                        {value && (
                                          <span
                                            className={`block h-full rounded-full ${value >= 4 ? "bg-app-good" : value === 3 ? "bg-app-warn" : "bg-app-bad"}`}
                                            style={{ width: `${value * 20}%` }}
                                          />
                                        )}
                                      </span>
                                      <span className="w-20 text-xs text-app-muted">{value ? RATING_LABELS[value] : "–"}</span>
                                    </div>
                                  );
                                })}
                              </div>

                              {pacing && (
                                <div className="md:col-span-2">
                                  <p className="text-sm font-semibold text-app-heading">Tempoanalyse</p>
                                  <div className="mt-2 flex items-end gap-1.5">
                                    {pacing.laps.map((lap) => {
                                      const max = Math.max(...pacing.laps.map((item) => item.ms));
                                      const min = Math.min(...pacing.laps.map((item) => item.ms));
                                      const height = 30 + (max === min ? 50 : ((lap.ms - min) / (max - min)) * 50);

                                      return (
                                        <div key={lap.label} className="flex flex-1 flex-col items-center gap-1">
                                          <span className="text-[11px] font-semibold text-app-heading">{formatTime(lap.ms)}</span>
                                          <span className="w-full rounded-t-md bg-app-accent/70" style={{ height }} />
                                          <span className="text-[10px] text-app-faint">{lap.label}</span>
                                        </div>
                                      );
                                    })}
                                  </div>
                                  <p className="mt-2 text-sm text-app-muted">
                                    {pacing.verdict} ({formatPercent(pacing.drop)} zweite zu erster Hälfte)
                                  </p>
                                </div>
                              )}

                              {(start.went_well || start.to_improve || start.coach_note) && (
                                <div className="grid gap-3 md:col-span-2 md:grid-cols-3">
                                  {start.went_well && (
                                    <div className="rounded-xl border border-app-good/30 bg-app-good/8 p-3 text-sm">
                                      <p className="mb-1 font-semibold text-app-good">Das lief gut</p>
                                      <RichText text={start.went_well} />
                                    </div>
                                  )}
                                  {start.to_improve && (
                                    <div className="rounded-xl border border-app-warn/30 bg-app-warn/8 p-3 text-sm">
                                      <p className="mb-1 font-semibold text-app-warn">Daran arbeiten wir</p>
                                      <RichText text={start.to_improve} />
                                    </div>
                                  )}
                                  {start.coach_note && (
                                    <div className="rounded-xl border border-app-border p-3 text-sm">
                                      <p className="mb-1 font-semibold text-app-heading">Notiz</p>
                                      <RichText text={start.coach_note} />
                                    </div>
                                  )}
                                </div>
                              )}

                              {start.athlete_updated_at && (
                                <div className="rounded-xl border border-app-accent/30 bg-app-accent/8 p-3 text-sm md:col-span-2">
                                  <p className="mb-1 font-semibold text-app-accent">Einschätzung des Athleten</p>
                                  <p className="text-app-text">
                                    Gefühl {start.athlete_feeling ?? "–"}/5 · Anstrengung {start.athlete_effort ?? "–"}/10 · Nervosität{" "}
                                    {start.athlete_nervousness ?? "–"}/5
                                  </p>
                                  {start.athlete_note && <RichText text={start.athlete_note} className="mt-1 text-app-text" />}
                                </div>
                              )}
                            </div>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </Card>
              );
            })}
          </div>
        ))}

      {/* ============ AUSWERTUNG ============ */}
      {tab === "auswertung" && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
            {kpis.map((kpi) => (
              <div key={kpi.label} className="rounded-2xl border border-app-border bg-app-surface p-4 shadow-app">
                <p className="text-xs font-medium text-app-muted">{kpi.label}</p>
                <p className={`mt-1 text-2xl font-bold ${kpi.tone ?? "text-app-heading"}`}>{kpi.value}</p>
                <p className="mt-0.5 text-[11px] text-app-faint">{kpi.hint}</p>
              </div>
            ))}
          </div>

          <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
            <Card title="Stärken & Schwächen" description="Durchschnitt deiner Noten über alle Starts (1–5)">
              <div className="space-y-2.5 p-5">
                {summary.categories.map((category) => (
                  <div key={category.key} className="flex items-center gap-3 text-sm">
                    <span className="w-32 shrink-0 text-app-text">{category.label}</span>
                    <span className="h-2.5 flex-1 overflow-hidden rounded-full bg-app-elevated">
                      {category.average !== null && (
                        <span
                          className={`block h-full rounded-full ${category.average >= 4 ? "bg-app-good" : category.average >= 3 ? "bg-app-warn" : "bg-app-bad"}`}
                          style={{ width: `${category.average * 20}%` }}
                        />
                      )}
                    </span>
                    <span className="w-16 text-right text-xs text-app-muted">
                      {category.average !== null ? `Ø ${category.average.toFixed(1).replace(".", ",")}` : "–"}
                    </span>
                  </div>
                ))}
                {summary.categories.every((category) => category.average === null) && (
                  <p className="text-sm text-app-muted">Noch keine Noten vergeben. Öffne einen Start über „Feedback“.</p>
                )}
              </div>
            </Card>

            <Card title="Trainingsschwerpunkte" description="Abgeleitet aus den schwächsten Bereichen">
              <div className="space-y-3 p-5">
                {summary.weakest.length === 0 ? (
                  <p className="text-sm text-app-muted">
                    {summary.categories.some((category) => category.average !== null)
                      ? "Keine Schwachstelle unter Ø 3,5 – stark!"
                      : "Sobald Noten vergeben sind, erscheinen hier Vorschläge."}
                  </p>
                ) : (
                  summary.weakest.map((category) => (
                    <div key={category.key} className="rounded-xl border border-app-warn/30 bg-app-warn/8 p-3">
                      <p className="font-semibold text-app-heading">{category.label}</p>
                      <p className="mt-0.5 text-sm text-app-text">{category.drill}</p>
                    </div>
                  ))
                )}
                {summary.strongest.length > 0 && (
                  <p className="text-sm text-app-muted">
                    Stärken: {summary.strongest.map((category) => category.label).join(", ")}
                  </p>
                )}
              </div>
            </Card>
          </div>

          <Card
            title="Alle Starts"
            action={
              <select
                value={standardId}
                onChange={(event) => setStandardId(event.target.value)}
                aria-label="Mit Pflichtzeiten vergleichen"
                className={`${inputClass} w-auto py-2 print:hidden`}
              >
                <option value="">Pflichtzeiten: keine</option>
                {standards.map((standard) => (
                  <option key={standard.id} value={standard.id}>
                    {standard.name} ({standard.pool_length}m)
                  </option>
                ))}
              </select>
            }
          >
            {evaluations.length === 0 ? (
              <EmptyState icon="chart" title="Noch nichts auszuwerten" />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[860px] text-left text-sm">
                  <thead className="border-b border-app-border bg-app-bg/50 text-app-muted">
                    <tr>
                      <th className="px-4 py-3 font-medium">Schwimmer</th>
                      <th className="px-4 py-3 font-medium">Strecke</th>
                      <th className="px-4 py-3 font-medium">Zeit</th>
                      <th className="px-4 py-3 font-medium">Alte BZ</th>
                      <th className="px-4 py-3 font-medium">zur BZ</th>
                      <th className="px-4 py-3 font-medium">zur Meldezeit</th>
                      <th className="px-4 py-3 font-medium">Ziel</th>
                      {selectedStandard && <th className="px-4 py-3 font-medium">Pflichtzeit</th>}
                      <th className="px-4 py-3 font-medium">Ø Note</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-app-border">
                    {[...evaluations]
                      .sort((a, b) => (a.diffToPreviousMs ?? 1e9) - (b.diffToPreviousMs ?? 1e9))
                      .map((evaluation) => {
                        const { start } = evaluation;
                        const swimmer = swimmerById.get(start.swimmer_id);

                        return (
                          <tr key={start.id}>
                            <td className="px-4 py-2.5 font-medium text-app-heading">{swimmer ? getSwimmerName(swimmer) : "–"}</td>
                            <td className="px-4 py-2.5">
                              {formatEvent(start)} <span className="text-xs text-app-faint">{start.pool_length}m</span>
                            </td>
                            <td className="px-4 py-2.5 font-semibold text-app-heading">
                              {start.status === "ok" && start.time_ms ? formatTime(start.time_ms) : STATUS_LABELS[start.status]}
                              {evaluation.isPersonalBest && <span className="ml-1.5 text-app-good">★</span>}
                            </td>
                            <td className="px-4 py-2.5 text-app-muted">{evaluation.previous ? formatTime(evaluation.previous.time_ms) : "–"}</td>
                            <td className="px-4 py-2.5">
                              <DiffText ms={evaluation.diffToPreviousMs} reference={evaluation.previous?.time_ms} />
                            </td>
                            <td className="px-4 py-2.5">
                              <DiffText ms={evaluation.diffToEntryMs} />
                            </td>
                            <td className="px-4 py-2.5">
                              {evaluation.goalReached === null ? (
                                <span className="text-app-faint">–</span>
                              ) : evaluation.goalReached ? (
                                <span className="text-app-good">✓</span>
                              ) : (
                                <DiffText ms={evaluation.diffToGoalMs} />
                              )}
                            </td>
                            {selectedStandard && (
                              <td className="px-4 py-2.5">
                                {evaluation.qualifying ? (
                                  <span className={evaluation.qualified ? "text-app-good" : "text-app-muted"}>
                                    {formatTime(evaluation.qualifying.time_ms)} {evaluation.qualified ? "✓" : ""}
                                  </span>
                                ) : (
                                  <span className="text-app-faint">–</span>
                                )}
                              </td>
                            )}
                            <td className="px-4 py-2.5">{evaluation.average !== null ? evaluation.average.toFixed(1).replace(".", ",") : "–"}</td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* ============ STAFFELN ============ */}
      {tab === "staffeln" && (
        <RelayPanel competitionId={competitionId} defaultDate={competition.start_date} swimmers={swimmers} results={results} />
      )}

      {/* ============ FAZIT ============ */}
      {tab === "fazit" && (
        <Card
          title="Fazit zum Wettkampf"
          description="Dein Gesamteindruck – z. B. für die Trainerbesprechung oder die Eltern-Info."
          action={
            <button type="button" onClick={suggestSummary} className={`${buttonSecondary} print:hidden`}>
              Vorschlag aus der Auswertung
            </button>
          }
        >
          <form onSubmit={saveReview} className="space-y-4 p-5">
            <FormField label="Zusammenfassung">
              <textarea value={review.summary} onChange={(event) => setReview({ ...review, summary: event.target.value })} rows={3} className={inputClass} />
            </FormField>
            <div className="grid gap-4 md:grid-cols-2">
              <FormField label="Das lief gut">
                <textarea value={review.went_well} onChange={(event) => setReview({ ...review, went_well: event.target.value })} rows={4} className={inputClass} />
              </FormField>
              <FormField label="Daran arbeiten wir">
                <textarea value={review.to_improve} onChange={(event) => setReview({ ...review, to_improve: event.target.value })} rows={4} className={inputClass} />
              </FormField>
            </div>
            <FormField label="Nächste Schritte im Training">
              <textarea value={review.next_steps} onChange={(event) => setReview({ ...review, next_steps: event.target.value })} rows={4} className={inputClass} />
            </FormField>
            <div className="flex justify-end print:hidden">
              <button type="submit" className={buttonPrimary}>
                Fazit speichern
              </button>
            </div>
          </form>
        </Card>
      )}

      {/* ============ PROTOKOLL-IMPORT ============ */}
      <ProtocolImport
        open={showImport}
        onClose={() => setShowImport(false)}
        competitionId={competitionId}
        defaultDate={competition.start_date}
        swimmers={swimmers}
        existingStarts={starts}
        eventsByNumber={eventsByNumber}
        onImported={async (count) => {
          setShowImport(false);
          setTab("starts");
          setMessage({ tone: "good", text: `${count} Starts aus dem Protokoll übernommen ✅ – jetzt kannst du Feedback ergänzen.` });
          await loadData();
        }}
      />

      {/* ============ START ERFASSEN / FEEDBACK ============ */}
      <Modal open={Boolean(draft)} title={draft?.id ? "Start & Feedback" : "Start erfassen"} onClose={() => setDraft(null)} wide>
        {draft && (
          <form onSubmit={handleSave} className="space-y-6">
            <section className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField label="Schwimmer *">
                  <select value={draft.swimmerId} onChange={(event) => updateDraft("swimmerId", event.target.value)} required className={inputClass}>
                    <option value="">– auswählen –</option>
                    {swimmers.map((swimmer) => (
                      <option key={swimmer.id} value={swimmer.id}>
                        {getSwimmerName(swimmer)}
                      </option>
                    ))}
                  </select>
                </FormField>

                {events.length > 0 && (
                  <FormField label="Aus der Wettkampffolge">
                    <select value={draft.eventId} onChange={(event) => updateDraft("eventId", event.target.value)} className={inputClass}>
                      <option value="">– selbst eintragen –</option>
                      {events.map((event) => (
                        <option key={event.id} value={event.id}>
                          {event.label}
                        </option>
                      ))}
                    </select>
                  </FormField>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
                <FormField label="Lage">
                  <select value={draft.stroke} onChange={(event) => updateDraft("stroke", event.target.value as Stroke)} className={inputClass}>
                    {STROKES.map((stroke) => (
                      <option key={stroke.value} value={stroke.value}>
                        {stroke.label}
                      </option>
                    ))}
                  </select>
                </FormField>
                <FormField label="Strecke">
                  <select value={draft.distance} onChange={(event) => updateDraft("distance", event.target.value)} className={inputClass}>
                    {getDistancesForStroke(draft.stroke).map((distance) => (
                      <option key={distance} value={distance}>
                        {distance} m
                      </option>
                    ))}
                  </select>
                </FormField>
                <FormField label="Bahn">
                  <select value={draft.poolLength} onChange={(event) => updateDraft("poolLength", Number(event.target.value) as PoolLength)} className={inputClass}>
                    <option value={50}>50 m</option>
                    <option value={25}>25 m</option>
                  </select>
                </FormField>
                <FormField label="Lauf">
                  <select value={draft.round} onChange={(event) => updateDraft("round", event.target.value)} className={inputClass}>
                    <option value="">–</option>
                    {ROUNDS.map((round) => (
                      <option key={round} value={round}>
                        {round}
                      </option>
                    ))}
                  </select>
                </FormField>
                <FormField label="Datum">
                  <input type="date" value={draft.date} onChange={(event) => updateDraft("date", event.target.value)} required className={inputClass} />
                </FormField>
              </div>
            </section>

            <section className="space-y-4 rounded-2xl border border-app-border p-4">
              <p className="font-semibold text-app-heading">Zeiten</p>
              {(() => {
                const suggestion = draft.swimmerId
                  ? suggestTimes(results, {
                      swimmer_id: draft.swimmerId,
                      distance: Number(draft.distance),
                      stroke: draft.stroke,
                      pool_length: draft.poolLength,
                      start_date: draft.date,
                    })
                  : null;

                if (!suggestion) return null;

                return (
                  <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-app-accent/8 px-3 py-2 text-sm">
                    <span className="text-app-text">
                      Vorschlag: Meldezeit <b>{formatTime(suggestion.entryMs)}</b> (Bestzeit vom {formatDate(suggestion.best.result_date)}) · Zielzeit{" "}
                      <b>{formatTime(suggestion.goalMs)}</b> (−1 %)
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setDraft((current) =>
                          current
                            ? {
                                ...current,
                                entryTime: current.entryTime || formatTime(suggestion.entryMs),
                                goalTime: formatTime(suggestion.goalMs),
                              }
                            : current
                        )
                      }
                      className={`${buttonGhost} text-app-accent`}
                    >
                      Übernehmen
                    </button>
                  </div>
                );
              })()}
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <FormField label="Meldezeit">
                  <input type="text" inputMode="decimal" value={draft.entryTime} onChange={(event) => updateDraft("entryTime", event.target.value)} placeholder="1:05,00" className={inputClass} />
                </FormField>
                <FormField label="Zielzeit">
                  <input type="text" inputMode="decimal" value={draft.goalTime} onChange={(event) => updateDraft("goalTime", event.target.value)} placeholder="1:03,50" className={inputClass} />
                </FormField>
                <FormField label="Endzeit">
                  <input type="text" inputMode="decimal" value={draft.time} onChange={(event) => updateDraft("time", event.target.value)} placeholder="1:03,19" className={inputClass} />
                </FormField>
                <FormField label="Status">
                  <select value={draft.status} onChange={(event) => updateDraft("status", event.target.value as StartStatus)} className={inputClass}>
                    {(Object.keys(STATUS_LABELS) as StartStatus[]).map((status) => (
                      <option key={status} value={status}>
                        {STATUS_LABELS[status]}
                      </option>
                    ))}
                  </select>
                </FormField>
              </div>
              <div className="grid gap-3 sm:grid-cols-[1fr_100px_100px]">
                <FormField label="Zwischenzeiten" hint="Durchgangszeiten nacheinander, z. B. „30,12  1:03,50  1:37,20“ – daraus entsteht die Tempoanalyse.">
                  <input type="text" value={draft.splits} onChange={(event) => updateDraft("splits", event.target.value)} className={inputClass} />
                </FormField>
                <FormField label="Platz">
                  <input type="number" min={1} value={draft.placement} onChange={(event) => updateDraft("placement", event.target.value)} className={inputClass} />
                </FormField>
                <FormField label="Punkte">
                  <input type="number" min={0} value={draft.points} onChange={(event) => updateDraft("points", event.target.value)} className={inputClass} />
                </FormField>
              </div>
              {draft.time && draft.splits && (() => {
                const splits = parseSplits(draft.splits);
                const final = parseSwimTimeToMs(draft.time);
                const laps = splits && final ? lapTimes({ split_times_ms: splits, time_ms: final, distance: Number(draft.distance) } as CompetitionStart) : [];

                return laps.length > 1 ? (
                  <p className="text-xs text-app-muted">Teilzeiten: {laps.map((lap) => `${lap.label}: ${formatTime(lap.ms)}`).join(" · ")}</p>
                ) : null;
              })()}
            </section>

            <section className="space-y-3 rounded-2xl border border-app-border p-4">
              <p className="font-semibold text-app-heading">
                Bewertung <span className="text-sm font-normal text-app-muted">1 = schwach … 5 = sehr gut, nochmal klicken zum Entfernen</span>
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                {RATING_CATEGORIES.map((category) => (
                  <div key={category.key} className="flex items-center justify-between gap-3">
                    <span className="text-sm text-app-text">{category.label}</span>
                    <RatingPicker
                      value={draft.ratings[category.key]}
                      onChange={(value) => updateDraft("ratings", { ...draft.ratings, [category.key]: value })}
                    />
                  </div>
                ))}
              </div>
            </section>

            <section className="grid gap-4 sm:grid-cols-2">
              <FormField label="Das lief gut">
                <textarea value={draft.wentWell} onChange={(event) => updateDraft("wentWell", event.target.value)} rows={3} className={inputClass} />
              </FormField>
              <FormField label="Daran arbeiten wir">
                <textarea value={draft.toImprove} onChange={(event) => updateDraft("toImprove", event.target.value)} rows={3} className={inputClass} />
              </FormField>
              <FormField label="Notiz" className="sm:col-span-2">
                <textarea value={draft.coachNote} onChange={(event) => updateDraft("coachNote", event.target.value)} rows={2} className={inputClass} />
              </FormField>
              <label className="flex items-center gap-2 text-sm text-app-text sm:col-span-2">
                <input type="checkbox" checked={draft.shared} onChange={(event) => updateDraft("shared", event.target.checked)} />
                Feedback für den Athleten sichtbar (wenn sein Login verknüpft ist)
              </label>
            </section>

            <div className="flex flex-wrap justify-between gap-2 border-t border-app-border pt-4">
              {draft.id ? (
                <button
                  type="button"
                  onClick={() => {
                    const start = starts.find((item) => item.id === draft.id);
                    if (start) handleDelete(start);
                  }}
                  className={`${buttonGhost} text-app-bad`}
                >
                  Löschen
                </button>
              ) : (
                <span />
              )}
              <div className="flex gap-2">
                <button type="button" onClick={() => setDraft(null)} className={buttonSecondary}>
                  Abbrechen
                </button>
                <button type="submit" disabled={saving} className={buttonPrimary}>
                  {saving ? "Speichern..." : "Speichern"}
                </button>
              </div>
            </div>
          </form>
        )}
      </Modal>
    </main>
  );
}
