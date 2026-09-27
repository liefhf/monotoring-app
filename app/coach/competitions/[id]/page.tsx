"use client";

import Link from "next/link";
import {
  ChangeEvent,
  DragEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useParams } from "next/navigation";

import { supabase } from "@/lib/supabase";
import CompetitionImportPreview from "@/components/CompetitionImportPreview";

type Competition = {
  id: string;
  name: string;
  start_date: string;
  end_date: string | null;
  location: string;
  status: string;
};

type CompetitionSection = {
  id: string;
  section_number: number;
  section_date: string;
  title: string;
  admission_time: string | null;
  officials_meeting_time: string | null;
  start_time: string | null;
  notes: string | null;
};

type CompetitionEvent = {
  id: string;
  section_id: string;
  event_number: number;
  distance_m: number;
  relay_count: number | null;
  stroke: string;
  gender: "female" | "male" | "mixed";
  round_type:
    | "standard"
    | "heat"
    | "junior_final"
    | "final";
  age_group_text: string | null;
  sort_order: number;
};

type CompetitionDocument = {
  id: string;
  competition_id: string;
  uploaded_by: string;
  file_name: string;
  storage_path: string;
  mime_type: string;
  size_bytes: number;
  created_at: string;
};

const STORAGE_BUCKET = "competition-pdfs";

const MAX_FILE_SIZE =
  10 * 1024 * 1024;

function formatDate(date: string) {
  return new Intl.DateTimeFormat(
    "de-DE",
    {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }
  ).format(
    new Date(
      `${date}T00:00:00`
    )
  );
}

function formatTime(
  time: string | null
) {
  if (!time) {
    return null;
  }

  return time.slice(0, 5);
}

