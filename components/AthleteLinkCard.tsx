"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Card, Notice, buttonSecondary, inputClass } from "@/components/ui";

/*
 * Verknuepft einen Schwimmer aus "Athleten" mit dem
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

    /*
     * Alle Athleten-Logins, die noch mit keinem anderen eigenen
     * Athleten verknuepft sind. Nach dem Verknuepfen uebernimmt
     * der Login automatisch die Teams dieses Athleten.
     */
    const [{ data: profiles }, { data: linked }] = await Promise.all([
      supabase.from("profiles").select("id, first_name, last_name").eq("role", "athlete"),
      supabase.from("swimmers").select("profile_id").not("profile_id", "is", null),
    ]);

    const taken = new Set((linked ?? []).map((row) => row.profile_id as string));

    setAthletes(
      ((profiles ?? []) as { id: string; first_name: string | null; last_name: string | null }[])
        .filter((profile) => profile.id === current || !taken.has(profile.id))
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
        text: error.message.includes("profile_unique")
          ? "Dieser Login ist schon mit einem anderen Athleten verknüpft."
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
    <Card
      title="Eigener Login"
      description="Mit Login nutzt der Athlet die App selbst: Check-in, Training, Termine, Feedback."
    >
      <div className="space-y-3 p-5">
        {athletes.length === 0 ? (
          <p className="text-sm text-app-muted">
            Es gibt noch keinen freien Athleten-Login. Der Athlet registriert sich selbst über die Login-Seite, danach
            kannst du ihn hier verknüpfen.
          </p>
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
