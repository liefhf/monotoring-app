"use client";

import Link from "next/link";
import BackupPanel from "@/components/BackupPanel";

export default function CoachSettingsPage() {
  return (
    <div className="mx-auto w-full max-w-[1300px]">
      <div>
        <p className="text-sm text-app-muted">
          Coach Bereich
        </p>

        <h1 className="mt-1 text-3xl font-bold">
          Einstellungen
        </h1>

        <p className="mt-2 text-app-muted">
          Profil, Teams und Systemeinstellungen verwalten.
        </p>
      </div>

      <section className="mt-8 grid gap-5 md:grid-cols-2">
        <div className="rounded-2xl border border-app-border bg-app-surface p-5">
          <p className="text-sm text-app-faint">
            Konto
          </p>

          <h2 className="mt-2 text-lg font-semibold">
            Profil
          </h2>

          <p className="mt-2 text-sm leading-6 text-app-muted">
            Name, E-Mail und persönliche Angaben des Coaches.
          </p>

          <button
            type="button"
            className="mt-5 rounded-xl border border-app-border px-4 py-2 text-sm text-app-faint"
          >
            Später bearbeiten
          </button>
        </div>

        <div className="rounded-2xl border border-app-border bg-app-surface p-5">
          <p className="text-sm text-app-faint">
            Organisation
          </p>

          <h2 className="mt-2 text-lg font-semibold">
            Teams verwalten
          </h2>

          <p className="mt-2 text-sm leading-6 text-app-muted">
            Teamzuordnungen und grundlegende Einstellungen verwalten.
          </p>

          <Link
            href="/coach/teams"
            className="mt-5 inline-block rounded-xl border border-app-border px-4 py-2 text-sm hover:bg-app-elevated"
          >
            Zu den Teams
          </Link>
        </div>

        <div className="rounded-2xl border border-app-border bg-app-surface p-5">
          <p className="text-sm text-app-faint">
            Datenschutz
          </p>

          <h2 className="mt-2 text-lg font-semibold">
            Daten & Sicherheit
          </h2>

          <p className="mt-2 text-sm leading-6 text-app-muted">
            Später verwalten wir hier Datenschutz,
            Zugriffsrechte und Sicherheitsfunktionen.
          </p>

          <button
            type="button"
            className="mt-5 rounded-xl border border-app-border px-4 py-2 text-sm text-app-faint"
          >
            Noch nicht eingerichtet
          </button>
        </div>

        <div className="rounded-2xl border border-app-border bg-app-surface p-5">
          <p className="text-sm text-app-faint">
            System
          </p>

          <h2 className="mt-2 text-lg font-semibold">
            App-Einstellungen
          </h2>

          <p className="mt-2 text-sm leading-6 text-app-muted">
            Benachrichtigungen, Darstellung und weitere
            Einstellungen kommen später hinzu.
          </p>

          <button
            type="button"
            className="mt-5 rounded-xl border border-app-border px-4 py-2 text-sm text-app-faint"
          >
            Später konfigurieren
          </button>
        </div>
      </section>

      <BackupPanel />
    </div>
  );
}