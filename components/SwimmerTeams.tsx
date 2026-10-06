"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Card, Notice } from "@/components/ui";

/*
 * Teams eines Athleten auf seiner Detailseite: per Klick
 * zuordnen oder entfernen. Blendet sich aus, solange
 * supabase/athleten_zusammenfuehren.sql fehlt.
 */

type Team = { id: string; name: string };

export default function SwimmerTeams({ swimmerId }: { swimmerId: string }) {
  const [teams, setTeams] = useState<Team[]>([]);
  const [memberOf, setMemberOf] = useState<Set<string>>(new Set());
  const [available, setAvailable] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const { data: userData } = await supabase.auth.getUser();
    const [teamResponse, membershipResponse] = await Promise.all([
      supabase.from("teams").select("id, name").eq("coach_id", userData.user?.id ?? "").order("name"),
      supabase.from("team_swimmers").select("team_id").eq("swimmer_id", swimmerId),
    ]);

    if (membershipResponse.error) {
      setAvailable(false);
      return;
    }

    setTeams((teamResponse.data ?? []) as Team[]);
    setMemberOf(new Set((membershipResponse.data ?? []).map((row) => row.team_id as string)));
  }, [swimmerId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Daten beim Oeffnen laden
    load();
  }, [load]);

  async function toggle(teamId: string) {
    setBusy(teamId);
    setError("");

    const { error: changeError } = memberOf.has(teamId)
      ? await supabase.from("team_swimmers").delete().eq("team_id", teamId).eq("swimmer_id", swimmerId)
      : await supabase.from("team_swimmers").insert({ team_id: teamId, swimmer_id: swimmerId });

    setBusy(null);

    if (changeError) {
      setError(`Team konnte nicht geändert werden: ${changeError.message}`);
      return;
    }

    await load();
  }

  if (!available) return null;

  return (
    <Card title="Teams" description="Klicken zum Zuordnen oder Entfernen.">
      <div className="space-y-3 p-5">
        {teams.length === 0 ? (
          <p className="text-sm text-app-muted">Du hast noch keine Teams. Leg sie unter „Teams“ an.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {teams.map((team) => {
              const active = memberOf.has(team.id);

              return (
                <button
                  key={team.id}
                  type="button"
                  onClick={() => toggle(team.id)}
                  disabled={busy !== null}
                  aria-pressed={active}
                  className={`rounded-full border px-3 py-1.5 text-sm transition disabled:opacity-60 ${
                    active
                      ? "border-app-accent bg-app-accent font-semibold text-app-accent-ink"
                      : "border-app-border text-app-text hover:bg-app-elevated"
                  }`}
                >
                  {active ? "✓ " : "+ "}
                  {team.name}
                </button>
              );
            })}
          </div>
        )}
        {error && <Notice tone="bad">{error}</Notice>}
      </div>
    </Card>
  );
}
