"use client";

import { FormEvent, useState } from "react";
import { supabase } from "@/lib/supabase";
import { LoadResult, checkWrite, useBusy, useKeyedLoad, writeErrorText } from "@/lib/loadState";

/*
 * Weitere Trainer eines Teams (Skript 25/27, wirksam mit Skript 26).
 * Nur der Haupttrainer fuegt per Anmelde-E-Mail hinzu oder entzieht den
 * Zugriff. Entzug setzt revoked_at (nachvollziehbar, nichts wird geloescht).
 */
type Coach = { coach_id: string; name: string; added_at: string; revoked_at: string | null };

async function fetchCoaches(teamId: string): Promise<LoadResult<Coach[]>> {
  const { data, error } = await supabase.rpc("team_coach_list", { p_team_id: teamId });
  // Funktion fehlt (Skript 27) oder keine Berechtigung -> wie "nicht eingerichtet"
  if (error) return { status: "missing" };
  return { status: "ready", data: (data ?? []) as Coach[] };
}

export default function TeamCoaches({ teamId }: { teamId: string }) {
  const { state, reload: load } = useKeyedLoad(teamId, fetchCoaches);
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<{ tone: "good" | "bad"; text: string } | null>(null);
  const { busy, run } = useBusy();


  async function add(event: FormEvent) {
    event.preventDefault();
    if (!email.trim()) return;
    await run(async () => {
      const { data, error } = await supabase.rpc("add_team_coach", { p_team_id: teamId, p_email: email.trim() });
      if (error) {
        setMessage({ tone: "bad", text: error.message || "Trainer konnte nicht hinzugefügt werden." });
        return;
      }
      setEmail("");
      setMessage({ tone: "good", text: `${data as string} arbeitet jetzt in diesem Team mit.` });
      await load();
    });
  }

  async function revoke(coach: Coach) {
    if (!window.confirm(`${coach.name || "Diesem Trainer"} den Zugriff auf dieses Team entziehen? Er sieht die Athleten dann sofort nicht mehr.`)) return;
    await run(async () => {
      const res = await supabase.from("team_coaches").update({ revoked_at: new Date().toISOString() }).eq("team_id", teamId).eq("coach_id", coach.coach_id).select("coach_id");
      const check = checkWrite(res);
      setMessage(check.ok ? { tone: "good", text: "Zugriff entzogen." } : { tone: "bad", text: writeErrorText(check, "Entziehen") });
      await load();
    });
  }

  if (state.status === "loading") return null;
  if (state.status !== "ready") {
    return <p className="mt-3 text-[13px] text-app-muted">Weitere Trainer: nach Skript 25 und 27 hier verwaltbar.</p>;
  }
  const active = state.data.filter((c) => !c.revoked_at);

  return (
    <div className="mt-4 border-t border-app-border pt-3">
      <p className="text-sm font-semibold text-app-heading">Weitere Trainer</p>
      {active.length === 0 ? (
        <p className="text-[13px] text-app-text">Nur du betreust dieses Team.</p>
      ) : (
        <ul className="mt-1 divide-y divide-app-border/70">
          {active.map((coach) => (
            <li key={coach.coach_id} className="flex items-center gap-2 py-1">
              <span className="min-w-0 flex-1 truncate text-sm text-app-heading">{coach.name || "Trainer"}</span>
              <button type="button" disabled={busy} onClick={() => revoke(coach)} className="min-h-11 px-2 text-[13px] font-semibold text-app-bad hover:underline">
                Zugriff entziehen
              </button>
            </li>
          ))}
        </ul>
      )}
      <form onSubmit={add} className="mt-2 flex gap-2">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="E-Mail des Trainer-Kontos"
          aria-label="E-Mail des Trainer-Kontos"
          className="min-h-11 min-w-0 flex-1 rounded-lg border border-app-border bg-app-bg px-3 text-base sm:text-sm"
        />
        <button type="submit" disabled={busy || !email.trim()} className="min-h-11 rounded-lg border border-app-border px-3 text-sm font-semibold hover:bg-app-elevated disabled:opacity-40">
          Hinzufügen
        </button>
      </form>
      {message && <p className={`mt-1 text-[13px] ${message.tone === "bad" ? "text-app-bad" : "text-app-good"}`}>{message.text}</p>}
      <p className="mt-1 text-[12px] text-app-muted">Das Konto muss bereits als Trainer angemeldet sein. Wirksam, sobald das Trainerteam (Skript 26) aktiviert ist.</p>
    </div>
  );
}
