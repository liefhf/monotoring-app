"use client";

import Link from "next/link";
import { useParams } from "next/navigation";

type WeekPlan = {
  id: number;
  weekNumber: number;
  start: string;
  end: string;
  focus: string;
  targetMeters: number;
  waterSessions: number;
  landSessions: number;
};

export default function MesoPage() {
  const params = useParams();
  const mesoId = Number(params.id);

  const mesoData = {
    id: mesoId,
    name: `Meso ${mesoId}`,
    macro: "Makrozyklus 1",
    start: "01.09.2026",
    end: "27.09.2026",
    focus: "GA1 & Technik",
  };

  const weeks: WeekPlan[] = [
    {
      id: 1,
      weekNumber: 36,
      start: "31.08.",
      end: "06.09.",
      focus: "Grundlagenausdauer & Technik",
      targetMeters: 32000,
      waterSessions: 6,
      landSessions: 2,
    },
    {
      id: 2,
      weekNumber: 37,
      start: "07.09.",
      end: "13.09.",
      focus: "GA1 Umfang",
      targetMeters: 35000,
      waterSessions: 7,
      landSessions: 2,
    },
    {
      id: 3,
      weekNumber: 38,
      start: "14.09.",
      end: "20.09.",
      focus: "GA1 / Technik unter Ermüdung",
      targetMeters: 38000,
      waterSessions: 7,
      landSessions: 2,
    },
    {
      id: 4,
      weekNumber: 39,
      start: "21.09.",
      end: "27.09.",
      focus: "Entlastung & Technik",
      targetMeters: 28000,
      waterSessions: 6,
      landSessions: 1,
    },
  ];

  return (
    <div className="mx-auto w-full max-w-[1500px]">
      <div className="mb-8">
        <Link
          href="/coach/training/season"
          className="text-sm text-app-muted hover:text-app-heading"
        >
          ← Zurück zur Jahresplanung
        </Link>

        <div className="mt-4 flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-sm text-app-muted">
              {mesoData.macro}
            </p>

            <h1 className="mt-1 text-3xl font-bold">
              {mesoData.name}
            </h1>

            <p className="mt-2 text-app-muted">
              {mesoData.start} – {mesoData.end}
            </p>
          </div>

          <Link
            href="/coach/training/new"
            className="rounded-xl bg-app-accent px-5 py-3 text-center text-sm font-medium text-app-accent-ink hover:brightness-110"
          >
            + Schnelltraining
          </Link>
        </div>
      </div>

      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-app-border bg-app-surface p-5">
          <p className="text-sm text-app-muted">
            Schwerpunkt
          </p>

          <p className="mt-2 text-lg font-semibold">
            {mesoData.focus}
          </p>
        </div>

        <div className="rounded-2xl border border-app-border bg-app-surface p-5">
          <p className="text-sm text-app-muted">
            Mikrozyklen
          </p>

          <p className="mt-2 text-3xl font-bold">
            {weeks.length}
          </p>
        </div>

        <div className="rounded-2xl border border-app-border bg-app-surface p-5">
          <p className="text-sm text-app-muted">
            Geplanter Gesamtumfang
          </p>

          <p className="mt-2 text-3xl font-bold">
            {(
              weeks.reduce(
                (total, week) => total + week.targetMeters,
                0
              ) / 1000
            ).toLocaleString("de-DE")}{" "}
            km
          </p>
        </div>
      </section>

      <section className="mt-6 rounded-2xl border border-app-border bg-app-surface">
        <div className="border-b border-app-border p-5">
          <h2 className="text-xl font-semibold">
            Mikrozyklen / Wochen
          </h2>

          <p className="mt-1 text-sm text-app-muted">
            Plane den Schwerpunkt und Umfang jeder Trainingswoche.
          </p>
        </div>

        <div className="grid gap-4 p-5 md:grid-cols-2 xl:grid-cols-4">
          {weeks.map((week) => (
            <div
              key={week.id}
              className="rounded-2xl border border-app-border bg-app-bg p-5"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm text-app-faint">
                    {week.start} – {week.end}
                  </p>

                  <h3 className="mt-1 text-xl font-semibold">
                    KW {week.weekNumber}
                  </h3>
                </div>

                <span className="rounded-full bg-app-elevated px-3 py-1 text-xs text-app-text">
                  Mikro
                </span>
              </div>

              <div className="mt-5">
                <p className="text-xs text-app-faint">
                  Wochenschwerpunkt
                </p>

                <p className="mt-1 text-sm font-medium">
                  {week.focus}
                </p>
              </div>

              <div className="mt-5 grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-app-border bg-app-surface p-3">
                  <p className="text-xs text-app-faint">
                    Zielumfang
                  </p>

                  <p className="mt-1 font-semibold">
                    {(
                      week.targetMeters / 1000
                    ).toLocaleString("de-DE")}{" "}
                    km
                  </p>
                </div>

                <div className="rounded-xl border border-app-border bg-app-surface p-3">
                  <p className="text-xs text-app-faint">
                    Wasser
                  </p>

                  <p className="mt-1 font-semibold">
                    {week.waterSessions}
                  </p>
                </div>

                <div className="rounded-xl border border-app-border bg-app-surface p-3">
                  <p className="text-xs text-app-faint">
                    Land
                  </p>

                  <p className="mt-1 font-semibold">
                    {week.landSessions}
                  </p>
                </div>

                <div className="rounded-xl border border-app-border bg-app-surface p-3">
                  <p className="text-xs text-app-faint">
                    Gesamt
                  </p>

                  <p className="mt-1 font-semibold">
                    {week.waterSessions + week.landSessions}
                  </p>
                </div>
              </div>

              <Link
                href={`/coach/training/week/${week.id}`}
                className="mt-5 block rounded-xl bg-app-accent px-4 py-3 text-center text-sm font-medium text-app-accent-ink hover:brightness-110"
              >
                Woche öffnen
              </Link>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-6 rounded-2xl border border-app-border bg-app-surface p-6">
        <h2 className="text-lg font-semibold">
          Periodisierungsstruktur
        </h2>

        <div className="mt-5 flex flex-wrap items-center gap-3 text-sm">
          <Link
            href="/coach/training/season"
            className="rounded-xl border border-app-border px-4 py-3 hover:bg-app-elevated"
          >
            Jahresplanung
          </Link>

          <span className="text-app-faint">→</span>

          <div className="rounded-xl border border-app-border px-4 py-3">
            {mesoData.macro}
          </div>

          <span className="text-app-faint">→</span>

          <div className="rounded-xl bg-app-accent px-4 py-3 font-medium text-app-accent-ink">
            {mesoData.name}
          </div>

          <span className="text-app-faint">→</span>

          <div className="rounded-xl border border-app-border px-4 py-3">
            Mikrozyklus
          </div>

          <span className="text-app-faint">→</span>

          <div className="rounded-xl border border-app-border px-4 py-3">
            Trainingseinheit
          </div>
        </div>
      </section>
    </div>
  );
}