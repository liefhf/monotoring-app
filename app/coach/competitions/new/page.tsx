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
        className="text-sm text-slate-400 transition hover:text-white"
      >
        ← Zurück
      </Link>

      <div className="mt-5">
        <h1 className="text-2xl font-bold text-white sm:text-3xl">
          Wettkampf anlegen
        </h1>
      </div>

      <form
        onSubmit={
          handleSubmit
        }
        className="mt-6 space-y-5 rounded-2xl border border-slate-800 bg-slate-900 p-5 sm:p-6"
      >
        <div>
          <label
            htmlFor="competition-name"
            className="mb-2 block text-sm font-medium text-slate-300"
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
            className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition placeholder:text-slate-600 focus:border-sky-500"
          />
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label
              htmlFor="start-date"
              className="mb-2 block text-sm font-medium text-slate-300"
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
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-sky-500"
            />
          </div>

          <div>
            <label
              htmlFor="end-date"
              className="mb-2 block text-sm font-medium text-slate-300"
            >
              Enddatum{" "}
              <span className="text-slate-500">
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
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-sky-500"
            />
          </div>
        </div>

        <div>
          <label
            htmlFor="competition-location"
            className="mb-2 block text-sm font-medium text-slate-300"
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
            className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition placeholder:text-slate-600 focus:border-sky-500"
          />
        </div>

        {error && (
          <div className="rounded-xl border border-red-900 bg-red-950/30 p-3 text-sm text-red-300">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={
            saving
          }
          className="w-full rounded-xl bg-sky-500 px-5 py-3 font-semibold text-white transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
        >
          {saving
            ? "Wird gespeichert..."
            : "Wettkampf speichern"}
        </button>
      </form>
    </div>
  );
}