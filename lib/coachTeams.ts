import { supabase } from "@/lib/supabase";

/*
 * Teams, in denen der angemeldete Nutzer Trainer ist - als Haupttrainer
 * und (nach Skript 26) als weiterer Trainer. Die Datenbank entscheidet
 * ueber my_teams(); fehlt die Funktion, gilt wie bisher teams.coach_id.
 */
export async function loadCoachTeams(): Promise<{ data: { id: string; name: string }[]; error: { message: string } | null }> {
  const rpc = await supabase.rpc("my_teams");
  if (!rpc.error) {
    const rows = (rpc.data ?? []) as { id: string; name: string; is_coach: boolean }[];
    return { data: rows.filter((row) => row.is_coach).map(({ id, name }) => ({ id, name })), error: null };
  }
  const { data: auth } = await supabase.auth.getUser();
  const res = await supabase.from("teams").select("id, name").eq("coach_id", auth.user?.id ?? "").order("name");
  return { data: (res.data ?? []) as { id: string; name: string }[], error: res.error };
}
