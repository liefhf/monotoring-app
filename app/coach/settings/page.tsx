"use client";

import Link from "next/link";
import BackupPanel from "@/components/BackupPanel";
import ThemeToggle from "@/components/ThemeToggle";
import ContrastToggle from "@/components/ContrastToggle";
import LogoutButton from "@/components/LogoutButton";
import { Card, PageHeader, buttonSecondary } from "@/components/ui";

/*
 * Einstellungen: nur, was es wirklich gibt. Die frueheren Platzhalter
 * ("kommt spaeter") sind entfernt - eine Einstellung erscheint hier erst,
 * wenn sie funktioniert.
 */
export default function CoachSettingsPage() {
  return (
    <main className="mx-auto max-w-3xl space-y-4 sm:space-y-5">
      <PageHeader eyebrow="Konto" title="Einstellungen" />

      <Card title="Teams" description="Teams anlegen und Athleten zuordnen." action={<Link href="/coach/teams" className={buttonSecondary}>Teams verwalten</Link>}>
        <span />
      </Card>

      <Card title="Darstellung" description="Hell/Dunkel und Sonnen-Modus mit maximalem Kontrast für den Beckenrand.">
        <div className="flex flex-wrap items-center gap-3 px-4 pb-4 sm:px-[22px] sm:pb-5">
          <ThemeToggle withLabel />
          <ContrastToggle withLabel />
        </div>
      </Card>

      <BackupPanel />

      <Card title="Abmelden">
        <div className="px-4 pb-4 sm:px-[22px] sm:pb-5">
          <LogoutButton />
        </div>
      </Card>
    </main>
  );
}
