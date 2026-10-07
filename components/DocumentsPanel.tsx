"use client";

import { FormEvent, useState } from "react";
import { supabase } from "@/lib/supabase";
import { LoadResult, checkWrite, toLoadResult, useBusy, useKeyedLoad, writeErrorText } from "@/lib/loadState";
import { toDateKey } from "@/lib/community";
import { AthleteDocument, DOC_TYPE_LABELS, DocType, documentStatus } from "@/lib/health";
import { EmptyState, FormField, Modal, Notice, buttonGhost, buttonPrimary, buttonSecondary, inputClass } from "@/components/ui";

/*
 * Dokumente je Athlet: Sportattest, Einverstaendnisse, Startpass ...
 * mit optionalem Ablaufdatum (Erinnerung 30 Tage vorher, auch auf dem
 * Dashboard) und optionaler Datei im privaten Speicher.
 * Tabelle athlete_documents (supabase/gesundheit_dokumente.sql).
 */

const BUCKET = "athlete-documents";

const STATUS_STYLE = {
  gueltig: "bg-app-good/15 text-app-good",
  laeuft_ab: "bg-app-soon/15 text-app-soon",
  abgelaufen: "bg-app-bad/15 text-app-bad",
  unbefristet: "bg-app-elevated text-app-muted",
} as const;

/* Grenzen wie in Skript 23 (Bucket-Einstellung) */
export const MAX_FILE_BYTES = 10 * 1024 * 1024;
export const ALLOWED_TYPES = ["application/pdf", "image/jpeg", "image/png", "image/webp", "image/heic"];

export function validateFile(file: { size: number; type: string }): string | null {
  if (file.size > MAX_FILE_BYTES) return "Die Datei ist größer als 10 MB.";
  if (!ALLOWED_TYPES.includes(file.type)) return "Nur PDF oder Foto (JPG, PNG, WebP, HEIC) sind erlaubt.";
  return null;
}

async function fetchDocs(swimmerId: string): Promise<LoadResult<AthleteDocument[]>> {
  const res = await supabase.from("athlete_documents").select("*").eq("swimmer_id", swimmerId).order("created_at", { ascending: false });
  return toLoadResult(res as { data: AthleteDocument[] | null; error: { code?: string } | null }, []);
}

