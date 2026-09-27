"use client";

import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { TeamFile, TeamMessage, formatFileSize, formatRelative } from "@/lib/community";
import { Icon } from "@/components/icons";
import { Card, EmptyState, Notice, RichText, buttonGhost, buttonPrimary, buttonSecondary, inputClass } from "@/components/ui";

/*
 * Digitaler Gruppenraum eines Teams: Nachrichten und
 * gemeinsame Dateien. Zugriff haben der Coach und die
 * Mitglieder des Teams (regelt die Datenbank).
 */

const MAX_FILE_BYTES = 20 * 1024 * 1024;

export default function TeamRoom({ teamId, isCoach }: { teamId: string; isCoach: boolean }) {
  const [userId, setUserId] = useState<string | null>(null);
  const [messages, setMessages] = useState<TeamMessage[]>([]);
  const [files, setFiles] = useState<TeamFile[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [tab, setTab] = useState<"chat" | "dateien">("chat");

  const bottomRef = useRef<HTMLDivElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const loadMessages = useCallback(async () => {
    const { data, error: loadError } = await supabase
      .from("team_messages")
      .select("id, team_id, author_id, author_name, author_role, body, created_at")
      .eq("team_id", teamId)
      .order("created_at", { ascending: false })
      .limit(200);

    if (loadError) {
      setError(
        loadError.message.includes("team_messages")
          ? "Die Gruppenräume sind noch nicht eingerichtet. Bitte supabase/termine_news_gruppen.sql in Supabase ausführen."
          : `Nachrichten konnten nicht geladen werden: ${loadError.message}`
      );
      return;
    }

    setMessages(((data ?? []) as TeamMessage[]).reverse());
  }, [teamId]);

  const loadFiles = useCallback(async () => {
    const { data } = await supabase
      .from("team_files")
      .select("id, team_id, uploader_id, storage_path, file_name, size_bytes, created_at")
      .eq("team_id", teamId)
      .order("created_at", { ascending: false });

    setFiles((data ?? []) as TeamFile[]);
  }, [teamId]);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Daten beim Oeffnen laden
    loadMessages();
    loadFiles();

    /* Neue Nachrichten live anzeigen */
    const channel = supabase
      .channel(`team-room-${teamId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "team_messages", filter: `team_id=eq.${teamId}` },
        () => loadMessages()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [teamId, loadMessages, loadFiles]);

  useEffect(() => {
    if (tab === "chat") {
      bottomRef.current?.scrollIntoView({ block: "end" });
    }
  }, [messages, tab]);

  async function handleSend(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const body = text.trim();

    if (!body) return;

    setSending(true);
    const { error: sendError } = await supabase.from("team_messages").insert({ team_id: teamId, body });
    setSending(false);

    if (sendError) {
      setError(`Nachricht konnte nicht gesendet werden: ${sendError.message}`);
      return;
    }

    setText("");
    await loadMessages();
  }

  async function handleDeleteMessage(message: TeamMessage) {
    if (!window.confirm("Nachricht löschen?")) return;

    await supabase.from("team_messages").delete().eq("id", message.id);
    await loadMessages();
  }

  async function handleUpload(file: File) {
    if (file.size > MAX_FILE_BYTES) {
      setError("Die Datei ist größer als 20 MB.");
      return;
    }

    setUploading(true);
    setError("");

    const safeName = file.name.replace(/[^\w.\-äöüÄÖÜß ]+/g, "_");
    const path = `${teamId}/${crypto.randomUUID()}-${safeName}`;

    const { error: uploadError } = await supabase.storage.from("team-files").upload(path, file);

    if (uploadError) {
      setUploading(false);
      setError(`Datei konnte nicht hochgeladen werden: ${uploadError.message}`);
      return;
    }

    const { error: insertError } = await supabase.from("team_files").insert({
      team_id: teamId,
      storage_path: path,
      file_name: file.name,
      size_bytes: file.size,
      uploader_id: userId,
    });

    setUploading(false);

    if (insertError) {
      await supabase.storage.from("team-files").remove([path]);
      setError(`Datei konnte nicht gespeichert werden: ${insertError.message}`);
      return;
    }

    await loadFiles();
  }

  async function handleOpenFile(file: TeamFile) {
    const { data, error: urlError } = await supabase.storage
      .from("team-files")
      .createSignedUrl(file.storage_path, 60, { download: file.file_name });

    if (urlError || !data) {
      setError("Datei konnte nicht geöffnet werden.");
      return;
    }

    window.open(data.signedUrl, "_blank", "noopener");
  }

  async function handleDeleteFile(file: TeamFile) {
    if (!window.confirm(`„${file.file_name}“ löschen?`)) return;

    await supabase.storage.from("team-files").remove([file.storage_path]);
    await supabase.from("team_files").delete().eq("id", file.id);
    await loadFiles();
  }

  return (
    <div className="space-y-4">
      {error && <Notice tone="bad">{error}</Notice>}

      <div className="inline-flex rounded-xl border border-app-border bg-app-surface p-1">
        {(["chat", "dateien"] as const).map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => setTab(value)}
            className={`inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm transition ${
              tab === value ? "bg-app-accent font-semibold text-app-accent-ink" : "text-app-text hover:bg-app-elevated"
            }`}
          >
            <Icon name={value === "chat" ? "chat" : "paperclip"} className="h-4 w-4" />
            {value === "chat" ? "Nachrichten" : `Dateien (${files.length})`}
          </button>
        ))}
      </div>

      {tab === "chat" ? (
        <Card>
          <div className="h-[55vh] min-h-72 space-y-3 overflow-y-auto bg-app-bg/40 p-4">
            {messages.length === 0 ? (
              <EmptyState icon="chat" title="Noch keine Nachrichten">
                Schreib die erste Nachricht an dein Team.
              </EmptyState>
            ) : (
              messages.map((message) => {
                const own = message.author_id === userId;
                const fromCoach = message.author_role === "coach";

                return (
                  <div key={message.id} className={`group flex ${own ? "justify-end" : "justify-start"}`}>
                    <div
                      className={`max-w-[85%] rounded-2xl px-4 py-2.5 sm:max-w-[70%] ${
                        own
                          ? "rounded-br-md bg-app-accent text-app-accent-ink"
                          : "rounded-bl-md border border-app-border bg-app-surface text-app-text"
                      }`}
                    >
                      {!own && (
                        <p className="mb-0.5 flex items-center gap-1.5 text-xs font-semibold text-app-heading">
                          {message.author_name || "Unbekannt"}
                          {fromCoach && (
                            <span className="rounded-full bg-app-accent/15 px-1.5 py-px text-[10px] font-semibold text-app-accent">
                              Trainer
                            </span>
                          )}
                        </p>
                      )}
                      <RichText text={message.body} className="text-sm" />
                      <p className={`mt-1 flex items-center gap-2 text-[10px] ${own ? "justify-end opacity-75" : "text-app-faint"}`}>
                        {formatRelative(message.created_at)}
                        {(own || isCoach) && (
                          <button
                            type="button"
                            onClick={() => handleDeleteMessage(message)}
                            className="hidden underline group-hover:inline"
                          >
                            löschen
                          </button>
                        )}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={bottomRef} />
          </div>

          <form onSubmit={handleSend} className="flex items-end gap-2 border-t border-app-border p-3">
            <textarea
              value={text}
              onChange={(event) => setText(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  event.currentTarget.form?.requestSubmit();
                }
              }}
              rows={1}
              maxLength={4000}
              placeholder="Nachricht schreiben … (Enter sendet, Umschalt+Enter = neue Zeile)"
              className={`${inputClass} max-h-40 min-h-11 resize-y`}
            />
            <button type="submit" disabled={sending || !text.trim()} aria-label="Senden" className={`${buttonPrimary} h-11 w-11 shrink-0 p-0`}>
              <Icon name="send" className="h-4 w-4" />
            </button>
          </form>
        </Card>
      ) : (
        <Card
          title="Dateien"
          description="Trainingspläne, Meldelisten, Fotos … bis 20 MB pro Datei."
          action={
            <>
              <input
                ref={fileInput}
                type="file"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  event.target.value = "";
                  if (file) handleUpload(file);
                }}
              />
              <button type="button" onClick={() => fileInput.current?.click()} disabled={uploading} className={buttonSecondary}>
                <Icon name="plus" className="h-4 w-4" />
                {uploading ? "Wird hochgeladen..." : "Datei hochladen"}
              </button>
            </>
          }
        >
          {files.length === 0 ? (
            <EmptyState icon="paperclip" title="Noch keine Dateien" />
          ) : (
            <ul className="divide-y divide-app-border">
              {files.map((file) => (
                <li key={file.id} className="flex items-center gap-3 px-5 py-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-app-elevated text-app-muted">
                    <Icon name="paperclip" className="h-4 w-4" />
                  </span>
                  <button type="button" onClick={() => handleOpenFile(file)} className="min-w-0 flex-1 text-left">
                    <span className="block truncate text-sm font-medium text-app-accent hover:underline">{file.file_name}</span>
                    <span className="block text-xs text-app-faint">
                      {formatFileSize(file.size_bytes)} · {formatRelative(file.created_at)}
                    </span>
                  </button>
                  {(file.uploader_id === userId || isCoach) && (
                    <button type="button" onClick={() => handleDeleteFile(file)} className={`${buttonGhost} hover:text-app-bad`}>
                      Löschen
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}
    </div>
  );
}
