"use client";

import { teamNotice, useSelectedTeam } from "@/lib/useSelectedTeam";
import RedFlagsPanel from "@/components/RedFlagsPanel";
import { PageHeader } from "@/components/ui";
import TeamSwitcher from "@/components/TeamSwitcher";

/*
 * Athleten-Check: vollstaendige Uebersicht aller Hinweise (Belastung,
 * Schmerz, Befinden, Gesundheit, Check-ins, Anwesenheit) fuer die
 * gewaehlte Mannschaft.
 */
export default function AthletenCheckPage() {
  const { teams, teamId, chooseTeam, status: teamStatus } = useSelectedTeam();
  const teamHint = teamNotice(teamStatus, teamId);

  return (
    <main className="mx-auto max-w-6xl space-y-6">
      <PageHeader
        eyebrow="Team"
        title="Athleten-Check"
        icon="heart"
        actions={teams.length > 1 && teamId ? <TeamSwitcher teams={teams} teamId={teamId} onChange={chooseTeam} /> : undefined}
      />

      {teamHint && (
        <p role="status" className="rounded-[14px] border border-app-warn/40 bg-app-warn/10 px-4 py-3 text-sm text-app-text">
          {teamHint}
        </p>
      )}
      {teamId && <RedFlagsPanel teamId={teamId} variant="table" />}
    </main>
  );
}
