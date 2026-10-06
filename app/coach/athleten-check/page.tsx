"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import RedFlagsPanel from "@/components/RedFlagsPanel";
import { PageHeader } from "@/components/ui";

/*
 * Athleten-Check: vollstaendige Uebersicht (Belastung, Schmerz, Readiness,
 * Anwesenheit) fuer die auf dem Dashboard gewaehlte Mannschaft.
 */
export default function AthletenCheckPage() {
  const [teamId, setTeamId] = useState<string | null>(null);

  useEffect(() => {
    supabase
      .from("teams")
      .select("id")
      .order("name")
      .then(({ data }) => {
        const ids = ((data ?? []) as { id: string }[]).map((team) => team.id);
        let saved: string | null = null;
        try {
          saved = localStorage.getItem("dashboard-team");
        } catch {
          /* ohne Browser-Speicher */
        }
        setTeamId(ids.find((id) => id === saved) ?? ids[0] ?? null);
      });
  }, []);

  return (
    <main className="mx-auto max-w-6xl space-y-6">
      <PageHeader eyebrow="Dashboard" title="Athleten-Check" icon="heart" />
      {teamId && <RedFlagsPanel teamId={teamId} variant="table" />}
    </main>
  );
}
