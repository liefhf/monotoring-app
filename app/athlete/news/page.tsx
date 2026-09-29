"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { NewsPost, TeamOption } from "@/lib/community";
import NewsList from "@/components/NewsList";
import { Notice, PageHeader } from "@/components/ui";

export default function AthleteNewsPage() {
  const [posts, setPosts] = useState<NewsPost[]>([]);
  const [teams, setTeams] = useState<TeamOption[]>([]);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    const [postResponse, teamResponse] = await Promise.all([
      supabase.from("news_posts").select("id, coach_id, team_id, title, body, pinned, created_at").order("created_at", { ascending: false }),
      supabase.rpc("my_teams"),
    ]);

    setError(Boolean(postResponse.error));
    setPosts((postResponse.data ?? []) as NewsPost[]);
    setTeams((teamResponse.data ?? []) as TeamOption[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Daten beim Oeffnen laden
    loadData();
  }, [loadData]);

  const teamName = useCallback(
    (teamId: string | null) =>
      teamId ? teams.find((team) => team.id === teamId)?.name ?? "Team" : "Alle Teams",
    [teams]
  );

  return (
    <main className="mx-auto max-w-3xl space-y-6 px-4 py-6 sm:px-6">
      <PageHeader icon="news" title="News" description="Neuigkeiten von deinem Trainer." />

      {error && <Notice tone="bad">Neuigkeiten konnten nicht geladen werden.</Notice>}

      {loading ? (
        <div className="rounded-3xl border border-app-border bg-app-surface shadow-app p-10 text-center text-app-muted">Wird geladen...</div>
      ) : (
        <NewsList posts={posts} teamName={teamName} />
      )}
    </main>
  );
}
