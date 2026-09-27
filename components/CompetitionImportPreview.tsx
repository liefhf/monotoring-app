"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";

type ParsedEvent = {
  eventNumber: number;
  distanceM: number;
  relayCount: number | null;
  stroke: string;
  gender: "female" | "male" | "mixed";
  roundType:
    | "standard"
    | "heat"
    | "junior_final"
    | "final";
  ageGroupText: string | null;
};

type ParsedSection = {
  sectionNumber: number;
  sectionDate: string | null;
  title: string;
  admissionTime: string | null;
  officialsMeetingTime: string | null;
  startTime: string | null;
  notes: string | null;
  events: ParsedEvent[];
};

type ParsedCompetition = {
  sections: ParsedSection[];
  eventCount: number;
};

type Props = {
  competitionId: string;
  hasDocument: boolean;
  onApplied?: () => void;
};

function getGenderLabel(
  gender: ParsedEvent["gender"]
) {
  switch (gender) {
    case "female":
      return "weiblich";

    case "male":
      return "männlich";

    case "mixed":
    default:
      return "mixed";
  }
}

function getRoundLabel(
  round: ParsedEvent["roundType"]
) {
  switch (round) {
    case "heat":
      return "Vorlauf";

    case "junior_final":
      return "Juniorenfinale";

    case "final":
      return "Finale";

    case "standard":
    default:
      return null;
  }
}

function formatDate(
  value: string | null
) {
  if (!value) {
    return null;
  }

  return new Intl.DateTimeFormat(
    "de-DE",
    {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }
  ).format(
    new Date(
      `${value}T00:00:00`
    )
  );
}

function getDistanceLabel(
  event: ParsedEvent
) {
  if (event.relayCount) {
    return `${event.relayCount} × ${event.distanceM} m`;
  }

  return `${event.distanceM} m`;
}

