"use client";

import Link from "next/link";

export default function CoachSettingsPage() {
  const navigation = [
    { name: "Dashboard", href: "/coach" },
    { name: "Teams", href: "/coach/teams" },
    { name: "Athleten", href: "/coach/athletes" },
    { name: "Training", href: "/coach/training" },
    { name: "Auswertungen", href: "/coach/analytics" },
    { name: "Einstellungen", href: "/coach/settings" },
  ];

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="flex min-h-screen">
        <aside className="hidden w-64 shrink-0 border-r border-slate-800 bg-slate-900 lg:flex lg:flex-col">
          <div className="border-b border-slate-800 px-6 py-6">
            <h2 className="text-xl font-bold">Monitoring App</h2>

            <p className="mt-1 text-sm text-slate-500">
              Coach Bereich
            </p>
          </div>

          <nav className="flex-1 space-y-2 p-4">
            {navigation.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className={`block rounded-xl px-4 py-3 text-sm transition ${
                  item.name === "Einstellungen"
                    ? "bg-white font-medium text-slate-950"
                    : "text-slate-300 hover:bg-slate-800 hover:text-white"
                }`}
              >
                {item.name}
              </Link>
            ))}
          </nav>
        </aside>

        <div className="min-w-0 flex-1">
          <div className="mx-auto max-w-[1300px] px-6 py-8">
            <div>
              <p className="text-sm text-slate-400">
                Coach Bereich
              </p>

              <h1 className="mt-1 text-3xl font-bold">
                Einstellungen
              </h1>

              <p className="mt-2 text-slate-400">
                Profil, Teams und Systemeinstellungen verwalten.
              </p>
            </div>

            <section className="mt-8 grid gap-5 md:grid-cols-2">
              <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
                <p className="text-sm text-slate-500">
                  Konto
                </p>

                <h2 className="mt-2 text-lg font-semibold">
                  Profil
                </h2>

                <p className="mt-2 text-sm leading-6 text-slate-400">
                  Name, E-Mail und persönliche Angaben des Coaches.
                </p>

                <button
                  type="button"
                  className="mt-5 rounded-xl border border-slate-700 px-4 py-2 text-sm text-slate-500"
                >
                  Später bearbeiten
                </button>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
                <p className="text-sm text-slate-500">
                  Organisation
                </p>

                <h2 className="mt-2 text-lg font-semibold">
                  Teams verwalten
                </h2>

                <p className="mt-2 text-sm leading-6 text-slate-400">
                  Teamzuordnungen und grundlegende Einstellungen verwalten.
                </p>

                <Link
                  href="/coach/teams"
                  className="mt-5 inline-block rounded-xl border border-slate-700 px-4 py-2 text-sm hover:bg-slate-800"
                >
                  Zu den Teams
                </Link>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
                <p className="text-sm text-slate-500">
                  Datenschutz
                </p>

                <h2 className="mt-2 text-lg font-semibold">
                  Daten & Sicherheit
                </h2>

                <p className="mt-2 text-sm leading-6 text-slate-400">
                  Später verwalten wir hier Datenschutz,
                  Zugriffsrechte und Sicherheitsfunktionen.
                </p>

                <button
                  type="button"
                  className="mt-5 rounded-xl border border-slate-700 px-4 py-2 text-sm text-slate-500"
                >
                  Noch nicht eingerichtet
                </button>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
                <p className="text-sm text-slate-500">
                  System
                </p>

                <h2 className="mt-2 text-lg font-semibold">
                  App-Einstellungen
                </h2>

                <p className="mt-2 text-sm leading-6 text-slate-400">
                  Benachrichtigungen, Darstellung und weitere
                  Einstellungen kommen später hinzu.
                </p>

                <button
                  type="button"
                  className="mt-5 rounded-xl border border-slate-700 px-4 py-2 text-sm text-slate-500"
                >
                  Später konfigurieren
                </button>
              </div>
            </section>

            <section className="mt-6 rounded-2xl border border-slate-800 bg-slate-900 p-5">
              <h2 className="text-lg font-semibold">
                Aktueller Entwicklungsstand
              </h2>

              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
                Die Oberfläche ist jetzt grob aufgebaut. Im nächsten
                Entwicklungsabschnitt verbinden wir die App mit Supabase,
                damit Benutzer sich anmelden können und Daten tatsächlich
                gespeichert werden.
              </p>
            </section>
          </div>
        </div>
      </div>
    </main>
  );
}