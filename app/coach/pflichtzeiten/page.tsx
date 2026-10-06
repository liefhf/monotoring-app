"use client";

import Loader from "@/components/Loader";
import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { PoolLength, QualifyingStandard, formatDate, inputClass } from "@/lib/swim";

/*
 * Pflichtzeiten-Listen, z. B. "DJM 2027" oder
 * "Bezirksmeisterschaften". Die einzelnen Zeiten
 * werden auf der Detailseite einer Liste eingetragen.
 */
export default function PflichtzeitenPage() {
  const [standards, setStandards] = useState<QualifyingStandard[]>([]);
  const [timeCounts, setTimeCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState("");
  const [poolLength, setPoolLength] = useState<PoolLength>(50);
  const [validFrom, setValidFrom] = useState("");
  const [validTo, setValidTo] = useState("");
  const [countBothPools, setCountBothPools] = useState(false);

  useEffect(() => {
    loadStandards();
  }, []);

  async function loadStandards() {
    setLoading(true);

    const { data, error } = await supabase
      .from("qualifying_standards")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      setMessage(`Pflichtzeiten konnten nicht geladen werden: ${error.message}`);
      setLoading(false);
      return;
    }

    setStandards((data ?? []) as QualifyingStandard[]);

    const { data: timeData } = await supabase
      .from("qualifying_times")
      .select("standard_id");

    const counts: Record<string, number> = {};

    for (const row of timeData ?? []) {
      counts[row.standard_id] = (counts[row.standard_id] ?? 0) + 1;
    }

    setTimeCounts(counts);
    setLoading(false);
  }

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!name.trim()) {
      setMessage("Bitte gib einen Namen ein.");
      return;
    }

    if (validFrom && validTo && validFrom > validTo) {
      setMessage("Der Zeitraum-Beginn muss vor dem Ende liegen.");
      return;
    }

    setSaving(true);
    setMessage("");

    const { error } = await supabase.from("qualifying_standards").insert({
      name: name.trim(),
      pool_length: poolLength,
      valid_from: validFrom || null,
      valid_to: validTo || null,
      ...(countBothPools ? { count_both_pools: true } : {}),
    });

    setSaving(false);

    if (error) {
      setMessage(`Liste konnte nicht angelegt werden: ${error.message}`);
      return;
    }

    setMessage(`„${name.trim()}“ wurde angelegt ✅ – klick darauf, um die Zeiten einzutragen.`);
    setName("");
    setValidFrom("");
    setValidTo("");
    await loadStandards();
  }

  async function handleDelete(standard: QualifyingStandard) {
    const confirmed = window.confirm(
      `Möchtest du „${standard.name}“ mit allen eingetragenen Pflichtzeiten löschen?`
    );

    if (!confirmed) {
      return;
    }

    const { error } = await supabase
      .from("qualifying_standards")
      .delete()
      .eq("id", standard.id);

    if (error) {
      setMessage(`Liste konnte nicht gelöscht werden: ${error.message}`);
      return;
    }

    await loadStandards();
  }

  return (
    <main>
      <div className="mx-auto max-w-5xl">
        <header>
          <p className="text-sm text-app-muted">Coach</p>
          <h1 className="mt-1 text-3xl font-bold">Pflichtzeiten</h1>
          <p className="mt-2 text-app-muted">
            Lege eine Liste pro Wettkampf oder Meisterschaft an und trag die Zeiten ein. Die
            Auswertung zeigt dann, wer welche Zeit schon geschafft hat.
          </p>
        </header>

        {message && (
          <div className="mt-6 rounded-xl border border-app-border bg-app-surface p-4 text-sm text-app-text">
            {message}
          </div>
        )}

        <section className="mt-6 overflow-hidden rounded-[20px] border border-app-border bg-app-surface shadow-app">
          <div className="border-b border-app-border px-6 py-4">
            <h2 className="text-lg font-semibold">Neue Pflichtzeiten-Liste</h2>
            <p className="mt-1 text-sm text-app-muted">
              Der Qualifikationszeitraum ist optional. Ist er gesetzt, zählen nur Zeiten aus diesem
              Zeitraum.
            </p>
          </div>

          <form
            onSubmit={handleCreate}
            className="grid gap-4 p-6 md:grid-cols-[1fr_140px_160px_160px_auto] md:items-end"
          >
            <FormField label="Name *">
              <input
                type="text"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="z. B. DJM 2027"
                required
                className={inputClass}
              />
            </FormField>

            <FormField label="Bahnlänge">
              <select
                value={poolLength}
                onChange={(event) => setPoolLength(Number(event.target.value) as PoolLength)}
                className={inputClass}
              >
                <option value={50}>50m-Bahn</option>
                <option value={25}>25m-Bahn</option>
              </select>
            </FormField>

            <FormField label="Zeitraum von">
              <input
                type="date"
                value={validFrom}
                onChange={(event) => setValidFrom(event.target.value)}
                className={inputClass}
              />
            </FormField>

            <FormField label="bis">
              <input
                type="date"
                value={validTo}
                onChange={(event) => setValidTo(event.target.value)}
                className={inputClass}
              />
            </FormField>

            <label className="flex items-center gap-2 text-sm text-app-text">
              <input
                type="checkbox"
                checked={countBothPools}
                onChange={(event) => setCountBothPools(event.target.checked)}
              />
              25m- und 50m-Zeiten zählen
            </label>

            <button
              type="submit"
              disabled={saving}
              className="rounded-xl bg-app-accent px-5 py-3 text-sm font-semibold text-app-accent-ink transition hover:opacity-90 disabled:opacity-50"
            >
              {saving ? "Speichern..." : "Anlegen"}
            </button>
          </form>
        </section>

        <section className="mt-6 overflow-hidden rounded-[20px] border border-app-border bg-app-surface shadow-app">
          <div className="border-b border-app-border px-6 py-4">
            <h2 className="text-lg font-semibold">Meine Listen ({standards.length})</h2>
          </div>

          {loading ? (
            <div className="p-6 text-sm text-app-muted"><Loader /></div>
          ) : standards.length === 0 ? (
            <div className="p-6 text-sm text-app-faint">Noch keine Pflichtzeiten-Listen.</div>
          ) : (
            <ul>
              {standards.map((standard) => (
                <li
                  key={standard.id}
                  className="flex items-center justify-between gap-4 border-b border-app-border px-6 py-4 last:border-b-0 hover:bg-app-elevated/60"
                >
                  <Link href={`/coach/pflichtzeiten/${standard.id}`} className="min-w-0 flex-1">
                    <span className="font-medium text-app-accent hover:text-app-accent">
                      {standard.name}
                    </span>
                    <span className="mt-1 block text-sm text-app-muted">
                      {standard.count_both_pools ? "25m- und 50m-Zeiten" : `${standard.pool_length}m-Bahn`} · {timeCounts[standard.id] ?? 0} Zeiten
                      {standard.valid_from || standard.valid_to
                        ? ` · Zeitraum ${formatDate(standard.valid_from)} – ${formatDate(standard.valid_to)}`
                        : ""}
                    </span>
                  </Link>

                  <button
                    type="button"
                    onClick={() => handleDelete(standard)}
                    className="text-xs text-app-faint transition hover:text-app-bad"
                  >
                    Löschen
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}

function FormField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-app-text">{label}</span>
      {children}
    </label>
  );
}
