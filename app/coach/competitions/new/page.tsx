"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function NewCompetitionPage() {
  const router = useRouter();

  const [name, setName] =
    useState("");

  const [
    startDate,
    setStartDate,
  ] = useState("");

  const [
    endDate,
    setEndDate,
  ] = useState("");

  const [
    location,
    setLocation,
  ] = useState("");

  const [
    saving,
    setSaving,
  ] = useState(false);

  const [error, setError] =
    useState("");

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setError("");

    if (
      !name.trim() ||
      !startDate ||
      !location.trim()
    ) {
      setError(
        "Bitte fülle alle Pflichtfelder aus."
      );

      return;
    }

    if (
      endDate &&
      endDate < startDate
    ) {
      setError(
        "Das Enddatum darf nicht vor dem Startdatum liegen."
      );

      return;
    }

    setSaving(true);

    const {
      data: { user },
      error: userError,
    } =
      await supabase.auth.getUser();

    if (
      userError ||
      !user
    ) {
      setError(
        "Coach konnte nicht geladen werden."
      );

      setSaving(false);
      return;
    }

    const { error: insertError } =
      await supabase
        .from(
          "competitions"
        )
        .insert({
          coach_id:
            user.id,

          name:
            name.trim(),

          start_date:
            startDate,

          end_date:
            endDate ||
            null,

          location:
            location.trim(),

          status:
            "planned",
        });

    if (insertError) {
      setError(
        `Wettkampf konnte nicht gespeichert werden: ${insertError.message}`
      );

      setSaving(false);
      return;
    }

    setSaving(false);

    router.push(
      "/coach/competitions"
    );

    router.refresh();
  }

  return (
    <div className="mx-auto max-w-2xl">
      <Link
        href="/coach/competitions"
        className="text-sm text-app-muted transition hover:text-app-heading"
      >
        ← Zurück
      </Link>

      <div className="mt-5">
        <h1 className="text-2xl font-bold text-app-heading sm:text-3xl">
          Wettkampf anlegen
        </h1>
      </div>

      <form
        onSubmit={
          handleSubmit
        }
        className="mt-6 space-y-5 rounded-3xl border border-app-border bg-app-surface shadow-app p-5 sm:p-6"
      >
        <div>
          <label
            htmlFor="competition-name"
            className="mb-2 block text-sm font-medium text-app-text"
          >
            Name des Wettkampfs
          </label>

          <input
            id="competition-name"
            type="text"
            value={name}
            onChange={(
              event
            ) =>
              setName(
                event.target.value
              )
            }
            required
            placeholder="z. B. Internationaler Hochtaunus-Cup"
            className="w-full rounded-xl border border-app-border bg-app-bg px-4 py-3 text-app-heading outline-none transition placeholder:text-app-faint focus:border-app-accent"
          />
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label
              htmlFor="start-date"
              className="mb-2 block text-sm font-medium text-app-text"
            >
              Startdatum
            </label>

            <input
              id="start-date"
              type="date"
              value={
                startDate
              }
              onChange={(
                event
              ) =>
                setStartDate(
                  event.target.value
                )
              }
              required
              className="w-full rounded-xl border border-app-border bg-app-bg px-4 py-3 text-app-heading outline-none transition focus:border-app-accent"
            />
          </div>

          <div>
            <label
              htmlFor="end-date"
              className="mb-2 block text-sm font-medium text-app-text"
            >
              Enddatum{" "}
              <span className="text-app-faint">
                optional
              </span>
            </label>

            <input
              id="end-date"
              type="date"
              value={endDate}
              min={
                startDate ||
                undefined
              }
              onChange={(
                event
              ) =>
                setEndDate(
                  event.target.value
                )
              }
              className="w-full rounded-xl border border-app-border bg-app-bg px-4 py-3 text-app-heading outline-none transition focus:border-app-accent"
            />
          </div>
        </div>

        <div>
          <label
            htmlFor="competition-location"
            className="mb-2 block text-sm font-medium text-app-text"
          >
            Ort
          </label>

          <input
            id="competition-location"
            type="text"
            value={
              location
            }
            onChange={(
              event
            ) =>
              setLocation(
                event.target.value
              )
            }
            required
            placeholder="z. B. Oberursel"
            className="w-full rounded-xl border border-app-border bg-app-bg px-4 py-3 text-app-heading outline-none transition placeholder:text-app-faint focus:border-app-accent"
          />
        </div>

        {error && (
          <div className="rounded-xl border border-app-bad/40 bg-app-bad/10 p-3 text-sm text-app-bad">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={
            saving
          }
          className="w-full rounded-xl bg-app-accent px-5 py-3 font-semibold text-app-accent-ink transition hover:bg-app-accent disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
        >
          {saving
            ? "Wird gespeichert..."
            : "Wettkampf speichern"}
        </button>
      </form>
    </div>
  );
}