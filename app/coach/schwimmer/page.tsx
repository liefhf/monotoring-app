"use client";

import Link from "next/link";
import { FormEvent, useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import {
  Gender,
  Swimmer,
  formatGender,
  getSwimmerName,
  inputClass,
} from "@/lib/swim";

/*
 * Eigene Schwimmer des Coaches. Sie brauchen keinen Login -
 * zum Anlegen reicht der Vorname. Jahrgang und Geschlecht
 * werden erst fuer den Pflichtzeiten-Vergleich gebraucht.
 */
export default function SchwimmerPage() {
  const [swimmers, setSwimmers] = useState<Swimmer[]>([]);
  const [resultCounts, setResultCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [birthYear, setBirthYear] = useState("");
  const [gender, setGender] = useState<"" | Gender>("");

  const firstNameInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadSwimmers();
  }, []);

  async function loadSwimmers() {
    setLoading(true);

    const { data, error } = await supabase
      .from("swimmers")
      .select("id, first_name, last_name, birth_year, gender")
      .order("first_name");

    if (error) {
      setMessage(`Schwimmer konnten nicht geladen werden: ${error.message}`);
      setLoading(false);
      return;
    }

    const loaded = (data ?? []) as Swimmer[];
    setSwimmers(loaded);

    const { data: resultData } = await supabase
      .from("swimmer_results")
      .select("swimmer_id");

    const counts: Record<string, number> = {};

    for (const row of resultData ?? []) {
      counts[row.swimmer_id] = (counts[row.swimmer_id] ?? 0) + 1;
    }

    setResultCounts(counts);
    setLoading(false);
  }

  async function handleAddSwimmer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedFirstName = firstName.trim();

    if (!trimmedFirstName) {
      setMessage("Bitte gib einen Vornamen ein.");
      return;
    }

    const year = birthYear.trim() ? Number(birthYear) : null;

    if (year !== null && (!Number.isInteger(year) || year < 1950 || year > 2100)) {
      setMessage("Bitte gib den Jahrgang vierstellig ein, z. B. 2012.");
      return;
    }

    setSaving(true);
    setMessage("");

    const { error } = await supabase.from("swimmers").insert({
      first_name: trimmedFirstName,
      last_name: lastName.trim() || null,
      birth_year: year,
      gender: gender || null,
    });

    setSaving(false);

    if (error) {
      setMessage(`Schwimmer konnte nicht angelegt werden: ${error.message}`);
      return;
    }

    setMessage(`${trimmedFirstName} wurde angelegt ✅`);
    setFirstName("");
    setLastName("");
    setBirthYear("");
    setGender("");
    firstNameInput.current?.focus();

    await loadSwimmers();
  }

  async function handleDelete(swimmer: Swimmer) {
    const confirmed = window.confirm(
      `Möchtest du ${getSwimmerName(swimmer)} wirklich löschen? Alle eingetragenen Zeiten werden ebenfalls gelöscht.`
    );

    if (!confirmed) {
      return;
    }

    const { error } = await supabase
      .from("swimmers")
      .delete()
      .eq("id", swimmer.id);

    if (error) {
      setMessage(`Schwimmer konnte nicht gelöscht werden: ${error.message}`);
      return;
    }

    setMessage(`${getSwimmerName(swimmer)} wurde gelöscht.`);
    await loadSwimmers();
  }

  return (
    <main>
      <div className="mx-auto max-w-5xl">
        <header>
          <p className="text-sm text-app-muted">Coach</p>
          <h1 className="mt-1 text-3xl font-bold">Meine Schwimmer</h1>
          <p className="mt-2 text-app-muted">
            Schwimmer anlegen, Zeiten eintragen und mit den{" "}
            <Link href="/coach/pflichtzeiten" className="text-app-accent hover:text-app-accent">
              Pflichtzeiten
            </Link>{" "}
            vergleichen.
          </p>
        </header>

        {message && (
          <div className="mt-6 rounded-xl border border-app-border bg-app-surface p-4 text-sm text-app-text">
            {message}
          </div>
        )}

        <section className="mt-6 overflow-hidden rounded-2xl border border-app-border bg-app-surface">
          <div className="border-b border-app-border px-6 py-4">
            <h2 className="text-lg font-semibold">Schwimmer anlegen</h2>
            <p className="mt-1 text-sm text-app-muted">
              Nur der Vorname ist Pflicht. Jahrgang und Geschlecht kannst du auch später ergänzen –
              sie werden für den Vergleich mit den Pflichtzeiten gebraucht.
            </p>
          </div>

          <form
            onSubmit={handleAddSwimmer}
            className="grid gap-4 p-6 md:grid-cols-[1fr_1fr_120px_150px_auto] md:items-end"
          >
            <FormField label="Vorname *">
              <input
                ref={firstNameInput}
                type="text"
                value={firstName}
                onChange={(event) => setFirstName(event.target.value)}
                placeholder="z. B. Lena"
                required
                autoFocus
                className={inputClass}
              />
            </FormField>

            <FormField label="Nachname">
              <input
                type="text"
                value={lastName}
                onChange={(event) => setLastName(event.target.value)}
                className={inputClass}
              />
            </FormField>

            <FormField label="Jahrgang">
              <input
                type="number"
                inputMode="numeric"
                value={birthYear}
                onChange={(event) => setBirthYear(event.target.value)}
                placeholder="2012"
                className={inputClass}
              />
            </FormField>

            <FormField label="Geschlecht">
              <select
                value={gender}
                onChange={(event) => setGender(event.target.value as "" | Gender)}
                className={inputClass}
              >
                <option value="">–</option>
                <option value="female">weiblich</option>
                <option value="male">männlich</option>
              </select>
            </FormField>

            <button
              type="submit"
              disabled={saving}
              className="rounded-xl bg-app-accent px-5 py-3 text-sm font-semibold text-app-accent-ink transition hover:opacity-90 disabled:opacity-50"
            >
              {saving ? "Speichern..." : "Anlegen"}
            </button>
          </form>
        </section>

        <section className="mt-6 overflow-hidden rounded-2xl border border-app-border bg-app-surface">
          <div className="border-b border-app-border px-6 py-4">
            <h2 className="text-lg font-semibold">
              Alle Schwimmer ({swimmers.length})
            </h2>
          </div>

          {loading ? (
            <div className="p-6 text-sm text-app-muted">Schwimmer werden geladen...</div>
          ) : swimmers.length === 0 ? (
            <div className="p-6 text-sm text-app-faint">
              Noch keine Schwimmer angelegt. Trag oben den ersten Vornamen ein.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[520px] text-left text-sm">
                <thead className="border-b border-app-border bg-app-bg/50 text-app-muted">
                  <tr>
                    <th className="px-6 py-3 font-medium">Name</th>
                    <th className="px-4 py-3 font-medium">Jahrgang</th>
                    <th className="px-4 py-3 font-medium">Geschlecht</th>
                    <th className="px-4 py-3 font-medium">Zeiten</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>

                <tbody>
                  {swimmers.map((swimmer) => (
                    <tr
                      key={swimmer.id}
                      className="border-b border-app-border last:border-b-0 hover:bg-app-elevated/60"
                    >
                      <td className="px-6 py-3">
                        <Link
                          href={`/coach/schwimmer/${swimmer.id}`}
                          className="font-medium text-app-accent hover:text-app-accent"
                        >
                          {getSwimmerName(swimmer)}
                        </Link>
                      </td>
                      <td className="px-4 py-3">{swimmer.birth_year ?? "–"}</td>
                      <td className="px-4 py-3">{formatGender(swimmer.gender)}</td>
                      <td className="px-4 py-3 text-app-muted">
                        {resultCounts[swimmer.id] ?? 0}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => handleDelete(swimmer)}
                          className="text-xs text-app-faint transition hover:text-app-bad"
                        >
                          Löschen
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
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
