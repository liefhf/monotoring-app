"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { isMissingTable, supabase } from "@/lib/supabase";
import { toDateKey } from "@/lib/community";
import { AthleteDocument, DOC_TYPE_LABELS, DocType, documentStatus } from "@/lib/health";
import { EmptyState, FormField, Modal, Notice, buttonGhost, buttonPrimary, inputClass } from "@/components/ui";

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

export default function DocumentsPanel({ swimmerId }: { swimmerId: string }) {
  const [today] = useState(() => toDateKey(new Date()));
  const [docs, setDocs] = useState<AthleteDocument[] | null>(null);
  const [missing, setMissing] = useState(false);
  const [message, setMessage] = useState<{ tone: "good" | "bad"; text: string } | null>(null);
  const [open, setOpen] = useState(false);
  const [docType, setDocType] = useState<DocType>("sportattest");
  const [title, setTitle] = useState("");
  const [validUntil, setValidUntil] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const { data, error } = await supabase.from("athlete_documents").select("*").eq("swimmer_id", swimmerId).order("created_at", { ascending: false });
    if (error) {
      setMissing(isMissingTable(error.code));
      setDocs([]);
      return;
    }
    setDocs((data ?? []) as AthleteDocument[]);
  }, [swimmerId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Daten beim Oeffnen laden
    load();
  }, [load]);

  async function handleSave(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    let filePath: string | null = null;
    if (file) {
      const safeName = file.name.replace(/[^\w.-]+/g, "_");
      filePath = `${swimmerId}/${Date.now()}-${safeName}`;
      const { error: uploadError } = await supabase.storage.from(BUCKET).upload(filePath, file);
      if (uploadError) {
        setSaving(false);
        setMessage({ tone: "bad", text: "Datei konnte nicht hochgeladen werden. Ist Skript 23 ausgeführt?" });
        return;
      }
    }
    const { error } = await supabase.from("athlete_documents").insert({
      swimmer_id: swimmerId,
      doc_type: docType,
      title: title.trim() || DOC_TYPE_LABELS[docType],
      valid_until: validUntil || null,
      file_path: filePath,
    });
    setSaving(false);
    if (error) {
      setMessage({ tone: "bad", text: "Dokument konnte nicht gespeichert werden." });
      return;
    }
    setOpen(false);
    setTitle("");
    setValidUntil("");
    setFile(null);
    setMessage({ tone: "good", text: "Dokument gespeichert." });
    load();
  }

  async function openFile(path: string) {
    const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, 60);
    if (error || !data) {
      setMessage({ tone: "bad", text: "Datei konnte nicht geöffnet werden." });
      return;
    }
    window.open(data.signedUrl, "_blank", "noopener");
  }

  async function remove(doc: AthleteDocument) {
    if (!window.confirm(`„${doc.title}“ wirklich löschen?`)) return;
    if (doc.file_path) await supabase.storage.from(BUCKET).remove([doc.file_path]);
    const { error } = await supabase.from("athlete_documents").delete().eq("id", doc.id);
    setMessage(error ? { tone: "bad", text: "Löschen fehlgeschlagen." } : { tone: "good", text: "Dokument gelöscht." });
    if (!error) load();
  }

  if (docs === null) return <div className="mt-6 h-32 animate-pulse rounded-[20px] bg-app-elevated" aria-label="Wird geladen" />;

  if (missing) {
    return (
      <div className="mt-6">
        <Notice tone="warn">
          Dokumente sind noch nicht eingerichtet. Bitte im Supabase SQL-Editor <b>supabase/gesundheit_dokumente.sql</b> ausführen (Skript 23).
        </Notice>
      </div>
    );
  }

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
                {doc.file_path && (
                  <button type="button" onClick={() => openFile(doc.file_path!)} className={buttonGhost}>
                    Öffnen
                  </button>
                )}
                <button type="button" onClick={() => remove(doc)} className={`${buttonGhost} hover:text-app-bad`}>
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
          <FormField label="Datei (optional)" className="sm:col-span-2" hint="PDF oder Foto, nur für dich sichtbar">
            <input type="file" accept="application/pdf,image/*" className={inputClass} onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          </FormField>
          <button type="submit" disabled={saving} className={`${buttonPrimary} sm:col-span-2`}>
            {saving ? "Speichern …" : "Speichern"}
          </button>
        </form>
      </Modal>
    </section>
  );
}
