"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { fetchAll } from "@/lib/fetchAll";
import { Card, EmptyState, FormField, Notice, PageHeader, buttonSecondary, inputClass } from "@/components/ui";
import {
  NonFinish,
  QualifyingStandard,
  QualifyingTime,
  RESULT_COLUMNS,
  STROKES,
  Swimmer,
  SwimmerResult,
  formatEvent,
  formatEventShort,
  formatMonthShort,
  formatTime,
  formatTimeDifference,
  getSwimmerName,
  splitResults,
} from "@/lib/swim";
import { MeetStart, evaluateMeet, listMeets } from "@/lib/meetReport";
import { CalendarEntry } from "@/lib/community";
import { describeCompetition, focusFromRow, loadNonFinishes, loadUpcomingCompetitions } from "@/lib/nextCompetition";
import { buildAthleteSheet, monthYearShort } from "@/lib/nextMeetSheet";
import { openMeetPdf } from "@/lib/meetPdf";
import { RoleBadge } from "@/components/FocusBadge";
import NonFinishCard from "@/components/NonFinishCard";

/*
 * Wettkampf-Auswertung aus den eingetragenen Ergebnissen
 * (auch DSV-Uebernahmen): Bestzeiten, Verbesserungen, Punkte
 * und Abstand zur gewaehlten Pflichtzeiten-Liste.
 */

const STROKE_ORDER = STROKES.map((stroke) => stroke.value);

function monthLabel(month: string) {
  return `${formatMonthShort(`${month}-01`)} ${month.slice(0, 4)}`;
}

function percentFaster(start: MeetStart) {
  return start.previousBest ? (-start.previousDiff! / start.previousBest.time_ms) * 100 : 0;
}

