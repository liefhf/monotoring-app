"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

/*
 * Die gewaehlte Mannschaft gilt app-weit (Dashboard, Training,
 * Anwesenheit, Athleten-Check, Wochenbericht) und bleibt im Browser
 * gespeichert. Ohne gespeicherte Wahl: die erste Mannschaft.
 */
const STORAGE_KEY = "dashboard-team";

export function useSelectedTeam() {
  const [teams, setTeams] = useState<{ id: string; name: string }[]>([]);
  const [teamId, setTeamId] = useState<string | null>(null);

  useEffect(() => {
    supabase
      .from("teams")
      .select("id, name")
      .order("name")
      .then(({ data }) => {
        const list = (data ?? []) as { id: string; name: string }[];
        let saved: string | null = null;
        try {
          saved = localStorage.getItem(STORAGE_KEY);
        } catch {
          /* ohne Browser-Speicher */
        }
        setTeams(list);
        setTeamId(list.find((team) => team.id === saved)?.id ?? list[0]?.id ?? null);
      });
  }, []);

  const chooseTeam = useCallback((id: string) => {
    setTeamId(id);
    try {
      localStorage.setItem(STORAGE_KEY, id);
    } catch {
      /* ohne Browser-Speicher */
    }
  }, []);

  return { teams, teamId, chooseTeam };
}
