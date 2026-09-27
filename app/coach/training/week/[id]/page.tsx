"use client";

import Link from "next/link";
import { useParams } from "next/navigation";

type TrainingSession = {
  id: number;
  title: string;
  type: "Wasser" | "Land";
  time: string;
  focus: string;
  meters?: number;
};

type TrainingDay = {
  id: number;
  name: string;
  date: string;
  isoDate: string;
  sessions: TrainingSession[];
};

export default function WeekPage() {
  const params = useParams();
  const weekId = Number(params.id);

  const weekData = {
    id: weekId,
    weekNumber: 36,
    start: "31.08.2026",
    end: "06.09.2026",
    mesoId: 1,
    meso: "Meso 1",
    macro: "Makrozyklus 1",
    focus: "Grundlagenausdauer & Technik",
    targetMeters: 32000,
  };

  const days: TrainingDay[] = [
    {
      id: 1,
      name: "Montag",
      date: "31.08.",
      isoDate: "2026-08-31",
      sessions: [
        {
          id: 1,
          title: "GA1 + Technik",
          type: "Wasser",
          time: "06:30",
          focus: "Technik & Grundlagenausdauer",
          meters: 5200,
        },
        {
          id: 2,
          title: "Athletik",
          type: "Land",
          time: "17:00",
          focus: "Rumpf & Stabilität",
        },
      ],
    },
    {
      id: 2,
      name: "Dienstag",
      date: "01.09.",
      isoDate: "2026-09-01",
      sessions: [
        {
          id: 3,
          title: "GA1 Umfang",
          type: "Wasser",
          time: "06:30",
          focus: "Aerobe Ausdauer",
          meters: 5800,
        },
      ],
    },
    {
      id: 3,
      name: "Mittwoch",
      date: "02.09.",
      isoDate: "2026-09-02",
      sessions: [
        {
          id: 4,
          title: "Technik + Beine",
          type: "Wasser",
          time: "07:00",
          focus: "Wasserlage & Beinarbeit",
          meters: 4800,
        },
        {
          id: 5,
          title: "Krafttraining",
          type: "Land",
          time: "17:30",
          focus: "Grundkraft",
        },
      ],
    },
    {
      id: 4,
      name: "Donnerstag",
      date: "03.09.",
      isoDate: "2026-09-03",
      sessions: [
        {
          id: 6,
          title: "GA1 / GA2",
          type: "Wasser",
          time: "06:30",
          focus: "Belastungswechsel",
          meters: 5600,
        },
      ],
    },
    {
      id: 5,
      name: "Freitag",
      date: "04.09.",
      isoDate: "2026-09-04",
      sessions: [
        {
          id: 7,
          title: "Technik + Geschwindigkeit",
          type: "Wasser",
          time: "07:00",
          focus: "Technik unter Tempo",
          meters: 4600,
        },
      ],
    },
    {
      id: 6,
      name: "Samstag",
      date: "05.09.",
      isoDate: "2026-09-05",
      sessions: [
        {
          id: 8,
          title: "Lange Einheit",
          type: "Wasser",
          time: "08:00",
          focus: "GA1 Umfang",
          meters: 6000,
        },
      ],
    },
    {
      id: 7,
      name: "Sonntag",
      date: "06.09.",
      isoDate: "2026-09-06",
      sessions: [],
    },
  ];

  const totalMeters = days.reduce(
    (weekTotal, day) =>
      weekTotal +
      day.sessions.reduce(
        (dayTotal, session) => dayTotal + (session.meters ?? 0),
        0
      ),
    0
  );

  const waterSessions = days.reduce(
    (total, day) =>
      total +
      day.sessions.filter((session) => session.type === "Wasser").length,
    0
  );

  const landSessions = days.reduce(
    (total, day) =>
      total +
      day.sessions.filter((session) => session.type === "Land").length,
    0
  );

  function getNewTrainingLink(day: TrainingDay) {
    return `/coach/training/new?week=${weekId}&day=${day.isoDate}&meso=${weekData.mesoId}`;
  }

  function getExistingTrainingLink(
    day: TrainingDay,
    session: TrainingSession
  ) {
    return `/coach/training/new?week=${weekId}&day=${day.isoDate}&meso=${weekData.mesoId}&session=${session.id}`;
  }

  return (
    <div className="mx-auto w-full max-w-[1700px]">
      <div className="mb-8">
        <Link
          href={`/coach/training/meso/${weekData.mesoId}`}
          className="text-sm text-app-muted hover:text-app-heading"
        >
          ← Zurück zum Mesozyklus
        </Link>

        <div className="mt-4 flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-sm text-app-muted">
              {weekData.macro} · {weekData.meso}
            </p>

            <h1 className="mt-1 text-3xl font-bold">
              KW {weekData.weekNumber}
            </h1>

            <p className="mt-2 text-app-muted">
              {weekData.start} – {weekData.end}
            </p>
          </div>

          <Link
            href={`/coach/training/new?week=${weekId}&meso=${weekData.mesoId}`}
            className="rounded-xl bg-app-accent px-5 py-3 text-center text-sm font-medium text-app-accent-ink hover:brightness-110"
          >
            + Schnelltraining
          </Link>
        </div>
      </div>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <div className="rounded-2xl border border-app-border bg-app-surface p-5 xl:col-span-2">
          <p className="text-sm text-app-muted">
            Wochenschwerpunkt
          </p>

          <p className="mt-2 text-lg font-semibold">
            {weekData.focus}
          </p>
        </div>

        <div className="rounded-2xl border border-app-border bg-app-surface p-5">
          <p className="text-sm text-app-muted">
            Zielumfang
          </p>

          <p className="mt-2 text-2xl font-bold">
            {(weekData.targetMeters / 1000).toLocaleString("de-DE")} km
          </p>
        </div>

        <div className="rounded-2xl border border-app-border bg-app-surface p-5">
          <p className="text-sm text-app-muted">
            Geplant
          </p>

          <p className="mt-2 text-2xl font-bold">
            {(totalMeters / 1000).toLocaleString("de-DE")} km
          </p>
        </div>

        <div className="rounded-2xl border border-app-border bg-app-surface p-5">
          <p className="text-sm text-app-muted">
            Einheiten
          </p>

          <p className="mt-2 text-2xl font-bold">
            {waterSessions + landSessions}
          </p>

          <p className="mt-1 text-xs text-app-faint">
            {waterSessions} Wasser · {landSessions} Land
          </p>
        </div>
      </section>

      <section className="mt-6">
        <div className="mb-4">
          <h2 className="text-xl font-semibold">
            Wochenplan
          </h2>

          <p className="mt-1 text-sm text-app-muted">
            Montag bis Sonntag mit allen geplanten
            Trainingseinheiten.
          </p>
        </div>

        <div className="grid gap-4 xl:grid-cols-7">
          {days.map((day) => (
            <div
              key={day.id}
              className="min-h-[420px] rounded-2xl border border-app-border bg-app-surface"
            >
              <div className="border-b border-app-border p-4">
                <p className="text-xs text-app-faint">
                  {day.date}
                </p>

                <h3 className="mt-1 font-semibold">
                  {day.name}
                </h3>
              </div>

              <div className="space-y-3 p-3">
                {day.sessions.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-app-border p-4 text-center">
                    <p className="text-sm text-app-faint">
                      Keine Einheit
                    </p>

                    <Link
                      href={getNewTrainingLink(day)}
                      className="mt-3 inline-block text-sm text-app-text hover:text-app-heading"
                    >
                      + Training
                    </Link>
                  </div>
                ) : (
                  day.sessions.map((session) => (
                    <div
                      key={session.id}
                      className="rounded-xl border border-app-border bg-app-bg p-3"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span
                          className={`rounded-full px-2 py-1 text-[10px] font-medium ${
                            session.type === "Wasser"
                              ? "bg-app-accent/10 text-app-accent"
                              : "bg-app-good/10 text-app-good"
                          }`}
                        >
                          {session.type}
                        </span>

                        <span className="text-xs text-app-faint">
                          {session.time}
                        </span>
                      </div>

                      <h4 className="mt-3 text-sm font-semibold">
                        {session.title}
                      </h4>

                      <p className="mt-1 text-xs leading-5 text-app-faint">
                        {session.focus}
                      </p>

                      {session.type === "Wasser" &&
                        session.meters && (
                          <p className="mt-3 text-sm font-medium">
                            {session.meters.toLocaleString(
                              "de-DE"
                            )}{" "}
                            m
                          </p>
                        )}

                      <Link
                        href={getExistingTrainingLink(
                          day,
                          session
                        )}
                        className="mt-3 block rounded-lg border border-app-border px-3 py-2 text-center text-xs hover:bg-app-elevated"
                      >
                        Einheit öffnen
                      </Link>
                    </div>
                  ))
                )}

                {day.sessions.length > 0 && (
                  <Link
                    href={getNewTrainingLink(day)}
                    className="block rounded-xl border border-dashed border-app-border px-3 py-3 text-center text-sm text-app-muted hover:bg-app-elevated hover:text-app-heading"
                  >
                    + weitere Einheit
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-6 rounded-2xl border border-app-border bg-app-surface p-6">
        <h2 className="text-lg font-semibold">
          Struktur
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
            {weekData.macro}
          </div>

          <span className="text-app-faint">→</span>

          <Link
            href={`/coach/training/meso/${weekData.mesoId}`}
            className="rounded-xl border border-app-border px-4 py-3 hover:bg-app-elevated"
          >
            {weekData.meso}
          </Link>

          <span className="text-app-faint">→</span>

          <div className="rounded-xl bg-app-accent px-4 py-3 font-medium text-app-accent-ink">
            KW {weekData.weekNumber}
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