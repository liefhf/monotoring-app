"use client";

import { useState } from "react";
import { LogoMark } from "@/components/Logo";
import { DEMO, DemoRole, resetDemo, startDemo } from "@/lib/demo/demoFetch";

/*
 * Einstieg in die Demo mit Testdaten (nur wenn NEXT_PUBLIC_DEMO=1).
 * Keine echte Datenbank: Aenderungen bleiben nur in diesem Browser.
 */
const LINKS: { label: string; href: string; role: DemoRole; hint: string }[] = [
  { label: "Trainer-Dashboard", href: "/coach", role: "coach", hint: "Aufmerksamkeit, Training heute, Check-ins, Fristen" },
  { label: "Einheit mit Serienzeiten", href: "/coach/training/session/s3#serienzeiten", role: "coach", hint: "gestern: 8×200 Kraul GA2 @3:00 – Zeiten erfassen und auswerten" },
  { label: "Athletenprofil Mia Schulz", href: "/coach/schwimmer/w1", role: "coach", hint: "Einschränkung, Bestzeiten, Ziel, Serienzeiten im Verlauf" },
  { label: "Trainingswoche", href: "/coach/training", role: "coach", hint: "planen, kopieren, verschieben" },
  { label: "Athletin: Heute", href: "/athlete", role: "athlete", hint: "Check-in, Training, Fortschritt" },
];

export default function DemoPage() {
  const [resetDone, setResetDone] = useState(false);

  if (!DEMO) {
    return (
      <main className="mx-auto max-w-lg px-4 py-16 text-center">
        <h1 className="text-xl font-bold text-app-heading">Demo nicht aktiv</h1>
        <p className="mt-2 text-app-text">Diese Seite gibt es nur in der Demo-Fassung (npm run demo).</p>
      </main>
    );
  }

  const go = (role: DemoRole, href: string) => {
    startDemo(role);
    window.location.href = href;
  };

  return (
    <main className="mx-auto w-full max-w-xl px-4 py-10">
      <div className="flex items-center gap-3">
        <LogoMark className="h-10 w-10" />
        <div>
          <h1 className="text-xl font-extrabold text-app-heading">Monitoring App – Demo</h1>
          <p className="text-sm text-app-text">Mit Testdaten. Keine echte Datenbank, keine echten Personen.</p>
        </div>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        <button type="button" onClick={() => go("coach", "/coach")} className="min-h-14 rounded-xl bg-app-accent px-4 text-base font-bold text-app-accent-ink">
          Als Trainerin ansehen
        </button>
        <button type="button" onClick={() => go("athlete", "/athlete")} className="min-h-14 rounded-xl border border-app-border px-4 text-base font-bold text-app-heading">
          Als Athletin ansehen
        </button>
      </div>

      <h2 className="mt-8 text-sm font-bold text-app-heading">Direkt zu</h2>
      <ul className="mt-2 divide-y divide-app-border rounded-2xl border border-app-border bg-app-surface">
        {LINKS.map((link) => (
          <li key={link.href}>
            <button type="button" onClick={() => go(link.role, link.href)} className="flex min-h-14 w-full flex-col items-start justify-center px-4 py-2 text-left hover:bg-app-elevated/60">
              <span className="font-semibold text-app-accent-soft">{link.label} →</span>
              <span className="text-[13px] text-app-text">{link.hint}</span>
            </button>
          </li>
        ))}
      </ul>

      <div className="mt-6 flex flex-wrap items-center gap-3 text-sm">
        <button
          type="button"
          onClick={() => {
            resetDemo();
            setResetDone(true);
          }}
          className="min-h-11 rounded-lg border border-app-border px-3 font-semibold text-app-heading"
        >
          Testdaten zurücksetzen
        </button>
        {resetDone && <span className="text-app-good">Zurückgesetzt.</span>}
      </div>
      <p className="mt-4 text-[13px] text-app-muted">
        Weitere Trainer-Konten in der Demo: tom@demo.verein (für „Teams → Weitere Trainer“).
      </p>
    </main>
  );
}
