"use client";

import { useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { PoolLength, Swimmer, formatEvent, formatTime, getSwimmerName } from "@/lib/swim";
import { STATUS_LABELS } from "@/lib/competitionFeedback";
import { ProtocolResult, matchSwimmer, normalizeName, parseResultProtocol } from "@/lib/resultProtocolParser";
import { FormField, Modal, Notice, buttonPrimary, buttonSecondary, inputClass } from "@/components/ui";

/*
 * Ergebnisprotokoll importieren: PDF hochladen (oder Text
 * einfuegen), Ergebnisse den eigenen Schwimmern zuordnen,
 * pruefen und als Starts uebernehmen. Die Zeiten landen dann
 * automatisch auch bei den Ergebnissen der Schwimmer.
 */

type ExistingStart = { swimmer_id: string; distance: number; stroke: string; round: string | null; time_ms: number | null };

type Row = {
  key: string;
  result: ProtocolResult;
  target: string; // swimmer id, "new" oder ""
  certainty: "sicher" | "wahrscheinlich" | null;
  duplicate: boolean;
};

const CLUB_STORAGE_KEY = "protokoll-verein";

function readStoredClub() {
  try {
    return localStorage.getItem(CLUB_STORAGE_KEY) ?? "";
  } catch {
    return "";
  }
}

export default function ProtocolImport({
  open,
  onClose,
  competitionId,
  defaultDate,
  swimmers,
  existingStarts,
  eventsByNumber,
  onImported,
}: {
  open: boolean;
  onClose: () => void;
  competitionId: string;
  defaultDate: string;
  swimmers: Swimmer[];
  existingStarts: ExistingStart[];
  eventsByNumber: Record<number, { id: string; date: string }>;
  onImported: (count: number) => void;
}) {
  const [poolLength, setPoolLength] = useState<PoolLength>(50);
  const [club, setClub] = useState(readStoredClub);
  const [pasted, setPasted] = useState("");
  const [rows, setRows] = useState<Row[] | null>(null);
  const [showAll, setShowAll] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  function analyse(text: string) {
    const { results } = parseResultProtocol(text);

    if (results.length === 0) {
      setError("Im Protokoll wurden keine Ergebniszeilen erkannt. Schick mir das PDF, dann passe ich den Import an.");
      setRows(null);
      return;
    }

    setError("");
    setRows(
      results.map((result, index) => {
        const match = matchSwimmer(result, swimmers);
        const duplicate = Boolean(
          match &&
            result.timeMs &&
            existingStarts.some(
              (start) =>
                start.swimmer_id === match.swimmer.id &&
                start.distance === result.event.distance &&
                start.stroke === result.event.stroke &&
                start.time_ms === result.timeMs
            )
        );

        return { key: `${index}`, result, target: match && !duplicate ? match.swimmer.id : "", certainty: match?.certainty ?? null, duplicate };
      })
    );
  }

  async function handleFile(file: File) {
    setBusy(true);
    setError("");

    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;

    if (!token) {
      setBusy(false);
      setError("Bitte melde dich neu an.");
      return;
    }

    const form = new FormData();
    form.append("file", file);

    try {
      const response = await fetch(`/api/coach/competitions/${competitionId}/protokoll`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      });
      const body = (await response.json()) as { text?: string; error?: string };

      if (!response.ok || !body.text) {
        setError(body.error ?? "Das Protokoll konnte nicht gelesen werden.");
      } else {
        analyse(body.text);
      }
    } catch {
      setError("Verbindung zum Server fehlgeschlagen.");
    }

    setBusy(false);
  }

  const clubKey = normalizeName(club);

  const visibleRows = useMemo(
    () =>
      (rows ?? []).filter(
        (row) => showAll || row.target || row.certainty || (clubKey && normalizeName(row.result.club).includes(clubKey))
      ),
    [rows, showAll, clubKey]
  );

  const selected = (rows ?? []).filter((row) => row.target);

  function setTarget(key: string, target: string) {
    setRows((current) => current?.map((row) => (row.key === key ? { ...row, target } : row)) ?? current);
  }

  async function handleImport() {
    if (selected.length === 0) return;

    setBusy(true);
    setError("");

    try {
      localStorage.setItem(CLUB_STORAGE_KEY, club);
    } catch {
      /* egal - nur eine Bequemlichkeit */
    }

    /* Neue Schwimmer zuerst anlegen (einmal pro Name + Jahrgang) */
    const created = new Map<string, string>();

    for (const row of selected.filter((item) => item.target === "new")) {
      const key = `${normalizeName(row.result.firstName)}-${normalizeName(row.result.lastName)}-${row.result.birthYear}`;

      if (created.has(key)) continue;

      const gender = row.result.event.gender === "female" || row.result.event.gender === "male" ? row.result.event.gender : null;
      const { data, error: insertError } = await supabase
        .from("swimmers")
        .insert({
          first_name: row.result.firstName,
          last_name: row.result.lastName,
          birth_year: row.result.birthYear,
          gender,
          club_name: row.result.club || null,
        })
        .select("id")
        .single();

      if (insertError || !data) {
        setBusy(false);
        setError(`Schwimmer ${row.result.firstName} konnte nicht angelegt werden: ${insertError?.message}`);
        return;
      }

      created.set(key, data.id as string);
    }

    const payload = selected.map((row) => {
      const swimmerId =
        row.target === "new"
          ? created.get(`${normalizeName(row.result.firstName)}-${normalizeName(row.result.lastName)}-${row.result.birthYear}`)!
          : row.target;
      const event = row.result.event.eventNumber ? eventsByNumber[row.result.event.eventNumber] : undefined;

      return {
        competition_id: competitionId,
        swimmer_id: swimmerId,
        event_id: event?.id ?? null,
        start_date: event?.date ?? defaultDate,
        pool_length: poolLength,
        distance: row.result.event.distance,
        stroke: row.result.event.stroke,
        round: row.result.event.round,
        time_ms: row.result.timeMs,
        split_times_ms: row.result.splitsMs,
        status: row.result.status,
        placement: row.result.placement,
        points: row.result.points,
      };
    });

    const { error: insertError } = await supabase.from("competition_starts").insert(payload);

    setBusy(false);

    if (insertError) {
      setError(`Import fehlgeschlagen: ${insertError.message}`);
      return;
    }

    setRows(null);
    setPasted("");
    onImported(payload.length);
  }

  return (
    <Modal open={open} title="Ergebnisprotokoll importieren" onClose={onClose} wide>
      <div className="space-y-5">
        {!rows ? (
          <>
            <p className="text-sm text-app-muted">
              Lade das Protokoll als PDF hoch oder kopiere den Text hinein. Du siehst danach eine Vorschau und entscheidest,
              was übernommen wird.
            </p>

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="Bahnlänge des Wettkampfs">
                <select value={poolLength} onChange={(event) => setPoolLength(Number(event.target.value) as PoolLength)} className={inputClass}>
                  <option value={50}>50m-Bahn</option>
                  <option value={25}>25m-Bahn</option>
                </select>
              </FormField>
              <FormField label="Dein Verein (Filter)" hint="Zeigt auch Schwimmer deines Vereins, die du noch nicht angelegt hast.">
                <input type="text" value={club} onChange={(event) => setClub(event.target.value)} placeholder="z. B. SV Darmstadt" className={inputClass} />
              </FormField>
            </div>

            <label className="flex cursor-pointer flex-col items-center gap-2 rounded-2xl border-2 border-dashed border-app-border px-6 py-8 text-center transition hover:border-app-accent/60">
              <span className="font-semibold text-app-heading">{busy ? "PDF wird gelesen..." : "PDF auswählen"}</span>
              <span className="text-xs text-app-muted">Ergebnisliste / Protokoll, bis 15 MB</span>
              <input
                type="file"
                accept="application/pdf"
                className="hidden"
                disabled={busy}
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  event.target.value = "";
                  if (file) handleFile(file);
                }}
              />
            </label>

            <details className="rounded-xl border border-app-border p-3">
              <summary className="cursor-pointer text-sm font-medium text-app-text">Stattdessen Text einfügen</summary>
              <textarea value={pasted} onChange={(event) => setPasted(event.target.value)} rows={8} className={`${inputClass} mt-3 font-mono text-xs`} />
              <button type="button" onClick={() => analyse(pasted)} disabled={!pasted.trim()} className={`${buttonSecondary} mt-2`}>
                Text auswerten
              </button>
            </details>
          </>
        ) : (
          <>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-app-muted">
                {rows.length} Ergebnisse erkannt · <b className="text-app-heading">{selected.length} zum Übernehmen ausgewählt</b>
              </p>
              <label className="flex items-center gap-2 text-sm text-app-text">
                <input type="checkbox" checked={showAll} onChange={(event) => setShowAll(event.target.checked)} />
                alle Vereine zeigen
              </label>
            </div>

            <div className="max-h-[50vh] overflow-auto rounded-xl border border-app-border">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead className="sticky top-0 border-b border-app-border bg-app-surface text-app-muted">
                  <tr>
                    <th className="px-3 py-2 font-medium">Im Protokoll</th>
                    <th className="px-3 py-2 font-medium">Strecke</th>
                    <th className="px-3 py-2 font-medium">Zeit</th>
                    <th className="px-3 py-2 font-medium">Übernehmen als</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-app-border">
                  {visibleRows.map((row) => (
                    <tr key={row.key} className={row.target ? "" : "opacity-60"}>
                      <td className="px-3 py-2">
                        <span className="font-medium text-app-heading">
                          {row.result.firstName} {row.result.lastName}
                        </span>
                        <span className="block text-xs text-app-muted">
                          {row.result.birthYear ?? "–"} · {row.result.club}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        {formatEvent(row.result.event)}
                        {row.result.event.round && <span className="block text-xs text-app-faint">{row.result.event.round}</span>}
                      </td>
                      <td className="px-3 py-2 font-semibold text-app-heading">
                        {row.result.timeMs ? formatTime(row.result.timeMs) : STATUS_LABELS[row.result.status]}
                        {row.result.placement && <span className="ml-1 text-xs font-normal text-app-muted">Pl. {row.result.placement}</span>}
                        {row.result.splitsMs.length > 0 && (
                          <span className="block text-[11px] font-normal text-app-faint">{row.result.splitsMs.length} Zwischenzeiten</span>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        <select value={row.target} onChange={(event) => setTarget(row.key, event.target.value)} className={`${inputClass} py-1.5`}>
                          <option value="">– nicht übernehmen –</option>
                          <option value="new">+ als neuen Schwimmer anlegen</option>
                          {swimmers.map((swimmer) => (
                            <option key={swimmer.id} value={swimmer.id}>
                              {getSwimmerName(swimmer)}
                              {swimmer.birth_year ? ` (${swimmer.birth_year})` : ""}
                            </option>
                          ))}
                        </select>
                        {row.duplicate && <span className="mt-1 block text-[11px] text-app-warn">schon erfasst</span>}
                        {!row.duplicate && row.certainty === "wahrscheinlich" && (
                          <span className="mt-1 block text-[11px] text-app-warn">nur über Vorname + Jahrgang erkannt – bitte prüfen</span>
                        )}
                      </td>
                    </tr>
                  ))}
                  {visibleRows.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-3 py-6 text-center text-app-muted">
                        Keine deiner Schwimmer gefunden. Trag oben deinen Verein ein oder zeig alle Vereine.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <p className="text-xs text-app-faint">
              Bahnlänge: {poolLength} m. Übernommene Starts bekommen danach wie gewohnt dein Feedback. Zeiten werden automatisch zu den Ergebnissen
              der Schwimmer.
            </p>
          </>
        )}

        {error && <Notice tone="bad">{error}</Notice>}

        <div className="flex justify-between gap-2 border-t border-app-border pt-4">
          {rows ? (
            <button type="button" onClick={() => setRows(null)} className={buttonSecondary}>
              ← Anderes Protokoll
            </button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <button type="button" onClick={onClose} className={buttonSecondary}>
              Abbrechen
            </button>
            {rows && (
              <button type="button" onClick={handleImport} disabled={busy || selected.length === 0} className={buttonPrimary}>
                {busy ? "Wird übernommen..." : `${selected.length} übernehmen`}
              </button>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
}