function formatFileSize(
  bytes: number
) {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(
      bytes / 1024
    ).toFixed(1)} KB`;
  }

  return `${(
    bytes /
    (1024 * 1024)
  ).toFixed(1)} MB`;
}

function getGenderLabel(
  gender: CompetitionEvent["gender"]
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
  roundType: CompetitionEvent["round_type"]
) {
  switch (roundType) {
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

function getStatusLabel(
  status: string
) {
  switch (status) {
    case "completed":
      return "Abgeschlossen";

    case "cancelled":
      return "Abgesagt";

    case "planned":
    default:
      return "Geplant";
  }
}

function getDistanceLabel(
  event: CompetitionEvent
) {
  if (event.relay_count) {
    return `${event.relay_count} × ${event.distance_m} m`;
  }

  return `${event.distance_m} m`;
}

function sanitizeFileName(
  name: string
) {
  return name
    .normalize("NFD")
    .replace(
      /[\u0300-\u036f]/g,
      ""
    )
    .replace(
      /[^a-zA-Z0-9._-]/g,
      "_"
    );
}

export default function CompetitionDetailPage() {
  const params =
    useParams<{ id: string }>();

  const competitionId =
    params.id;

  const fileInputRef =
    useRef<HTMLInputElement | null>(
      null
    );

  const [
    competition,
    setCompetition,
  ] =
    useState<Competition | null>(
      null
    );

  const [
    sections,
    setSections,
  ] =
    useState<
      CompetitionSection[]
    >([]);

  const [
    events,
    setEvents,
  ] =
    useState<
      CompetitionEvent[]
    >([]);

  const [
    document,
    setDocument,
  ] =
    useState<
      CompetitionDocument | null
    >(null);

  const [
    loading,
    setLoading,
  ] =
    useState(true);

  const [
    uploading,
    setUploading,
  ] =
    useState(false);

  const [
    isDragging,
    setIsDragging,
  ] =
    useState(false);

  const [
    error,
    setError,
  ] =
    useState("");

  const [
    uploadMessage,
    setUploadMessage,
  ] =
    useState("");

  useEffect(() => {
    if (!competitionId) {
      return;
    }

    loadCompetition();
  }, [competitionId]);

  async function loadCompetition() {
    setLoading(true);
    setError("");

    const [
      competitionResult,
      sectionsResult,
      eventsResult,
      documentResult,
    ] =
      await Promise.all([
        supabase
          .from(
            "competitions"
          )
          .select(
            `
              id,
              name,
              start_date,
              end_date,
              location,
              status
            `
          )
          .eq(
            "id",
            competitionId
          )
          .single(),

        supabase
          .from(
            "competition_sections"
          )
          .select(
            `
              id,
              section_number,
              section_date,
              title,
              admission_time,
              officials_meeting_time,
              start_time,
              notes
            `
          )
          .eq(
            "competition_id",
            competitionId
          )
          .order(
            "section_number",
            {
              ascending: true,
            }
          ),

        supabase
          .from(
            "competition_events"
          )
          .select(
            `
              id,
              section_id,
              event_number,
              distance_m,
              relay_count,
              stroke,
              gender,
              round_type,
              age_group_text,
              sort_order
            `
          )
          .eq(
            "competition_id",
            competitionId
          )
          .order(
            "sort_order",
            {
              ascending: true,
            }
          ),

        supabase
          .from(
            "competition_documents"
          )
          .select(
            `
              id,
              competition_id,
              uploaded_by,
              file_name,
              storage_path,
              mime_type,
              size_bytes,
              created_at
            `
          )
          .eq(
            "competition_id",
            competitionId
          )
          .maybeSingle(),
      ]);

    if (
      competitionResult.error
    ) {
      setError(
        "Wettkampf konnte nicht geladen werden."
      );

      setLoading(false);
      return;
    }

    if (
      sectionsResult.error
    ) {
      setError(
        "Abschnitte konnten nicht geladen werden."
      );

      setLoading(false);
      return;
    }

    if (
      eventsResult.error
    ) {
      setError(
        "Wettkämpfe konnten nicht geladen werden."
      );

      setLoading(false);
      return;
    }

    if (
      documentResult.error
    ) {
      setError(
        "Ausschreibung konnte nicht geladen werden."
      );

      setLoading(false);
      return;
    }

    setCompetition(
      competitionResult.data
    );

    setSections(
      sectionsResult.data ?? []
    );

    setEvents(
      eventsResult.data ?? []
    );

    setDocument(
      documentResult.data ??
        null
    );

    setLoading(false);
  }

  const eventsBySection =
    useMemo(() => {
      const grouped =
        new Map<
          string,
          CompetitionEvent[]
        >();

      for (const event of events) {
        const current =
          grouped.get(
            event.section_id
          ) ?? [];

        current.push(event);

        grouped.set(
          event.section_id,
          current
        );
      }

      return grouped;
    }, [events]);

  function validateFile(
    file: File
  ) {
    if (
      file.type !==
        "application/pdf" &&
      !file.name
        .toLowerCase()
        .endsWith(".pdf")
    ) {
      setUploadMessage(
        "Bitte nur PDF-Dateien hochladen."
      );

      return false;
    }

    if (
      file.size >
      MAX_FILE_SIZE
    ) {
      setUploadMessage(
        "Die PDF darf maximal 10 MB groß sein."
      );

      return false;
    }

    return true;
  }

  async function uploadPdf(
    file: File
  ) {
    setUploadMessage("");

    if (
      !validateFile(file)
    ) {
      return;
    }

    setUploading(true);

    const {
      data: { user },
      error: userError,
    } =
      await supabase.auth.getUser();

    if (
      userError ||
      !user
    ) {
      setUploadMessage(
        "Coach konnte nicht geladen werden."
      );

      setUploading(false);
      return;
    }

    const safeName =
      sanitizeFileName(
        file.name
      );

    const storagePath =
      `${competitionId}/${Date.now()}-${safeName}`;

    const {
      error: uploadError,
    } =
      await supabase.storage
        .from(
          STORAGE_BUCKET
        )
        .upload(
          storagePath,
          file,
          {
            contentType:
              "application/pdf",
            upsert: false,
          }
        );

    if (
      uploadError
    ) {
      setUploadMessage(
        `PDF konnte nicht hochgeladen werden: ${uploadError.message}`
      );

      setUploading(false);
      return;
    }

    if (document) {
      const {
        error:
          oldFileDeleteError,
      } =
        await supabase.storage
          .from(
            STORAGE_BUCKET
          )
          .remove([
            document.storage_path,
          ]);

      if (
        oldFileDeleteError
      ) {
        await supabase.storage
          .from(
            STORAGE_BUCKET
          )
          .remove([
            storagePath,
          ]);

        setUploadMessage(
          `Alte Ausschreibung konnte nicht ersetzt werden: ${oldFileDeleteError.message}`
        );

        setUploading(false);
        return;
      }

      const {
        data:
          updatedDocument,
        error:
          updateError,
      } =
        await supabase
          .from(
            "competition_documents"
          )
          .update({
            uploaded_by:
              user.id,

            file_name:
              file.name,

            storage_path:
              storagePath,

            mime_type:
              "application/pdf",

            size_bytes:
              file.size,

            created_at:
              new Date().toISOString(),
          })
          .eq(
            "id",
            document.id
          )
          .select()
          .single();

      if (
        updateError
      ) {
        setUploadMessage(
          `Datei wurde hochgeladen, aber die Zuordnung konnte nicht gespeichert werden: ${updateError.message}`
        );

        setUploading(false);
        return;
      }

      setDocument(
        updatedDocument
      );

      setUploadMessage(
        "Ausschreibung wurde ersetzt."
      );

      setUploading(false);
      return;
    }

    const {
      data:
        insertedDocument,
      error:
        insertError,
    } =
      await supabase
        .from(
          "competition_documents"
        )
        .insert({
          competition_id:
            competitionId,

          uploaded_by:
            user.id,

          file_name:
            file.name,

          storage_path:
            storagePath,

          mime_type:
            "application/pdf",

          size_bytes:
            file.size,
        })
        .select()
        .single();

    if (
      insertError
    ) {
      await supabase.storage
        .from(
          STORAGE_BUCKET
        )
        .remove([
          storagePath,
        ]);

      setUploadMessage(
        `PDF konnte nicht zugeordnet werden: ${insertError.message}`
      );

      setUploading(false);
      return;
    }

    setDocument(
      insertedDocument
    );

    setUploadMessage(
      "Ausschreibung wurde hochgeladen."
    );

    setUploading(false);
  }

  function handleFileChange(
    event: ChangeEvent<HTMLInputElement>
  ) {
    const file =
      event.target.files?.[0];

    if (!file) {
      return;
    }

    uploadPdf(file);

    event.target.value =
      "";
  }

  function handleDragOver(
    event: DragEvent<HTMLDivElement>
  ) {
    event.preventDefault();

    setIsDragging(true);
  }

  function handleDragLeave(
    event: DragEvent<HTMLDivElement>
  ) {
    event.preventDefault();

    setIsDragging(false);
  }

  function handleDrop(
    event: DragEvent<HTMLDivElement>
  ) {
    event.preventDefault();

    setIsDragging(false);

    const file =
      event.dataTransfer
        .files?.[0];

    if (!file) {
      return;
    }

    uploadPdf(file);
  }

  async function openPdf() {
    if (!document) {
      return;
    }

    setUploadMessage("");

    const {
      data,
      error:
        signedUrlError,
    } =
      await supabase.storage
        .from(
          STORAGE_BUCKET
        )
        .createSignedUrl(
          document.storage_path,
          60 * 5
        );

    if (
      signedUrlError ||
      !data
    ) {
      setUploadMessage(
        "PDF konnte nicht geöffnet werden."
      );

      return;
    }

    window.open(
      data.signedUrl,
      "_blank",
      "noopener,noreferrer"
    );
  }

  if (loading) {
    return (
      <div className="rounded-2xl border border-app-border bg-app-surface p-5 text-sm text-app-muted">
        Wettkampf wird geladen...
      </div>
    );
  }

  if (
    error ||
    !competition
  ) {
    return (
      <div className="space-y-4">
        <Link
          href="/coach/competitions"
          className="text-sm text-app-muted transition hover:text-app-heading"
        >
          ← Zurück zu Wettkämpfe
        </Link>

        <div className="rounded-2xl border border-app-bad/40 bg-app-bad/30 p-4 text-sm text-app-bad">
          {error ||
            "Wettkampf wurde nicht gefunden."}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Link
        href="/coach/competitions"
        className="text-sm text-app-muted transition hover:text-app-heading"
      >
        ← Zurück zu Wettkämpfe
      </Link>

      {/* WETTKAMPF-KOPF */}
      <section className="rounded-2xl border border-app-border bg-app-surface p-5 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-app-heading sm:text-3xl">
              {
                competition.name
              }
            </h1>

            <div className="mt-3 space-y-1 text-sm text-app-muted">
              <p>
                {formatDate(
                  competition.start_date
                )}

                {competition.end_date
                  ? ` – ${formatDate(
                      competition.end_date
                    )}`
                  : ""}
              </p>

              <p>
                {
                  competition.location
                }
              </p>
            </div>
          </div>

          <span className="w-fit rounded-full border border-app-accent/40 bg-app-accent/40 px-3 py-1 text-xs font-semibold text-app-accent">
            {getStatusLabel(
              competition.status
            )}
          </span>
        </div>
      </section>

      {/* AUSSCHREIBUNG */}
      <section className="rounded-2xl border border-app-border bg-app-surface p-5 sm:p-6">
        <h2 className="text-lg font-semibold text-app-heading">
          Ausschreibung
        </h2>

        {document && (
          <div className="mt-4 flex flex-col gap-3 rounded-xl border border-app-border bg-app-bg/60 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="truncate font-medium text-app-heading">
                {
                  document.file_name
                }
              </p>

              <p className="mt-1 text-xs text-app-faint">
                {formatFileSize(
                  document.size_bytes
                )}
              </p>
            </div>

            <button
              type="button"
              onClick={
                openPdf
              }
              className="shrink-0 rounded-lg border border-app-border px-3 py-2 text-sm font-medium text-app-text transition hover:bg-app-elevated hover:text-app-heading"
            >
              PDF öffnen
            </button>
          </div>
        )}

        <div
          onDragOver={
            handleDragOver
          }
          onDragLeave={
            handleDragLeave
          }
          onDrop={
            handleDrop
          }
          onClick={() => {
            if (!uploading) {
              fileInputRef.current?.click();
            }
          }}
          className={`mt-4 cursor-pointer rounded-2xl border-2 border-dashed p-7 text-center transition sm:p-9 ${
            isDragging
              ? "border-app-accent bg-app-accent/10"
              : "border-app-border bg-app-bg/40 hover:border-app-border hover:bg-app-bg/70"
          }`}
        >
          <input
            ref={
              fileInputRef
            }
            type="file"
            accept="application/pdf,.pdf"
            onChange={
              handleFileChange
            }
            className="hidden"
          />

          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-app-elevated text-xl font-semibold text-app-heading">
            PDF
          </div>

          <p className="mt-4 font-semibold text-app-heading">
            {document
              ? "Neue Ausschreibung hier hineinziehen"
              : "PDF hier hineinziehen"}
          </p>

          <p className="mt-1 text-sm text-app-muted">
            oder klicken und Datei auswählen
          </p>

          <p className="mt-3 text-xs text-app-faint">
            Nur PDF · maximal 10 MB
          </p>

          {uploading && (
            <p className="mt-4 text-sm font-medium text-app-accent">
              PDF wird hochgeladen...
            </p>
          )}
        </div>

        {uploadMessage && (
          <div className="mt-4 rounded-xl border border-app-border bg-app-bg/60 p-3 text-sm text-app-text">
            {
              uploadMessage
            }
          </div>
        )}
      </section>

      {/* AUTOMATISCHES AUSLESEN */}
      <CompetitionImportPreview
        competitionId={
          competitionId
        }
        hasDocument={
          Boolean(
            document
          )
        }
        onApplied={
          loadCompetition
        }
      />

      {/* GESPEICHERTE ABSCHNITTE */}
      <div className="space-y-5">
        {sections.length ===
        0 ? (
          <section className="rounded-2xl border border-app-border bg-app-surface p-5 text-sm text-app-faint">
            Noch keine Abschnitte und WKs gespeichert.
          </section>
        ) : (
          sections.map(
            (section) => {
              const sectionEvents =
                eventsBySection.get(
                  section.id
                ) ?? [];

              return (
                <section
                  key={
                    section.id
                  }
                  className="rounded-2xl border border-app-border bg-app-surface p-5"
                >
                  <div className="border-b border-app-border pb-4">
                    <h2 className="text-lg font-semibold text-app-heading">
                      {
                        section.section_number
                      }
                      . Abschnitt
                    </h2>

                    <p className="mt-1 text-sm text-app-muted">
                      {formatDate(
                        section.section_date
                      )}
                    </p>

                    <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-app-faint">
                      {section.admission_time && (
                        <span>
                          Einlass / Einschwimmen:{" "}
                          {formatTime(
                            section.admission_time
                          )}{" "}
                          Uhr
                        </span>
                      )}

                      {section.officials_meeting_time && (
                        <span>
                          Kampfrichtersitzung:{" "}
                          {formatTime(
                            section.officials_meeting_time
                          )}{" "}
                          Uhr
                        </span>
                      )}

                      {section.start_time && (
                        <span>
                          Beginn:{" "}
                          {formatTime(
                            section.start_time
                          )}{" "}
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

                  {sectionEvents.length ===
                  0 ? (
                    <p className="pt-4 text-sm text-app-faint">
                      Keine WKs in diesem Abschnitt.
                    </p>
                  ) : (
                    <div className="divide-y divide-app-border">
                      {sectionEvents.map(
                        (event) => {
                          const roundLabel =
                            getRoundLabel(
                              event.round_type
                            );

                          return (
                            <div
                              key={
                                event.id
                              }
                              className="flex flex-col gap-1 py-3 sm:flex-row sm:items-center sm:justify-between"
                            >
                              <div className="flex min-w-0 items-start gap-3">
                                <span className="min-w-[68px] shrink-0 font-semibold text-app-accent">
                                  WK{" "}
                                  {
                                    event.event_number
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

                                    {roundLabel
                                      ? ` (${roundLabel})`
                                      : ""}
                                  </p>

                                  <p className="mt-0.5 text-sm text-app-muted">
                                    {getGenderLabel(
                                      event.gender
                                    )}

                                    {event.age_group_text
                                      ? ` · ${event.age_group_text}`
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
                </section>
              );
            }
          )
        )}
      </div>
    </div>
  );
}