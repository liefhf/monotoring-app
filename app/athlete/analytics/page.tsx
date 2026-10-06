"use client";

import Link from "next/link";

type DailyBefinden = {
  day: string;
  score: number;
};

type TrainingLoad = {
  day: string;
  rpe: number;
  duration: number;
};

export default function AthleteAnalyticsPage() {
  const befindenData: DailyBefinden[] = [
    { day: "Mo", score: 8.2 },
    { day: "Di", score: 7.8 },
    { day: "Mi", score: 7.4 },
    { day: "Do", score: 8.0 },
    { day: "Fr", score: 7.2 },
    { day: "Sa", score: 8.4 },
    { day: "So", score: 8.1 },
  ];

  const loadData: TrainingLoad[] = [
    { day: "Mo", rpe: 6, duration: 90 },
    { day: "Di", rpe: 7, duration: 100 },
    { day: "Mi", rpe: 5, duration: 60 },
    { day: "Do", rpe: 7, duration: 95 },
    { day: "Fr", rpe: 6, duration: 80 },
    { day: "Sa", rpe: 7, duration: 110 },
    { day: "So", rpe: 0, duration: 0 },
  ];

  const totalLoad = loadData.reduce(
    (total, item) => total + item.rpe * item.duration,
    0
  );

  const averageBefinden =
    befindenData.reduce((total, item) => total + item.score, 0) /
    befindenData.length;

  const completedSessions = 6;
  const plannedSessions = 8;

  const weeklyMeters = 32000;

  return (
    <div className="mx-auto w-full max-w-[1500px]">
      {/* Kopf */}
      <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm text-app-muted">
            Meine Entwicklung
          </p>

          <h1 className="mt-1 text-3xl font-bold">
            Auswertung
          </h1>

          <p className="mt-2 text-app-muted">
            Überblick über Befinden, Training und Belastung.
          </p>
        </div>

        <Link
          href="/athlete"
          className="rounded-xl border border-app-border px-4 py-3 text-center text-sm hover:bg-app-elevated"
        >
          Zurück zum Dashboard
        </Link>
      </div>

      {/* Kennzahlen */}
      <section className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-[20px] border border-app-border bg-app-surface shadow-app p-5">
          <p className="text-sm text-app-muted">
            Ø Befinden
          </p>

          <p className="mt-2 text-3xl font-bold">
            {averageBefinden.toFixed(1)}
          </p>

          <p className="mt-2 text-sm text-app-faint">
            Letzte 7 Tage
          </p>
        </div>

        <div className="rounded-[20px] border border-app-border bg-app-surface shadow-app p-5">
          <p className="text-sm text-app-muted">
            Wochenumfang
          </p>

          <p className="mt-2 text-3xl font-bold">
            {(weeklyMeters / 1000).toLocaleString("de-DE")} km
          </p>

          <p className="mt-2 text-sm text-app-faint">
            Wasser
          </p>
        </div>

        <div className="rounded-[20px] border border-app-border bg-app-surface shadow-app p-5">
          <p className="text-sm text-app-muted">
            Trainingsbelastung
          </p>

          <p className="mt-2 text-3xl font-bold">
            {totalLoad}
          </p>

          <p className="mt-2 text-sm text-app-faint">
            RPE × Minuten
          </p>
        </div>

        <div className="rounded-[20px] border border-app-border bg-app-surface shadow-app p-5">
          <p className="text-sm text-app-muted">
            Erledigte Einheiten
          </p>

          <p className="mt-2 text-3xl font-bold">
            {completedSessions} / {plannedSessions}
          </p>

          <p className="mt-2 text-sm text-app-faint">
            Diese Woche
          </p>
        </div>
      </section>

      {/* Befinden */}
      <section className="mt-6 rounded-[20px] border border-app-border bg-app-surface shadow-app">
        <div className="border-b border-app-border p-5">
          <h2 className="text-xl font-semibold">
            Befinden – letzte 7 Tage
          </h2>

          <p className="mt-1 text-sm text-app-muted">
            Entwicklung deines täglichen Befindens.
          </p>
        </div>

        <div className="p-5">
          <div className="grid grid-cols-7 gap-3">
            {befindenData.map((item) => {
              const height = Math.max(
                10,
                (item.score / 10) * 180
              );

              return (
                <div
                  key={item.day}
                  className="flex flex-col items-center justify-end"
                >
                  <div className="flex h-[200px] w-full items-end justify-center rounded-xl border border-app-border bg-app-bg p-2">
                    <div
                      className="w-full rounded-lg bg-app-accent"
                      style={{
                        height: `${height}px`,
                      }}
                    />
                  </div>

                  <p className="mt-3 text-sm font-medium">
                    {item.day}
                  </p>

                  <p className="mt-1 text-xs text-app-faint">
                    {item.score.toFixed(1)}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Trainingsbelastung */}
      <section className="mt-6 rounded-[20px] border border-app-border bg-app-surface shadow-app">
        <div className="border-b border-app-border p-5">
          <h2 className="text-xl font-semibold">
            Trainingsbelastung
          </h2>

          <p className="mt-1 text-sm text-app-muted">
            Belastung auf Basis von RPE × Trainingsdauer.
          </p>
        </div>

        <div className="p-5">
          <div className="grid grid-cols-7 gap-3">
            {loadData.map((item) => {
              const load = item.rpe * item.duration;

              const height = Math.min(
                180,
                Math.max(0, load / 4)
              );

              return (
                <div
                  key={item.day}
                  className="flex flex-col items-center justify-end"
                >
                  <div className="flex h-[200px] w-full items-end justify-center rounded-xl border border-app-border bg-app-bg p-2">
                    <div
                      className="w-full rounded-lg bg-app-muted"
                      style={{
                        height: `${height}px`,
                      }}
                    />
                  </div>

                  <p className="mt-3 text-sm font-medium">
                    {item.day}
                  </p>

                  <p className="mt-1 text-xs text-app-faint">
                    {load}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Wochenzusammenfassung */}
      <section className="mt-6 grid gap-4 lg:grid-cols-2">
        <div className="rounded-[20px] border border-app-border bg-app-surface shadow-app p-5">
          <h2 className="text-lg font-semibold">
            Wochenstatus
          </h2>

          <div className="mt-5 space-y-4">
            <div>
              <div className="flex justify-between text-sm">
                <span className="text-app-muted">
                  Trainingsfortschritt
                </span>

                <span>
                  {completedSessions} / {plannedSessions}
                </span>
              </div>

              <div className="mt-2 h-3 overflow-hidden rounded-full bg-app-elevated">
                <div
                  className="h-full rounded-full bg-app-accent"
                  style={{
                    width: `${
                      (completedSessions / plannedSessions) * 100
                    }%`,
                  }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-sm">
                <span className="text-app-muted">
                  Wochenumfang
                </span>

                <span>32 / 35 km</span>
              </div>

              <div className="mt-2 h-3 overflow-hidden rounded-full bg-app-elevated">
                <div
                  className="h-full rounded-full bg-app-accent"
                  style={{
                    width: `${(32 / 35) * 100}%`,
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-[20px] border border-app-border bg-app-surface shadow-app p-5">
          <h2 className="text-lg font-semibold">
            Aktueller Trend
          </h2>

          <div className="mt-5 space-y-3">
            <div className="rounded-xl border border-app-border bg-app-bg p-4">
              <p className="text-sm text-app-muted">
                Befinden
              </p>

              <p className="mt-1 font-semibold">
                Stabil
              </p>
            </div>

            <div className="rounded-xl border border-app-border bg-app-bg p-4">
              <p className="text-sm text-app-muted">
                Belastung
              </p>

              <p className="mt-1 font-semibold">
                Moderat steigend
              </p>
            </div>

            <div className="rounded-xl border border-app-border bg-app-bg p-4">
              <p className="text-sm text-app-muted">
                Trainingskonstanz
              </p>

              <p className="mt-1 font-semibold">
                Gut
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Hinweis */}
      <section className="mt-6 rounded-[20px] border border-app-border bg-app-surface shadow-app p-5">
        <p className="text-sm leading-6 text-app-muted">
          Diese Auswertung verwendet aktuell nur Testdaten. Später
          werden hier deine echten Befinden-Einträge, Trainingsdaten
          und Rückmeldungen aus Supabase automatisch ausgewertet.
        </p>
      </section>
    </div>
  );
}