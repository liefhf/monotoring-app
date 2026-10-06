"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import {
  Gender,
  PoolLength,
  STROKES,
  Swimmer,
  SwimmerResult,
  findBestResult,
  formatDate,
  formatStroke,
  formatTime,
  formatTimeDifference,
  getSwimmerName,
  parseSwimTimeToMs,
} from "@/lib/swim";
import { RATING_LABELS, STATUS_LABELS, StartStatus, strokeFromText } from "@/lib/competitionFeedback";
import {
  LegStroke,
  RELAY_COLUMNS,
  Relay,
  RelayLeg,
  RelayType,
  exchangeVerdict,
  formatExchange,
  legStrokes,
  relayLabel,
  suggestLineup,
  sumOfSplits,
} from "@/lib/relays";
import { Icon } from "@/components/icons";
import { Card, EmptyState, FormField, Modal, Notice, RichText, buttonGhost, buttonPrimary, buttonSecondary, inputClass } from "@/components/ui";

/*
 * Staffeln im Wettkampf-Feedback: Aufstellung, Teil- und
 * Wechselzeiten, Bewertung der Wechsel und Aufstellungshelfer.
 */

type RelayEventOption = { id: string; label: string; legCount: number; legDistance: number; type: RelayType; date: string };

type LegDraft = { swimmerId: string; stroke: LegStroke; split: string; exchange: string };

type Draft = {
  id: string | null;
  eventId: string;
  name: string;
  date: string;
  poolLength: PoolLength;
  type: RelayType;
  legDistance: string;
  legs: LegDraft[];
  time: string;
  status: StartStatus;
  placement: string;
  points: string;
  ratingExchanges: number | null;
  wentWell: string;
  toImprove: string;
};

const TONE_CLASSES = {
  good: "bg-app-good/15 text-app-good",
  warn: "bg-app-warn/15 text-app-warn",
  bad: "bg-app-bad/15 text-app-bad",
};

/* "0,25" / "-0,02" / "+0.3" (Sekunden) -> ms */
function parseExchange(value: string) {
  const clean = value.trim().replace(",", ".").replace("−", "-");

  if (!clean) return { ok: true, ms: null as number | null };

  const seconds = Number(clean);

  if (Number.isNaN(seconds) || seconds < -2 || seconds > 5) return { ok: false, ms: null };

  return { ok: true, ms: Math.round(seconds * 1000) };
}

function emptyLegs(type: RelayType, count = 4): LegDraft[] {
  return legStrokes(type, count).map((stroke) => ({ swimmerId: "", stroke, split: "", exchange: "" }));
}

