"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { TeamOption } from "@/lib/community";
import TeamRoom from "@/components/TeamRoom";
import { Icon } from "@/components/icons";
import { EmptyState, Notice, PageHeader, buttonSecondary } from "@/components/ui";

/*
 * Uebersicht und einzelner Raum der digitalen
 * Gruppenraeume. basePath ist "/coach/gruppen"
 * oder "/athlete/gruppen".
 */

function useMyTeams() {
  const [teams, setTeams] = useState<TeamOption[] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    supabase.rpc("my_teams").then(({ data, error: loadError }) => {
      setError(Boolean(loadError));
      setTeams((data ?? []) as TeamOption[]);
    });
  }, []);

  return { teams, error };
}

export function GroupRoomList({ basePath }: { basePath: string }) {
  const { teams, error } = useMyTeams();

  return (
    <div className="space-y-6">
      <PageHeader
        icon="chat"
        title="Gruppenräume"
        description="Ein Raum pro Team für Nachrichten und gemeinsame Dateien."
      />

      {error && (
        <Notice tone="bad">
          Die Gruppenräume sind noch nicht eingerichtet. Bitte supabase/termine_news_gruppen.sql in Supabase ausführen.
        </Notice>
      )}

      {teams === null ? (
        <div className="rounded-2xl border border-app-border bg-app-surface p-10 text-center text-app-muted">Wird geladen...</div>
      ) : teams.length === 0 ? (
        <div className="rounded-2xl border border-app-border bg-app-surface shadow-app">
          <EmptyState icon="teams" title="Noch kein Team">
            Gruppenräume entstehen automatisch für jedes Team.
          </EmptyState>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {teams.map((team) => (
            <Link
              key={team.id}
              href={`${basePath}/${team.id}`}
              className="group flex items-center gap-4 rounded-2xl border border-app-border bg-app-surface p-5 shadow-app transition hover:-translate-y-0.5 hover:border-app-accent/50"
            >
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-app-accent/12 text-app-accent">
                <Icon name="teams" className="h-6 w-6" />
              </span>
              <span className="min-w-0">
                <span className="block truncate font-semibold text-app-heading">{team.name}</span>
                <span className="text-sm text-app-muted">Raum öffnen →</span>
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export function GroupRoomPage({ basePath, teamId }: { basePath: string; teamId: string }) {
  const { teams } = useMyTeams();
  const team = teams?.find((item) => item.id === teamId);

  if (teams && !team) {
    return (
      <div className="space-y-4">
        <Notice tone="bad">Diesen Gruppenraum gibt es nicht oder du hast keinen Zugriff.</Notice>
        <Link href={basePath} className={buttonSecondary}>
          ← Alle Gruppenräume
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <PageHeader
        icon="chat"
        eyebrow="Gruppenraum"
        title={team?.name ?? "…"}
        actions={
          <Link href={basePath} className={buttonSecondary}>
            ← Alle Räume
          </Link>
        }
      />
      {team && <TeamRoom teamId={teamId} isCoach={team.is_coach} />}
    </div>
  );
}