export default function DocumentsPanel({ swimmerId }: { swimmerId: string }) {
  const [today] = useState(() => toDateKey(new Date()));
  const { state, reload } = useKeyedLoad(swimmerId, fetchDocs);
  const [message, setMessage] = useState<{ tone: "good" | "bad" | "warn"; text: string } | null>(null);
  const [open, setOpen] = useState(false);
  const [docType, setDocType] = useState<DocType>("sportattest");
  const [title, setTitle] = useState("");
  const [validUntil, setValidUntil] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [missingFiles, setMissingFiles] = useState<string[]>([]);
  // Datei, deren Eintrag geloescht wurde, deren Entfernen aber fehlschlug
  const [leftover, setLeftover] = useState<string | null>(null);
  const { busy: saving, run } = useBusy();

  async function handleSave(event: FormEvent) {
    event.preventDefault();
    setFormError(null);
    if (file) {
      const invalid = validateFile(file);
      if (invalid) {
        setFormError(invalid);
        return;
      }
    }
    await run(async () => {
      let filePath: string | null = null;
      if (file) {
        const safeName = file.name.replace(/[^\w.-]+/g, "_").slice(-80);
        filePath = `${swimmerId}/${Date.now()}-${safeName}`;
        const { error: uploadError } = await supabase.storage.from(BUCKET).upload(filePath, file, { contentType: file.type, upsert: false });
        if (uploadError) {
          setFormError("Datei konnte nicht hochgeladen werden. Es wurde nichts gespeichert. (Skript 23 ausgeführt? Berechtigung?)");
          return;
        }
      }
      const res = await supabase
        .from("athlete_documents")
        .insert({
          swimmer_id: swimmerId,
          doc_type: docType,
          title: title.trim() || DOC_TYPE_LABELS[docType],
          valid_until: validUntil || null,
          file_path: filePath,
        })
        .select("id");
      const check = checkWrite(res);
      if (!check.ok) {
        // Ausgleich: gerade hochgeladene Datei wieder entfernen, damit keine verwaiste Datei bleibt
        let cleaned = true;
        if (filePath) {
          const { error: removeError } = await supabase.storage.from(BUCKET).remove([filePath]);
          cleaned = !removeError;
        }
        setFormError(
          `${writeErrorText(check, "Dokument")}${cleaned ? "" : " Die hochgeladene Datei konnte nicht wieder entfernt werden (sie bleibt privat gespeichert)."}`
        );
        return;
      }
      setOpen(false);
      setTitle("");
      setValidUntil("");
      setFile(null);
      setMessage({ tone: "good", text: "Dokument gespeichert." });
      await reload();
    });
  }

  async function openFile(path: string) {
    const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, 60);
    if (error || !data) {
      const notFound = /not.?found|404|object/i.test(error?.message ?? "");
      if (notFound) setMissingFiles((list) => [...list, path]);
      setMessage({
        tone: "bad",
        text: notFound ? "Die Datei fehlt im Speicher. Der Eintrag ist noch da – bitte die Datei neu hochladen." : "Datei konnte nicht geöffnet werden. Bitte erneut versuchen.",
      });
      return;
    }
    window.open(data.signedUrl, "_blank", "noopener");
  }

  async function removeFile(path: string) {
    const { error } = await supabase.storage.from(BUCKET).remove([path]);
    if (error) {
      setLeftover(path);
      return false;
    }
    setLeftover(null);
    return true;
  }

  async function remove(doc: AthleteDocument) {
    if (!window.confirm(`„${doc.title}“ wirklich löschen?`)) return;
    await run(async () => {
      // Zuerst den Eintrag: schlaegt das fehl, bleibt alles unveraendert.
      const res = await supabase.from("athlete_documents").delete().eq("id", doc.id).select("id");
      const check = checkWrite(res);
      if (!check.ok) {
        setMessage({ tone: "bad", text: writeErrorText(check, "Löschen") });
        await reload();
        return;
      }
      const fileOk = doc.file_path ? await removeFile(doc.file_path) : true;
      setMessage(
        fileOk
          ? { tone: "good", text: "Dokument gelöscht." }
          : { tone: "warn", text: "Eintrag gelöscht, aber die Datei konnte nicht entfernt werden. Bitte „Datei erneut löschen“ tippen." }
      );
      await reload();
    });
  }

  if (state.status === "loading") return <div className="mt-6 h-32 animate-pulse rounded-[20px] bg-app-elevated" aria-label="Wird geladen" />;

  if (state.status === "missing") {
    return (
      <div className="mt-6">
        <Notice tone="warn">
          Dokumente sind noch nicht eingerichtet. Bitte im Supabase SQL-Editor <b>supabase/gesundheit_dokumente.sql</b> ausführen (Skript 23).
        </Notice>
      </div>
    );
  }

  if (state.status === "error") {
    return (
      <div className="mt-6 space-y-3">
        <Notice tone="bad">Dokumente konnten nicht geladen werden.</Notice>
        <button type="button" className={buttonSecondary} onClick={() => void reload()}>
          Erneut laden
        </button>
      </div>
    );
  }

  const docs = state.data;

  return (
    <section className="mt-6 rounded-[20px] border border-app-border/60 bg-app-surface p-4 shadow-app sm:p-[22px]">
      <div className="flex items-center gap-3">
        <h2 className="flex-1 text-[15px] font-bold text-app-heading">Dokumente</h2>
        <button type="button" onClick={() => setOpen(true)} className={buttonPrimary}>
          + Dokument
        </button>
      </div>
      {message && (
        <div className="mt-3">
          <Notice tone={message.tone}>{message.text}</Notice>
        </div>
      )}
      {leftover && (
        <button type="button" disabled={saving} className={`${buttonSecondary} mt-3`} onClick={() => void run(async () => {
          const ok = await removeFile(leftover);
          setMessage(ok ? { tone: "good", text: "Datei entfernt." } : { tone: "bad", text: "Datei konnte wieder nicht entfernt werden. Später erneut versuchen." });
        })}>
          Datei erneut löschen
        </button>
      )}
      {docs.length === 0 ? (
        <EmptyState icon="paperclip" title="Keine Dokumente">
          Sportattest, Einverständnisse oder Startpass mit Ablaufdatum hinterlegen – die App erinnert 30 Tage vorher.
        </EmptyState>
      ) : (
        <ul className="mt-3 divide-y divide-app-border/60">
          {docs.map((doc) => {
            const { status, daysLeft } = documentStatus(doc, today);
            return (
              <li key={doc.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-3">
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold text-app-heading">{doc.title}</span>
                  <span className="block text-[13px] text-app-muted">
                    {DOC_TYPE_LABELS[doc.doc_type]}
                    {doc.valid_until ? ` · gültig bis ${new Date(`${doc.valid_until}T12:00:00`).toLocaleDateString("de-DE")}` : ""}
                  </span>
                </span>
                <span className={`rounded-full px-2.5 py-1 text-xs font-extrabold ${STATUS_STYLE[status]}`}>
                  {status === "abgelaufen" ? "abgelaufen" : status === "laeuft_ab" ? `noch ${daysLeft} Tage` : status === "gueltig" ? "gültig" : "unbefristet"}
                </span>
                {doc.file_path && !missingFiles.includes(doc.file_path) && (
                  <button type="button" onClick={() => openFile(doc.file_path!)} className={buttonGhost}>
                    Öffnen
                  </button>
                )}
                {doc.file_path && missingFiles.includes(doc.file_path) && <span className="text-xs font-bold text-app-bad">Datei fehlt</span>}
                <button type="button" disabled={saving} onClick={() => remove(doc)} className={`${buttonGhost} hover:text-app-bad`}>
                  Löschen
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <Modal open={open} title="Dokument hinzufügen" onClose={() => setOpen(false)}>
        <form onSubmit={handleSave} className="grid gap-3 sm:grid-cols-2">
          <FormField label="Art">
            <select className={inputClass} value={docType} onChange={(e) => setDocType(e.target.value as DocType)}>
              {(Object.keys(DOC_TYPE_LABELS) as DocType[]).map((type) => (
                <option key={type} value={type}>
                  {DOC_TYPE_LABELS[type]}
                </option>
              ))}
            </select>
          </FormField>
          <FormField label="Gültig bis" hint="leer = unbefristet">
            <input type="date" className={inputClass} value={validUntil} onChange={(e) => setValidUntil(e.target.value)} />
          </FormField>
          <FormField label="Bezeichnung" className="sm:col-span-2">
            <input className={inputClass} value={title} onChange={(e) => setTitle(e.target.value)} placeholder={DOC_TYPE_LABELS[docType]} />
          </FormField>
          <FormField label="Datei (optional)" className="sm:col-span-2" hint="PDF oder Foto, max. 10 MB, privat gespeichert">
            <input type="file" accept="application/pdf,image/jpeg,image/png,image/webp,image/heic" className={inputClass} onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          </FormField>
          {formError && (
            <div className="sm:col-span-2">
              <Notice tone="bad">{formError}</Notice>
            </div>
          )}
          <button type="submit" disabled={saving} className={`${buttonPrimary} sm:col-span-2`}>
            {saving ? "Speichern …" : "Speichern"}
          </button>
        </form>
      </Modal>
    </section>
  );
}
