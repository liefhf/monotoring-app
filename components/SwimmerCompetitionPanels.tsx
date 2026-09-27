"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { formatDate, formatEvent, formatTime } from "@/lib/swim";
import { CompetitionStart, START_COLUMNS, STATUS_LABELS, averageRating } from "@/lib/competitionFeedback";
import { Card, EmptyState, Notice, buttonSecondary, inputClass } from "@/components/ui";

/*
 * Zusatz-Bausteine fuer die Schwimmer-Detailseite:
 * - Verknuepfung mit dem Login eines Athleten
 * - Liste der Wettkampf-Starts mit Feedback
 * Beide laden ihre Daten selbst, damit die Schwimmerseite
 * auch ohne supabase/wettkampf_feedback.sql funktioniert.
 */

type AthleteOption = { id: string; name: string };

export function AthleteLinkCard({ swimmerId }: { swimmerId: string }) {
  const [profileId, setProfileId] = useState<string | null>(null);
  const [athletes, setAthletes] = useState<AthleteOption[]>([]);
  const [selected, setSelected] = useState("");
  const [available, setAvailable] = useState(true);
  const [message, setMessage] = useState<{ tone: "good" | "bad"; text: string } | null>(null);

  const load = useCallback(async () => {
    const { data, error } = await supabase.from("swimmers").select("profile_id").eq("id", swimmerId).maybeSingle();

    if (error) {
      setAvailable(false);
      return;
    }

    const current = (data?.profile_id as string | null) ?? null;
    setProfileId(current);
    setSelected(current ?? "");

    /* Athleten aus den eigenen Teams */
    const { data: teams } = await supabase.rpc("my_teams");
    const teamIds = ((teams ?? []) as { id: string; is_coach: boolean }[]).filter((team) => team.is_coach).map((team) => team.id);

    if (teamIds.length === 0) return;

    const { data: members } = await supabase.from("team_members").select("athlete_id").in("team_id", teamIds);
    const ids = [...new Set((members ?? []).map((member) => member.athlete_id as string))];

    if (ids.length === 0) return;

    const { data: profiles } = await supabase.from("profiles").select("id, first_name, last_name").in("id", ids);

    setAthletes(
      ((profiles ?? []) as { id: string; first_name: string | null; last_name: string | null }[])
        .map((profile) => ({ id: profile.id, name: `${profile.first_name ?? ""} ${profile.last_name ?? ""}`.trim() || "Athlet" }))
        .sort((a, b) => a.name.localeCompare(b.name, "de"))
    );
  }, [swimmerId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Daten beim Oeffnen laden
    load();
  }, [load]);

  async function save() {
    const { error } = await supabase.from("swimmers").update({ profile_id: selected || null }).eq("id", swimmerId);

    if (error) {
      setMessage({
        tone: "bad",
        text: error.message.includes("swimmers_profile_unique")
          ? "Dieser Login ist schon mit einem anderen Schwimmer verknüpft."
          : `Verknüpfung konnte nicht gespeichert werden: ${error.message}`,
      });
      return;
    }

    setProfileId(selected || null);
    setMessage({ tone: "good", text: selected ? "Verknüpft ✅ – der Athlet sieht jetzt sein Wettkampf-Feedback." : "Verknüpfung entfernt." });
  }

  if (!available) {
    return null;
  }

  return (
    <Card title="Athleten-Login" description="Verknüpft, sieht der Athlet sein Wettkampf-Feedback und kann sich selbst einschätzen.">
      <div className="space-y-3 p-5">
        {athletes.length === 0 ? (
          <p className="text-sm text-app-muted">In deinen Teams gibt es noch keine Athleten mit eigenem Login.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            <select value={selected} onChange={(event) => setSelected(event.target.value)} className={`${inputClass} w-auto min-w-56 flex-1`}>
              <option value="">– nicht verknüpft –</option>
              {athletes.map((athlete) => (
                <option key={athlete.id} value={athlete.id}>
                  {athlete.name}
                </option>
              ))}
            </select>
            <button type="button" onClick={save} disabled={selected === (profileId ?? "")} className={buttonSecondary}>
              Speichern
            </button>
          </div>
        )}
        {message && <Notice tone={message.tone}>{message.text}</Notice>}
      </div>
    </Card>
  );
}

type StartRow = CompetitionStart & { competitions: { name: string } | null };

export function SwimmerCompetitionStarts({ swimmerId }: { swimmerId: string }) {
  const [starts, setStarts] = useState<StartRow[] | null>(null);

  useEffect(() => {
    supabase
      .from("competition_starts")
      .select(`${START_COLUMNS}, competitions(name)`)
      .eq("swimmer_id", swimmerId)
      .order("start_date", { ascending: false })
      .then(({ data, error }) => setStarts(error ? [] : ((data ?? []) as unknown as StartRow[])));
  }, [swimmerId]);

  if (starts === null) {
    return <p className="mt-6 text-sm text-app-muted">Wird geladen...</p>;
  }

  return (
    <div className="mt-6">
      <Card title="Wettkampf-Feedback" description="Alle Starts mit deiner Bewertung. Erfasst wird unter Wettkämpfe → Auswertung & Feedback.">
        {starts.length === 0 ? (
          <EmptyState icon="trophy" title="Noch kein Wettkampf-Feedback">
            Öffne einen Wettkampf und klicke auf „Auswertung & Feedback“.
          </EmptyState>
        ) : (
          <ul className="divide-y divide-app-border">
            {starts.map((start) => {
              const average = averageRating(start);

              return (
                <li key={start.id}>
                  <Link
                    href={`/coach/competitions/${start.competition_id}/auswertung`}
                    className="flex flex-wrap items-center gap-x-4 gap-y-1 px-5 py-3 transition hover:bg-app-elevated"
                  >
                    <span className="w-24 shrink-0 text-sm text-app-muted">{formatDate(start.start_date)}</span>
                    <span className="min-w-40 flex-1">
                      <span className="block font-medium text-app-heading">{formatEvent(start)}</span>
                      <span className="block text-xs text-app-muted">{start.competitions?.name ?? "Wettkampf"}</span>
                    </span>
                    <span className="w-20 font-semibold text-app-heading">
                      {start.status === "ok" && start.time_ms ? formatTime(start.time_ms) : STATUS_LABELS[start.status]}
                    </span>
                    <span className="w-24 text-xs text-app-muted">{average !== null ? `Ø Note ${average.toFixed(1).replace(".", ",")}` : ""}</span>
                    <span className="w-full text-sm text-app-text sm:w-auto sm:flex-1">
                      {start.to_improve ? `Daran arbeiten: ${start.to_improve}` : start.went_well ?? ""}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </div>
  );
}
