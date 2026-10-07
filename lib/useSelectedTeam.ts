"use client";

import { useCallback, useEffect, useState } from "react";
import { loadCoachTeams } from "@/lib/coachTeams";

/*
 * Die gewaehlte Mannschaft gilt app-weit (Dashboard, Training,
 * Anwesenheit, Athleten-Check, Wochenbericht) und bleibt im Browser
 * gespeichert. Ohne gespeicherte Wahl: die erste Mannschaft.
 */
const STORAGE_KEY = "dashboard-team";

export function useSelectedTeam() {
  const [teams, setTeams] = useState<{ id: string; name: string }[]>([]);
  const [teamId, setTeamId] = useState<string | null>(null);
  /* "loading" bis die Teams da sind; "error" bei einem Ladefehler */
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    loadCoachTeams().then(({ data, error }) => {
        if (error) {
          setStatus("error");
          return;
        }
        const list = (data ?? []) as { id: string; name: string }[];
        let saved: string | null = null;
        try {
          saved = localStorage.getItem(STORAGE_KEY);
        } catch {
          /* ohne Browser-Speicher */
        }
        setTeams(list);
        setTeamId(list.find((team) => team.id === saved)?.id ?? list[0]?.id ?? null);
        setStatus("ready");
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

  return { teams, teamId, chooseTeam, status };
}

/* Hinweis, wenn keine Mannschaft gewaehlt werden kann (leer oder Ladefehler) */
export function teamNotice(status: "loading" | "ready" | "error", teamId: string | null) {
  if (status === "error") return "Die Daten konnten gerade nicht geladen werden. Bitte die Seite neu laden.";
  if (status === "ready" && !teamId) return "Noch keine Mannschaft angelegt. Lege unter Team → Teams eine Mannschaft an und ordne Athleten zu.";
  return null;
}
