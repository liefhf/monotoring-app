"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { NewsPost, TeamOption } from "@/lib/community";
import NewsList from "@/components/NewsList";
import { Card, FormField, Notice, PageHeader, buttonPrimary, buttonSecondary, inputClass } from "@/components/ui";

/*
 * News-Wall: Ankuendigungen an ein Team oder alle Teams.
 * Athleten sehen sie unter "News" und auf ihrer Startseite.
 */

type Draft = { id: string | null; title: string; body: string; teamId: string; pinned: boolean };

const emptyDraft: Draft = { id: null, title: "", body: "", teamId: "", pinned: false };

export default function CoachNewsPage() {
  const [posts, setPosts] = useState<NewsPost[]>([]);
  const [teams, setTeams] = useState<TeamOption[]>([]);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ tone: "good" | "bad"; text: string } | null>(null);

  const loadData = useCallback(async () => {
    const [postResponse, teamResponse] = await Promise.all([
      supabase.from("news_posts").select("id, coach_id, team_id, title, body, pinned, created_at").order("created_at", { ascending: false }),
      supabase.rpc("my_teams"),
    ]);

    if (postResponse.error) {
      setMessage({
        tone: "bad",
        text: postResponse.error.message.includes("news_posts")
          ? "Die News-Wall ist noch nicht eingerichtet. Bitte führe supabase/termine_news_gruppen.sql im Supabase SQL-Editor aus."
          : `Beiträge konnten nicht geladen werden: ${postResponse.error.message}`,
      });
      return;
    }

    setPosts((postResponse.data ?? []) as NewsPost[]);
    setTeams(((teamResponse.data ?? []) as TeamOption[]).filter((team) => team.is_coach));
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

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const payload = {
      title: draft.title.trim(),
      body: draft.body.trim(),
      team_id: draft.teamId || null,
      pinned: draft.pinned,
    };

    if (!payload.title) {
      setMessage({ tone: "bad", text: "Bitte gib eine Überschrift ein." });
      return;
    }

    setSaving(true);

    const { error } = draft.id
      ? await supabase.from("news_posts").update(payload).eq("id", draft.id)
      : await supabase.from("news_posts").insert(payload);

    setSaving(false);

    if (error) {
      setMessage({ tone: "bad", text: `Beitrag konnte nicht gespeichert werden: ${error.message}` });
      return;
    }

    setMessage({ tone: "good", text: draft.id ? "Beitrag geändert ✅" : "Beitrag veröffentlicht ✅" });
    setDraft(emptyDraft);
    await loadData();
  }

  async function handleDelete(post: NewsPost) {
    if (!window.confirm(`„${post.title}“ löschen?`)) return;

    const { error } = await supabase.from("news_posts").delete().eq("id", post.id);

    if (error) {
      setMessage({ tone: "bad", text: `Beitrag konnte nicht gelöscht werden: ${error.message}` });
      return;
    }

    await loadData();
  }

  async function handleTogglePin(post: NewsPost) {
    await supabase.from("news_posts").update({ pinned: !post.pinned }).eq("id", post.id);
    await loadData();
  }

  return (
    <main className="mx-auto max-w-4xl space-y-6">
      <PageHeader
        icon="news"
        title="News-Wall"
        description="Ankündigungen für dein Team. Angeheftete Beiträge stehen bei den Athleten ganz oben – auch auf ihrer Startseite."
      />

      {message && <Notice tone={message.tone}>{message.text}</Notice>}

      <Card title={draft.id ? "Beitrag bearbeiten" : "Neuer Beitrag"}>
        <form onSubmit={handleSubmit} className="space-y-4 p-5">
          <div className="grid gap-4 sm:grid-cols-[1fr_220px]">
            <FormField label="Überschrift *">
              <input
                type="text"
                value={draft.title}
                onChange={(event) => setDraft({ ...draft, title: event.target.value })}
                placeholder="z. B. Trainingsausfall am Freitag"
                required
                className={inputClass}
              />
            </FormField>
            <FormField label="An">
              <select value={draft.teamId} onChange={(event) => setDraft({ ...draft, teamId: event.target.value })} className={inputClass}>
                <option value="">Alle meine Teams</option>
                {teams.map((team) => (
                  <option key={team.id} value={team.id}>
                    {team.name}
                  </option>
                ))}
              </select>
            </FormField>
          </div>

          <FormField label="Text" hint="Links (https://…) werden automatisch klickbar.">
            <textarea
              value={draft.body}
              onChange={(event) => setDraft({ ...draft, body: event.target.value })}
              rows={5}
              className={inputClass}
            />
          </FormField>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <label className="flex items-center gap-2 text-sm text-app-text">
              <input type="checkbox" checked={draft.pinned} onChange={(event) => setDraft({ ...draft, pinned: event.target.checked })} />
              Oben anheften
            </label>
            <div className="flex gap-2">
              {draft.id && (
                <button type="button" onClick={() => setDraft(emptyDraft)} className={buttonSecondary}>
                  Abbrechen
                </button>
              )}
              <button type="submit" disabled={saving} className={buttonPrimary}>
                {saving ? "Speichern..." : draft.id ? "Speichern" : "Veröffentlichen"}
              </button>
            </div>
          </div>
        </form>
      </Card>

      <NewsList
        posts={posts}
        teamName={teamName}
        onEdit={(post) => {
          setDraft({ id: post.id, title: post.title, body: post.body, teamId: post.team_id ?? "", pinned: post.pinned });
          window.scrollTo({ top: 0, behavior: "smooth" });
        }}
        onDelete={handleDelete}
        onTogglePin={handleTogglePin}
      />
    </main>
  );
}