export default function CompetitionImportPreview({
  competitionId,
  hasDocument,
  onApplied,
}: Props) {
  const [
    analysing,
    setAnalysing,
  ] = useState(false);

  const [
    applying,
    setApplying,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState("");

  const [
    success,
    setSuccess,
  ] = useState("");

  const [
    parsed,
    setParsed,
  ] =
    useState<ParsedCompetition | null>(
      null
    );

  async function analysePdf() {
    setError("");
    setSuccess("");
    setParsed(null);
    setAnalysing(true);

    const {
      data: { session },
      error:
        sessionError,
    } =
      await supabase.auth.getSession();

    if (
      sessionError ||
      !session
    ) {
      setError(
        "Du bist nicht mehr angemeldet."
      );

      setAnalysing(false);
      return;
    }

    try {
      const response =
        await fetch(
          `/api/coach/competitions/${competitionId}/parse`,
          {
            method: "POST",
            headers: {
              Authorization:
                `Bearer ${session.access_token}`,
            },
          }
        );

      const result =
        await response.json();

      if (!response.ok) {
        setError(
          result.error ??
            "Ausschreibung konnte nicht ausgewertet werden."
        );

        setAnalysing(false);
        return;
      }

      setParsed(
        result.parsed
      );
    } catch {
      setError(
        "Ausschreibung konnte nicht ausgewertet werden."
      );
    }

    setAnalysing(false);
  }

  async function applyImport() {
    if (!parsed) {
      return;
    }

    setError("");
    setSuccess("");
    setApplying(true);

    const {
      error: applyError,
    } =
      await supabase.rpc(
        "apply_competition_import",
        {
          p_competition_id:
            competitionId,
        }
      );

    if (applyError) {
      setError(
        `Daten konnten nicht übernommen werden: ${applyError.message}`
      );

      setApplying(false);
      return;
    }

    setSuccess(
      "Abschnitte und WKs wurden gespeichert."
    );

    setApplying(false);

    if (onApplied) {
      onApplied();
    }
  }

  if (!hasDocument) {
    return null;
  }

  return (
    <section className="rounded-2xl border border-app-border bg-app-surface p-5 sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-app-heading">
            Ausschreibung auslesen
          </h2>

          <p className="mt-1 text-sm text-app-muted">
            WKs und Abschnitte automatisch erkennen.
          </p>
        </div>

        <button
          type="button"
          disabled={
            analysing ||
            applying
          }
          onClick={
            analysePdf
          }
          className="rounded-xl bg-app-accent px-4 py-2.5 text-sm font-semibold text-app-accent-ink transition hover:bg-app-accent disabled:cursor-not-allowed disabled:opacity-50"
        >
          {analysing
            ? "Wird ausgelesen..."
            : "Ausschreibung auslesen"}
        </button>
      </div>

      {error && (
        <div className="mt-4 rounded-xl border border-app-bad/40 bg-app-bad/10 p-3 text-sm text-app-bad">
          {error}
        </div>
      )}

      {success && (
        <div className="mt-4 rounded-xl border border-app-good/40 bg-app-good/10 p-3 text-sm text-app-good">
          {success}
        </div>
      )}

      {parsed && (
        <div className="mt-6 space-y-5">
          <div className="rounded-xl border border-app-good/40 bg-app-good/20 p-4">
            <p className="font-semibold text-app-good">
              {
                parsed.eventCount
              }{" "}
              WKs erkannt
            </p>

            <p className="mt-1 text-sm text-app-muted">
              {
                parsed.sections
                  .length
              }{" "}
              Abschnitte erkannt
            </p>
          </div>

          {parsed.sections.map(
            (section) => (
              <div
                key={
                  section.sectionNumber
                }
                className="overflow-hidden rounded-xl border border-app-border"
              >
                <div className="bg-app-bg/70 px-4 py-3">
                  <h3 className="font-semibold text-app-heading">
                    {
                      section.sectionNumber
                    }
                    . Abschnitt
                  </h3>

                  {section.sectionDate && (
                    <p className="mt-1 text-xs text-app-faint">
                      {formatDate(
                        section.sectionDate
                      )}
                    </p>
                  )}

                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-app-faint">
                    {section.admissionTime && (
                      <span>
                        Einlass /
                        Einschwimmen:{" "}
                        {
                          section.admissionTime
                        }{" "}
                        Uhr
                      </span>
                    )}

                    {section.officialsMeetingTime && (
                      <span>
                        Kampfrichtersitzung:{" "}
                        {
                          section.officialsMeetingTime
                        }{" "}
                        Uhr
                      </span>
                    )}

                    {section.startTime && (
                      <span>
                        Beginn:{" "}
                        {
                          section.startTime
                        }{" "}
                        Uhr
                      </span>
                    )}
                  </div>

                  {section.notes && (
                    <p className="mt-2 text-xs text-app-faint">
                      {
                        section.notes
                      }
                    </p>
                  )}
                </div>

                {section.events.length ===
                0 ? (
                  <div className="px-4 py-4 text-sm text-app-faint">
                    Keine WKs erkannt.
                  </div>
                ) : (
                  <div className="divide-y divide-app-border">
                    {section.events.map(
                      (event) => {
                        const round =
                          getRoundLabel(
                            event.roundType
                          );

                        return (
                          <div
                            key={`${section.sectionNumber}-${event.eventNumber}`}
                            className="px-4 py-3"
                          >
                            <div className="flex items-start gap-4">
                              <span className="min-w-[70px] font-semibold text-app-accent">
                                WK{" "}
                                {
                                  event.eventNumber
                                }
                              </span>

                              <div className="min-w-0">
                                <p className="font-medium text-app-heading">
                                  {getDistanceLabel(
                                    event
                                  )}{" "}
                                  {
                                    event.stroke
                                  }

                                  {round
                                    ? ` (${round})`
                                    : ""}
                                </p>

                                <p className="mt-1 text-sm text-app-muted">
                                  {getGenderLabel(
                                    event.gender
                                  )}

                                  {event.ageGroupText
                                    ? ` · ${event.ageGroupText}`
                                    : ""}
                                </p>
                              </div>
                            </div>
                          </div>
                        );
                      }
                    )}
                  </div>
                )}
              </div>
            )
          )}

          <div className="rounded-xl border border-app-warn/50 bg-app-warn/20 p-4 text-sm text-app-warn">
            Bitte kontrolliere die erkannten WKs.
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
            <button
              type="button"
              disabled={
                applying
              }
              onClick={
                applyImport
              }
              className="rounded-xl bg-app-good px-5 py-3 text-sm font-semibold text-app-bg transition hover:bg-app-good disabled:cursor-not-allowed disabled:opacity-50"
            >
              {applying
                ? "Wird gespeichert..."
                : "Daten übernehmen"}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}