export default function WettkampfAuswertungPage() {
  const [swimmers, setSwimmers] = useState<Swimmer[]>([]);
  const [results, setResults] = useState<SwimmerResult[]>([]);
  const [standards, setStandards] = useState<QualifyingStandard[]>([]);
  const [times, setTimes] = useState<QualifyingTime[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [meetKey, setMeetKey] = useState("");
  const [standardId, setStandardId] = useState("");
  const [nonFinishes, setNonFinishes] = useState<NonFinish[]>([]);
  const [missingTable, setMissingTable] = useState(false);
  const [upcoming, setUpcoming] = useState<CalendarEntry[]>([]);
  const [today] = useState(() => new Date().toISOString().slice(0, 10));

  function reloadNonFinishes() {
    loadNonFinishes().then(({ rows, missingTable: missing }) => {
      setNonFinishes(rows);
      setMissingTable(missing);
    });
  }

  useEffect(() => {
    async function load() {
      const [swimmerResponse, resultResponse, standardResponse, timeResponse] = await Promise.all([
        supabase.from("swimmers").select("*"),
        fetchAll(() => supabase.from("swimmer_results").select(RESULT_COLUMNS)),
        supabase.from("qualifying_standards").select("*").order("created_at", { ascending: false }),
        supabase.from("qualifying_times").select("id, standard_id, gender, birth_year_from, birth_year_to, distance, stroke, time_ms"),
      ]);

      const error = swimmerResponse.error ?? resultResponse.error ?? standardResponse.error ?? timeResponse.error;
      if (error) setMessage(`Daten konnten nicht geladen werden: ${error.message}`);

      const loadedStandards = (standardResponse.data ?? []) as QualifyingStandard[];
      setSwimmers((swimmerResponse.data ?? []) as Swimmer[]);
      setResults(splitResults((resultResponse.data ?? []) as Record<string, unknown>[]).pool);
      setStandards(loadedStandards);
      setTimes((timeResponse.data ?? []) as QualifyingTime[]);
      setStandardId(loadedStandards[0]?.id ?? "");
      setLoading(false);
    }

    load();
    reloadNonFinishes();
    loadUpcomingCompetitions().then(setUpcoming);
  }, []);

  const meets = useMemo(() => listMeets(results), [results]);
  const meet = meets.find((item) => item.key === meetKey) ?? meets[0] ?? null;
  const standard = standards.find((item) => item.id === standardId) ?? null;
  const standardTimes = useMemo(() => times.filter((time) => time.standard_id === standardId), [times, standardId]);

  const starts = useMemo(
    () => (meet ? evaluateMeet(meet, results, swimmers, standard, standardTimes) : []),
    [meet, results, swimmers, standard, standardTimes]
  );

  const withPrevious = starts.filter((start) => start.previousBest);
  const personalBests = withPrevious.filter((start) => start.previousDiff! < 0);
  const firstStarts = starts.filter((start) => !start.previousBest);
  const newlyQualified = starts.filter((start) => start.newlyQualified);
  const close = starts
    .filter((start) => start.requiredDiff !== null && start.requiredDiff > 0 && start.requiredDiff <= 1500)
    .sort((a, b) => a.requiredDiff! - b.requiredDiff!);
  const biggest = [...personalBests].sort((a, b) => percentFaster(b) - percentFaster(a)).slice(0, 5);
  const slower = withPrevious.filter((start) => start.previousDiff! >= 0);

  const bySwimmer = useMemo(() => {
    const groups = new Map<string, MeetStart[]>();
    for (const start of starts) {
      groups.set(start.swimmer.id, [...(groups.get(start.swimmer.id) ?? []), start]);
    }
    return [...groups.values()]
      .map((list) =>
        list.sort(
          (a, b) =>
            STROKE_ORDER.indexOf(a.result.stroke) - STROKE_ORDER.indexOf(b.result.stroke) ||
            a.result.distance - b.result.distance ||
            a.result.time_ms - b.result.time_ms
        )
      )
      .sort((a, b) => (a[0].swimmer.last_name ?? "").localeCompare(b[0].swimmer.last_name ?? "", "de"));
  }, [starts]);

  const meetNonFinishes = meet
    ? nonFinishes.filter(
        (entry) =>
          entry.location === meet.location && entry.result_date.slice(0, 7) === meet.month && entry.pool_length === meet.pool
      )
    : [];

  /* Pro Athlet: Fokus-Strecken mit aktuellen Bestzeiten, Pflichtzeit und Disqualifikationen */
  const sheets = bySwimmer.map((list) => {
    const swimmer = list[0].swimmer;
    const focus = focusFromRow(swimmer as unknown as Record<string, unknown>);
    const swum = new Map(list.map((start) => [`${start.result.distance}-${start.result.stroke}`, { distance: start.result.distance, stroke: start.result.stroke }]));
    return buildAthleteSheet({
      swimmer,
      results,
      focus,
      fallbackEvents: [...swum.values()],
      standard,
      standardTimes,
      nonFinishes,
      today,
    });
  });

  function downloadPdf(sections: ("meet" | "next")[]) {
    if (!meet) return;
    const ok = openMeetPdf({
      title: `${meet.location} · ${monthLabel(meet.month)} · ${meet.pool}m`,
      subtitle: `${bySwimmer.length} Athleten · ${starts.length} Starts · ${personalBests.length}/${withPrevious.length} Bestzeiten${standard ? ` · Pflichtzeiten: ${standard.name}` : ""}`,
      meetStarts: starts,
      meetNonFinishes,
      sheets,
      nextTitle: upcoming[0] ? describeCompetition(upcoming[0]) : "kein Termin im Kalender",
      withStandard: Boolean(standard),
      sections,
    });
    if (!ok) setMessage("Das PDF-Fenster wurde vom Browser blockiert – bitte Pop-ups für diese Seite erlauben.");
  }

  const name = (start: MeetStart) => getSwimmerName(start.swimmer);
  const event = (start: MeetStart) => formatEvent(start.result);

  return (
    <main className="mx-auto max-w-6xl space-y-6">
      <PageHeader
        eyebrow="Analysen"
        title="Wettkampf-Auswertung"
        icon="trophy"
        description="Wähle einen Wettkampf aus den eingetragenen Ergebnissen. Ein Wettkampf = gleicher Ort, Monat und Bahn."
        actions={
          <>
            <button type="button" onClick={() => downloadPdf(["meet", "next"])} className={buttonSecondary} disabled={!meet}>
              PDF: Wettkampf + nächster Wettkampf
            </button>
            <button type="button" onClick={() => downloadPdf(["meet"])} className={buttonSecondary} disabled={!meet}>
              PDF: nur Wettkampf
            </button>
          </>
        }
      />

      {message && <Notice tone="bad">{message}</Notice>}

      <Card padded>
        <div className="grid gap-4 md:grid-cols-2">
          <FormField label="Wettkampf">
            <select value={meet?.key ?? ""} onChange={(e) => setMeetKey(e.target.value)} className={inputClass} disabled={loading}>
              {meets.map((item) => (
                <option key={item.key} value={item.key}>
                  {item.location} · {monthLabel(item.month)} · {item.pool}m · {item.swimmers} Athleten, {item.starts} Starts
                </option>
              ))}
            </select>
          </FormField>

          <FormField label="Pflichtzeiten zum Vergleich">
            <select value={standardId} onChange={(e) => setStandardId(e.target.value)} className={inputClass}>
              <option value="">– keine –</option>
              {standards.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </FormField>
        </div>
      </Card>

      {loading ? (
        <p className="text-sm text-app-muted">Lade Ergebnisse …</p>
      ) : !meet ? (
        <Card>
          <EmptyState icon="trophy" title="Noch keine Ergebnisse">
            Sobald Ergebnisse mit Ort eingetragen sind, erscheinen die Wettkämpfe hier.
          </EmptyState>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
            <Kpi value={bySwimmer.length} label="Athleten am Start" />
            <Kpi value={starts.length} label="gewertete Starts" />
            <Kpi
              value={`${personalBests.length} / ${withPrevious.length}`}
              label={`Bestzeiten${withPrevious.length ? ` – ${Math.round((personalBests.length / withPrevious.length) * 100)} %` : ""}`}
            />
            <Kpi value={firstStarts.length} label={`erste ${meet.pool}m-Starts auf der Strecke`} />
            <Kpi value={standard ? newlyQualified.length : "–"} label="neu erreichte Pflichtzeiten" />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {standard && (
              <ListCard title="★ Pflichtzeit neu erreicht">
                {newlyQualified.map((start) => (
                  <li key={start.result.id}>
                    <b>{name(start)}</b> – {event(start)} {formatTime(start.result.time_ms)} (Pflichtzeit{" "}
                    {formatTime(start.required!.time_ms)}, {formatTimeDifference(start.requiredDiff!)})
                  </li>
                ))}
              </ListCard>
            )}
            {standard && (
              <ListCard title="Knapp an der Pflichtzeit (unter 1,5 s)">
                {close.map((start) => (
                  <li key={start.result.id}>
                    <b>{name(start)}</b> – {event(start)} {formatTime(start.result.time_ms)}, fehlen{" "}
                    <b>{formatTime(start.requiredDiff!)}</b>
                  </li>
                ))}
              </ListCard>
            )}
            <ListCard title="Größte Verbesserungen">
              {biggest.map((start) => (
                <li key={start.result.id}>
                  <b>{name(start)}</b> – {event(start)}: {formatTime(start.previousBest!.time_ms)} →{" "}
                  {formatTime(start.result.time_ms)} (−{percentFaster(start).toFixed(1).replace(".", ",")} %)
                </li>
              ))}
            </ListCard>
          </div>

          <Card
            title="Bis zum nächsten Wettkampf"
            description={upcoming[0] ? describeCompetition(upcoming[0]) : "Kein kommender Wettkampf im Kalender."}
            action={
              <button type="button" onClick={() => downloadPdf(["next"])} className={buttonSecondary}>
                PDF
              </button>
            }
          >
            <p className="border-b border-app-border px-5 py-2 text-xs text-app-muted">
              Fokus-Strecken (H = Haupt, N = Neben; ohne Fokus: die hier geschwommenen Strecken) · aktuelle Bestzeit je Bahn mit
              Monat/Jahr · Abstand zur Pflichtzeit
            </p>
            <div className="grid gap-x-6 gap-y-4 p-5 lg:grid-cols-2">
              {sheets.map((sheet) => (
                <div key={sheet.swimmer.id}>
                  <Link
                    href={`/coach/schwimmer/${sheet.swimmer.id}?tab=fokus`}
                    className="text-sm font-semibold text-app-heading hover:text-app-accent"
                  >
                    {getSwimmerName(sheet.swimmer)}
                  </Link>
                  {sheet.disqualifications.map((dq) => (
                    <p key={dq.id} className="mt-1 rounded-md bg-app-bad/10 px-2 py-1 text-xs text-app-bad">
                      ⚠ DS {formatEventShort(dq)}
                      {dq.location ? ` (${dq.location})` : ""}: {dq.reason ?? "Grund fehlt"}
                    </p>
                  ))}
                  <table className="mt-1 w-full text-xs">
                    <thead>
                      <tr className="border-b border-app-border text-left text-app-muted">
                        <th className="py-1 pr-2 font-normal">Strecke</th>
                        <th className="py-1 pr-2 text-right font-normal">25m</th>
                        <th className="py-1 pr-2 text-right font-normal">50m</th>
                        {standard && <th className="py-1 pr-2 text-right font-normal">Pflicht</th>}
                        {standard && <th className="py-1 text-right font-normal">Abstand</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {sheet.rows.map((row) => (
                        <tr key={`${row.event.distance}-${row.event.stroke}`} className="border-b border-app-border/60 last:border-b-0">
                          <td className="whitespace-nowrap py-1 pr-2 font-medium">
                            {formatEventShort(row.event)}
                            <RoleBadge role={row.role} />
                          </td>
                          {[row.best25, row.best50].map((best, index) => (
                            <td key={index} className="whitespace-nowrap py-1 pr-2 text-right">
                              {best ? (
                                <>
                                  {formatTime(best.time_ms)} <span className="text-app-faint">{monthYearShort(best.result_date)}</span>
                                </>
                              ) : (
                                <span className="text-app-faint">–</span>
                              )}
                            </td>
                          ))}
                          {standard && (
                            <td className="whitespace-nowrap py-1 pr-2 text-right text-app-muted">
                              {row.requiredMs ? formatTime(row.requiredMs) : "–"}
                            </td>
                          )}
                          {standard && (
                            <td
                              className={`whitespace-nowrap py-1 text-right font-semibold ${
                                row.gapMs === null ? "text-app-faint" : row.gapMs <= 0 ? "text-app-good" : "text-app-heading"
                              }`}
                            >
                              {row.gapMs === null ? "–" : row.gapMs <= 0 ? `✓ ${formatTimeDifference(row.gapMs)}` : formatTimeDifference(row.gapMs)}
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))}
            </div>
          </Card>

          <NonFinishCard
            meet={meet}
            swimmers={swimmers}
            entries={meetNonFinishes}
            missingTable={missingTable}
            onChanged={reloadNonFinishes}
          />

          {slower.length > 0 && (
            <Notice tone="warn">
              Langsamer als die bisherige Bestzeit:{" "}
              {slower.map((start) => `${name(start)} ${event(start)} (${formatTimeDifference(start.previousDiff!)})`).join(", ")}
            </Notice>
          )}

          {bySwimmer.map((list) => (
            <Card
              key={list[0].swimmer.id}
              title={
                <Link href={`/coach/schwimmer/${list[0].swimmer.id}`} className="hover:text-app-accent">
                  {name(list[0])}
                </Link>
              }
              description={`Jg. ${list[0].swimmer.birth_year ?? "?"} · ${list.length} Starts`}
            >
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-app-border text-left text-xs text-app-muted">
                      <th className="px-4 py-2">Strecke</th>
                      <th className="px-4 py-2 text-right">Zeit</th>
                      <th className="px-4 py-2 text-right">Pkt.</th>
                      <th className="px-4 py-2">vorher ({meet.pool}m)</th>
                      <th className="px-4 py-2">Stand</th>
                      {standard && <th className="px-4 py-2">Pflichtzeit</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {list.map((start) => (
                      <tr key={start.result.id} className="border-b border-app-border last:border-b-0 even:bg-app-bg/40">
                        <td className="whitespace-nowrap px-4 py-2">
                          {event(start)}
                          {start.result.round && <span className="ml-1 text-xs text-app-faint">{start.result.round}</span>}
                        </td>
                        <td className="whitespace-nowrap px-4 py-2 text-right font-semibold text-app-heading">
                          {formatTime(start.result.time_ms)}
                        </td>
                        <td className="px-4 py-2 text-right">{start.result.points ?? "–"}</td>
                        <td className="whitespace-nowrap px-4 py-2 text-app-muted">
                          {start.previousBest
                            ? `${formatTime(start.previousBest.time_ms)} · ${start.previousBest.location ?? ""} ${monthLabel(start.previousBest.result_date.slice(0, 7))}`
                            : "–"}
                        </td>
                        <td className="whitespace-nowrap px-4 py-2">
                          {!start.previousBest ? (
                            <Tag tone="neutral">erster Start</Tag>
                          ) : start.previousDiff! < 0 ? (
                            <Tag tone="good">Bestzeit {formatTimeDifference(start.previousDiff!)}</Tag>
                          ) : (
                            <Tag tone="bad">{formatTimeDifference(start.previousDiff!)}</Tag>
                          )}
                        </td>
                        {standard && (
                          <td className="whitespace-nowrap px-4 py-2">
                            {!start.required ? (
                              <span className="text-app-faint">–</span>
                            ) : start.newlyQualified ? (
                              <Tag tone="gold">★ neu erreicht ({formatTimeDifference(start.requiredDiff!)})</Tag>
                            ) : start.requiredDiff! <= 0 ? (
                              <Tag tone="good">erfüllt ({formatTimeDifference(start.requiredDiff!)})</Tag>
                            ) : (
                              <span className="text-app-muted">
                                {formatTime(start.required.time_ms)} · fehlt {formatTime(start.requiredDiff!)}
                              </span>
                            )}
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          ))}

          <p className="text-xs text-app-faint">
            „vorher“ = beste Zeit auf der {meet.pool}m-Bahn vor dem Monat dieses Wettkampfs. „neu erreicht“ = Pflichtzeit im
            Qualifikationszeitraum der Liste vorher noch nicht geschafft. Starts ohne Zeit (DS/AB/NA) stehen im Block „Ohne Zeit“.
          </p>
        </>
      )}
    </main>
  );
}

function Kpi({ value, label }: { value: React.ReactNode; label: string }) {
  return (
    <div className="rounded-[20px] border border-app-border bg-app-surface shadow-app p-4 shadow-app">
      <p className="text-2xl font-bold text-app-heading">{value}</p>
      <p className="text-xs text-app-muted">{label}</p>
    </div>
  );
}

function ListCard({ title, children }: { title: string; children: React.ReactNode[] }) {
  return (
    <Card title={title} padded>
      {children.length === 0 ? (
        <p className="text-sm text-app-faint">keine</p>
      ) : (
        <ul className="list-disc space-y-1 pl-5 text-sm">{children}</ul>
      )}
    </Card>
  );
}

function Tag({ tone, children }: { tone: "good" | "bad" | "gold" | "neutral"; children: React.ReactNode }) {
  const tones = {
    good: "bg-app-good/10 text-app-good",
    bad: "bg-app-bad/10 text-app-bad",
    gold: "bg-app-warn/15 text-app-warn",
    neutral: "bg-app-elevated text-app-muted",
  };
  return <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${tones[tone]}`}>{children}</span>;
}