export default function RelayPanel({
  competitionId,
  defaultDate,
  swimmers,
  results,
}: {
  competitionId: string;
  defaultDate: string;
  swimmers: Swimmer[];
  results: SwimmerResult[];
}) {
  const [relays, setRelays] = useState<Relay[]>([]);
  const [events, setEvents] = useState<RelayEventOption[]>([]);
  const [available, setAvailable] = useState(true);
  const [message, setMessage] = useState<{ tone: "good" | "bad" | "warn"; text: string } | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [lineupGender, setLineupGender] = useState<"" | Gender>("");
  const [saving, setSaving] = useState(false);

  const swimmerById = useMemo(() => new Map(swimmers.map((swimmer) => [swimmer.id, swimmer])), [swimmers]);

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from("competition_relays")
      .select(RELAY_COLUMNS)
      .eq("competition_id", competitionId)
      .order("start_date");

    if (error) {
      setAvailable(false);
      return;
    }

    setRelays((data ?? []) as Relay[]);

    const { data: sections } = await supabase.from("competition_sections").select("id, section_date").eq("competition_id", competitionId);

    if (!sections?.length) return;

    const { data: eventData } = await supabase
      .from("competition_events")
      .select("id, section_id, event_number, distance_m, relay_count, stroke, gender")
      .in("section_id", sections.map((section) => section.id))
      .gt("relay_count", 1)
      .order("event_number");

    setEvents(
      ((eventData ?? []) as { id: string; section_id: string; event_number: number; distance_m: number; relay_count: number; stroke: string; gender: string }[]).map(
        (event) => ({
          id: event.id,
          label: `WK ${event.event_number} · ${event.relay_count}×${event.distance_m} m ${event.stroke} (${event.gender === "female" ? "w" : event.gender === "male" ? "m" : "mix"})`,
          legCount: event.relay_count,
          legDistance: event.distance_m,
          type: strokeFromText(event.stroke) === "medley" ? "medley" : "freestyle",
          date: sections.find((section) => section.id === event.section_id)?.section_date ?? defaultDate,
        })
      )
    );
  }, [competitionId, defaultDate]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Daten beim Oeffnen laden
    load();
  }, [load]);

  const bestFor = (swimmerId: string, stroke: LegStroke, distance: number, pool: PoolLength) =>
    findBestResult(
      results.filter((result) => result.swimmer_id === swimmerId),
      { distance, stroke },
      pool
    );

  function newDraft(): Draft {
    return {
      id: null,
      eventId: "",
      name: "",
      date: defaultDate,
      poolLength: 50,
      type: "freestyle",
      legDistance: "100",
      legs: emptyLegs("freestyle"),
      time: "",
      status: "ok",
      placement: "",
      points: "",
      ratingExchanges: null,
      wentWell: "",
      toImprove: "",
    };
  }

  function draftFromRelay(relay: Relay): Draft {
    const legs = [...(relay.competition_relay_legs ?? [])].sort((a, b) => a.leg_number - b.leg_number);

    return {
      id: relay.id,
      eventId: relay.event_id ?? "",
      name: relay.name ?? "",
      date: relay.start_date,
      poolLength: relay.pool_length,
      type: relay.relay_type,
      legDistance: `${relay.leg_distance}`,
      legs: legs.map((leg) => ({
        swimmerId: leg.swimmer_id,
        stroke: leg.stroke,
        split: leg.split_ms ? formatTime(leg.split_ms) : "",
        exchange: leg.exchange_ms !== null ? (leg.exchange_ms / 1000).toFixed(2).replace(".", ",") : "",
      })),
      time: relay.time_ms ? formatTime(relay.time_ms) : "",
      status: relay.status,
      placement: relay.placement ? `${relay.placement}` : "",
      points: relay.points !== null ? `${relay.points}` : "",
      ratingExchanges: relay.rating_exchanges,
      wentWell: relay.went_well ?? "",
      toImprove: relay.to_improve ?? "",
    };
  }

  function update<K extends keyof Draft>(key: K, value: Draft[K]) {
    setDraft((current) => {
      if (!current) return current;

      const next = { ...current, [key]: value };

      if (key === "type") {
        const strokes = legStrokes(value as RelayType, current.legs.length);
        next.legs = current.legs.map((leg, index) => ({ ...leg, stroke: strokes[index] }));
      }

      if (key === "eventId") {
        const event = events.find((item) => item.id === value);

        if (event) {
          next.type = event.type;
          next.legDistance = `${event.legDistance}`;
          next.date = event.date;
          next.legs = emptyLegs(event.type, event.legCount).map((leg, index) => ({ ...leg, ...current.legs[index], stroke: leg.stroke }));
        }
      }

      return next;
    });
  }

  function updateLeg(index: number, patch: Partial<LegDraft>) {
    setDraft((current) =>
      current ? { ...current, legs: current.legs.map((leg, legIndex) => (legIndex === index ? { ...leg, ...patch } : leg)) } : current
    );
  }

  function applySuggestion() {
    if (!draft) return;

    const pool = lineupGender ? swimmers.filter((swimmer) => swimmer.gender === lineupGender) : swimmers;
    const suggestion = suggestLineup(pool, results, draft.type, Number(draft.legDistance), draft.poolLength, draft.legs.length);

    if (!suggestion) {
      setMessage({ tone: "warn", text: "Für einen Vorschlag fehlen Bestzeiten über diese Strecke auf dieser Bahn." });
      return;
    }

    setDraft({
      ...draft,
      legs: suggestion.legs.map((leg, index) => ({ ...draft.legs[index], swimmerId: leg.swimmer.id, stroke: leg.stroke })),
    });
    setMessage({ tone: "good", text: `Vorschlag übernommen – Summe der Bestzeiten ${formatTime(suggestion.totalMs)}.` });
  }

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!draft) return;

    const time = draft.time.trim() ? parseSwimTimeToMs(draft.time) : null;

    if (draft.time.trim() && time === null) {
      setMessage({ tone: "bad", text: "Die Endzeit ist nicht lesbar." });
      return;
    }

    if (draft.status === "ok" && !time) {
      setMessage({ tone: "bad", text: "Für eine gewertete Staffel brauche ich die Endzeit." });
      return;
    }

    const chosen = draft.legs.filter((leg) => leg.swimmerId);

    if (new Set(chosen.map((leg) => leg.swimmerId)).size !== chosen.length) {
      setMessage({ tone: "bad", text: "Ein Schwimmer steht doppelt in der Aufstellung." });
      return;
    }

    const legs: Omit<RelayLeg, "relay_id">[] = [];

    for (const [index, leg] of draft.legs.entries()) {
      if (!leg.swimmerId) continue;

      const split = leg.split.trim() ? parseSwimTimeToMs(leg.split) : null;
      const exchange = parseExchange(leg.exchange);

      if ((leg.split.trim() && split === null) || !exchange.ok) {
        setMessage({ tone: "bad", text: `Position ${index + 1}: Teil- oder Wechselzeit nicht lesbar (Wechsel in Sekunden, z. B. 0,25).` });
        return;
      }

      legs.push({ leg_number: index + 1, swimmer_id: leg.swimmerId, stroke: leg.stroke, split_ms: split, exchange_ms: index === 0 ? null : exchange.ms });
    }

    const payload = {
      competition_id: competitionId,
      event_id: draft.eventId || null,
      name: draft.name.trim() || null,
      start_date: draft.date,
      pool_length: draft.poolLength,
      relay_type: draft.type,
      leg_distance: Number(draft.legDistance),
      leg_count: draft.legs.length,
      time_ms: time,
      status: draft.status,
      placement: draft.placement.trim() ? Number(draft.placement) : null,
      points: draft.points.trim() ? Number(draft.points) : null,
      rating_exchanges: draft.ratingExchanges,
      went_well: draft.wentWell.trim() || null,
      to_improve: draft.toImprove.trim() || null,
    };

    setSaving(true);

    const saved = draft.id
      ? await supabase.from("competition_relays").update(payload).eq("id", draft.id).select("id").single()
      : await supabase.from("competition_relays").insert(payload).select("id").single();

    if (saved.error || !saved.data) {
      setSaving(false);
      setMessage({ tone: "bad", text: `Staffel konnte nicht gespeichert werden: ${saved.error?.message}` });
      return;
    }

    const relayId = saved.data.id as string;

    /* Aufstellung komplett ersetzen - einfacher als einzeln abgleichen */
    await supabase.from("competition_relay_legs").delete().eq("relay_id", relayId);

    if (legs.length > 0) {
      const { error } = await supabase.from("competition_relay_legs").insert(legs.map((leg) => ({ ...leg, relay_id: relayId })));

      if (error) {
        setSaving(false);
        setMessage({ tone: "bad", text: `Aufstellung konnte nicht gespeichert werden: ${error.message}` });
        return;
      }
    }

    setSaving(false);
    setDraft(null);
    setMessage({ tone: "good", text: "Staffel gespeichert ✅ – das Ergebnis steht jetzt auch bei den Schwimmern." });
    await load();
  }

  async function handleDelete(relay: Relay) {
    if (!window.confirm("Diese Staffel löschen?")) return;

    await supabase.from("competition_relays").delete().eq("id", relay.id);
    setDraft(null);
    await load();
  }

  if (!available) {
    return (
      <Notice tone="warn">
        Staffeln sind noch nicht eingerichtet. Bitte führe supabase/staffeln.sql im Supabase SQL-Editor aus.
      </Notice>
    );
  }

  return (
    <div className="space-y-5">
      {message && <Notice tone={message.tone}>{message.text}</Notice>}

      <div className="flex justify-end print:hidden">
        <button type="button" onClick={() => setDraft(newDraft())} className={buttonPrimary}>
          <Icon name="plus" className="h-4 w-4" />
          Staffel erfassen
        </button>
      </div>

      {relays.length === 0 ? (
        <Card>
          <EmptyState icon="teams" title="Noch keine Staffeln erfasst">
            Trag Aufstellung, Teilzeiten und Wechselzeiten ein – oder lass dir die schnellste Aufstellung vorschlagen.
          </EmptyState>
        </Card>
      ) : (
        relays.map((relay) => {
          const legs = [...(relay.competition_relay_legs ?? [])].sort((a, b) => a.leg_number - b.leg_number);
          const splitSum = sumOfSplits(legs);

          return (
            <Card
              key={relay.id}
              title={`${relayLabel(relay)}${relay.name ? ` – ${relay.name}` : ""}`}
              description={`${formatDate(relay.start_date)} · ${relay.pool_length}m-Bahn`}
              action={
                <div className="flex items-center gap-3">
                  <span className="text-xl font-bold text-app-heading">
                    {relay.status === "ok" && relay.time_ms ? formatTime(relay.time_ms) : STATUS_LABELS[relay.status]}
                  </span>
                  {relay.placement && (
                    <span className="rounded-full bg-app-accent/12 px-2 py-0.5 text-xs font-semibold text-app-accent">Platz {relay.placement}</span>
                  )}
                  <button type="button" onClick={() => setDraft(draftFromRelay(relay))} className={`${buttonSecondary} py-1.5 print:hidden`}>
                    Bearbeiten
                  </button>
                </div>
              }
            >
              <div className="overflow-x-auto">
                <table className="w-full min-w-[680px] text-left text-sm">
                  <thead className="border-b border-app-border bg-app-bg/50 text-app-muted">
                    <tr>
                      <th className="px-4 py-2.5 font-medium">Pos.</th>
                      <th className="px-4 py-2.5 font-medium">Schwimmer</th>
                      <th className="px-4 py-2.5 font-medium">Lage</th>
                      <th className="px-4 py-2.5 font-medium">Teilzeit</th>
                      <th className="px-4 py-2.5 font-medium">Einzel-BZ</th>
                      <th className="px-4 py-2.5 font-medium">Wechsel</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-app-border">
                    {legs.map((leg) => {
                      const swimmer = swimmerById.get(leg.swimmer_id);
                      const best = bestFor(leg.swimmer_id, leg.stroke, relay.leg_distance, relay.pool_length);
                      const verdict = exchangeVerdict(leg.exchange_ms);

                      return (
                        <tr key={leg.leg_number}>
                          <td className="px-4 py-2.5 font-semibold text-app-heading">{leg.leg_number}.</td>
                          <td className="px-4 py-2.5 text-app-heading">{swimmer ? getSwimmerName(swimmer) : "–"}</td>
                          <td className="px-4 py-2.5">{formatStroke(leg.stroke)}</td>
                          <td className="px-4 py-2.5 font-semibold text-app-heading">{leg.split_ms ? formatTime(leg.split_ms) : "–"}</td>
                          <td className="px-4 py-2.5">
                            {best ? (
                              <>
                                {formatTime(best.time_ms)}{" "}
                                {leg.split_ms && (
                                  <span className={leg.split_ms <= best.time_ms ? "text-app-good" : "text-app-muted"}>
                                    ({formatTimeDifference(leg.split_ms - best.time_ms)})
                                  </span>
                                )}
                              </>
                            ) : (
                              <span className="text-app-faint">–</span>
                            )}
                          </td>
                          <td className="px-4 py-2.5">
                            {leg.leg_number === 1 ? (
                              <span className="text-app-faint">Startsprung</span>
                            ) : leg.exchange_ms !== null && verdict ? (
                              <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${TONE_CLASSES[verdict.tone]}`}>
                                {formatExchange(leg.exchange_ms)} · {verdict.label}
                              </span>
                            ) : (
                              <span className="text-app-faint">–</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div className="space-y-2 border-t border-app-border px-5 py-3 text-sm">
                {splitSum && relay.time_ms && Math.abs(splitSum - relay.time_ms) > 20 && (
                  <p className="text-app-warn">
                    Summe der Teilzeiten ({formatTime(splitSum)}) weicht von der Endzeit ab – bitte prüfen.
                  </p>
                )}
                {relay.rating_exchanges && <p className="text-app-muted">Wechsel insgesamt: {RATING_LABELS[relay.rating_exchanges]}</p>}
                {relay.went_well && <RichText text={`👍 ${relay.went_well}`} className="text-app-text" />}
                {relay.to_improve && <RichText text={`🎯 ${relay.to_improve}`} className="text-app-text" />}
                <p className="text-xs text-app-faint">
                  Einzel-BZ ist mit Startsprung geschwommen – Staffelteilzeiten ab Position 2 sind durch den fliegenden Start meist 0,5–0,8 s schneller.
                </p>
              </div>
            </Card>
          );
        })
      )}

      <Modal open={Boolean(draft)} title={draft?.id ? "Staffel bearbeiten" : "Staffel erfassen"} onClose={() => setDraft(null)} wide>
        {draft && (
          <form onSubmit={handleSave} className="space-y-5">
            {events.length > 0 && (
              <FormField label="Aus der Wettkampffolge">
                <select value={draft.eventId} onChange={(event) => update("eventId", event.target.value)} className={inputClass}>
                  <option value="">– selbst eintragen –</option>
                  {events.map((event) => (
                    <option key={event.id} value={event.id}>
                      {event.label}
                    </option>
                  ))}
                </select>
              </FormField>
            )}

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
              <FormField label="Art">
                <select value={draft.type} onChange={(event) => update("type", event.target.value as RelayType)} className={inputClass}>
                  <option value="freestyle">Freistil</option>
                  <option value="medley">Lagen</option>
                </select>
              </FormField>
              <FormField label="Strecke je Schwimmer">
                <select value={draft.legDistance} onChange={(event) => update("legDistance", event.target.value)} className={inputClass}>
                  {[25, 50, 100, 200].map((distance) => (
                    <option key={distance} value={distance}>
                      {distance} m
                    </option>
                  ))}
                </select>
              </FormField>
              <FormField label="Bahn">
                <select value={draft.poolLength} onChange={(event) => update("poolLength", Number(event.target.value) as PoolLength)} className={inputClass}>
                  <option value={50}>50 m</option>
                  <option value={25}>25 m</option>
                </select>
              </FormField>
              <FormField label="Datum">
                <input type="date" value={draft.date} onChange={(event) => update("date", event.target.value)} required className={inputClass} />
              </FormField>
              <FormField label="Name (optional)">
                <input type="text" value={draft.name} onChange={(event) => update("name", event.target.value)} placeholder="z. B. Mixed 1" className={inputClass} />
              </FormField>
            </div>

            <section className="space-y-3 rounded-2xl border border-app-border p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-semibold text-app-heading">Aufstellung</p>
                <div className="flex items-center gap-2">
                  <select
                    value={lineupGender}
                    onChange={(event) => setLineupGender(event.target.value as "" | Gender)}
                    aria-label="Für den Vorschlag nur"
                    className={`${inputClass} w-auto py-1.5`}
                  >
                    <option value="">alle Schwimmer</option>
                    <option value="female">nur weiblich</option>
                    <option value="male">nur männlich</option>
                  </select>
                  <button type="button" onClick={applySuggestion} className={`${buttonSecondary} py-1.5`}>
                    Schnellste Aufstellung vorschlagen
                  </button>
                </div>
              </div>

              {draft.legs.map((leg, index) => {
                const best = leg.swimmerId ? bestFor(leg.swimmerId, leg.stroke, Number(draft.legDistance), draft.poolLength) : null;

                return (
                  <div key={index} className="grid grid-cols-2 items-end gap-2 rounded-xl bg-app-bg/60 p-3 sm:grid-cols-[40px_1.4fr_1fr_110px_110px]">
                    <span className="self-center text-lg font-bold text-app-heading">{index + 1}.</span>
                    <FormField label="Schwimmer">
                      <select value={leg.swimmerId} onChange={(event) => updateLeg(index, { swimmerId: event.target.value })} className={inputClass}>
                        <option value="">–</option>
                        {swimmers.map((swimmer) => (
                          <option key={swimmer.id} value={swimmer.id}>
                            {getSwimmerName(swimmer)}
                          </option>
                        ))}
                      </select>
                    </FormField>
                    <FormField label="Lage" hint={best ? `BZ ${formatTime(best.time_ms)}` : undefined}>
                      <select
                        value={leg.stroke}
                        onChange={(event) => updateLeg(index, { stroke: event.target.value as LegStroke })}
                        disabled={draft.type === "freestyle"}
                        className={inputClass}
                      >
                        {STROKES.filter((stroke) => stroke.value !== "medley").map((stroke) => (
                          <option key={stroke.value} value={stroke.value}>
                            {stroke.label}
                          </option>
                        ))}
                      </select>
                    </FormField>
                    <FormField label="Teilzeit">
                      <input type="text" inputMode="decimal" value={leg.split} onChange={(event) => updateLeg(index, { split: event.target.value })} placeholder="1:02,40" className={inputClass} />
                    </FormField>
                    <FormField label="Wechsel (s)">
                      <input
                        type="text"
                        inputMode="decimal"
                        value={index === 0 ? "" : leg.exchange}
                        onChange={(event) => updateLeg(index, { exchange: event.target.value })}
                        disabled={index === 0}
                        placeholder={index === 0 ? "Start" : "0,25"}
                        className={inputClass}
                      />
                    </FormField>
                  </div>
                );
              })}
              <p className="text-xs text-app-faint">
                Wechselzeit = Reaktion des nächsten Schwimmers beim Anschlag (steht im Protokoll, z. B. „0,25“). Unter −0,03 droht die Disqualifikation.
              </p>
            </section>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <FormField label="Endzeit">
                <input type="text" inputMode="decimal" value={draft.time} onChange={(event) => update("time", event.target.value)} placeholder="4:12,80" className={inputClass} />
              </FormField>
              <FormField label="Status">
                <select value={draft.status} onChange={(event) => update("status", event.target.value as StartStatus)} className={inputClass}>
                  {(Object.keys(STATUS_LABELS) as StartStatus[]).map((status) => (
                    <option key={status} value={status}>
                      {STATUS_LABELS[status]}
                    </option>
                  ))}
                </select>
              </FormField>
              <FormField label="Platz">
                <input type="number" min={1} value={draft.placement} onChange={(event) => update("placement", event.target.value)} className={inputClass} />
              </FormField>
              <FormField label="Punkte">
                <input type="number" min={0} value={draft.points} onChange={(event) => update("points", event.target.value)} className={inputClass} />
              </FormField>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <span className="text-sm text-app-text">Wechsel insgesamt:</span>
              {[1, 2, 3, 4, 5].map((score) => (
                <button
                  key={score}
                  type="button"
                  onClick={() => update("ratingExchanges", draft.ratingExchanges === score ? null : score)}
                  className={`rounded-lg border px-2.5 py-1 text-xs transition ${
                    draft.ratingExchanges === score ? "border-app-accent bg-app-accent text-app-accent-ink" : "border-app-border text-app-text hover:bg-app-elevated"
                  }`}
                >
                  {score} {RATING_LABELS[score]}
                </button>
              ))}
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <FormField label="Das lief gut">
                <textarea value={draft.wentWell} onChange={(event) => update("wentWell", event.target.value)} rows={2} className={inputClass} />
              </FormField>
              <FormField label="Daran arbeiten wir">
                <textarea value={draft.toImprove} onChange={(event) => update("toImprove", event.target.value)} rows={2} className={inputClass} />
              </FormField>
            </div>

            <div className="flex flex-wrap justify-between gap-2 border-t border-app-border pt-4">
              {draft.id ? (
                <button
                  type="button"
                  onClick={() => {
                    const relay = relays.find((item) => item.id === draft.id);
                    if (relay) handleDelete(relay);
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
    </div>
  );
}
