"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Card, Notice, buttonSecondary, inputClass } from "@/components/ui";

/*
 * Verknuepft einen Schwimmer aus "Meine Schwimmer" mit dem
 * Login eines Athleten aus den eigenen Teams. Danach sieht der
 * Athlet sein Wettkampf-Feedback und kann sich selbst einschaetzen.
 * Laedt seine Daten selbst und blendet sich aus, solange
 * supabase/wettkampf_feedback.sql noch nicht ausgefuehrt wurde.
 */

type AthleteOption = { id: string; name: string };

export default function AthleteLinkCard({ swimmerId }: { swimmerId: string }) {
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
