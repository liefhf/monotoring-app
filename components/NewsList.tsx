"use client";

import { NewsPost, formatRelative } from "@/lib/community";
import { Icon } from "@/components/icons";
import { EmptyState, RichText, buttonGhost } from "@/components/ui";

/*
 * Beitraege der News-Wall. Angeheftete stehen oben.
 * Mit onEdit/onDelete/onTogglePin (nur Coach) erscheinen
 * die Bearbeiten-Knoepfe.
 */
export default function NewsList({
  posts,
  teamName,
  onEdit,
  onDelete,
  onTogglePin,
}: {
  posts: NewsPost[];
  teamName: (teamId: string | null) => string;
  onEdit?: (post: NewsPost) => void;
  onDelete?: (post: NewsPost) => void;
  onTogglePin?: (post: NewsPost) => void;
}) {
  if (posts.length === 0) {
    return (
      <div className="rounded-2xl border border-app-border bg-app-surface shadow-app">
        <EmptyState icon="news" title="Noch keine Neuigkeiten">
          {onEdit ? "Schreib den ersten Beitrag für dein Team." : "Sobald dein Trainer etwas veröffentlicht, steht es hier."}
        </EmptyState>
      </div>
    );
  }

  const sorted = [...posts].sort(
    (a, b) => Number(b.pinned) - Number(a.pinned) || b.created_at.localeCompare(a.created_at)
  );

  return (
    <div className="space-y-4">
      {sorted.map((post) => (
        <article
          key={post.id}
          className={`rounded-2xl border bg-app-surface p-5 shadow-app ${
            post.pinned ? "border-app-accent/50" : "border-app-border"
          }`}
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2 text-xs text-app-muted">
                {post.pinned && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-app-accent/12 px-2 py-0.5 font-semibold text-app-accent">
                    <Icon name="pin" className="h-3 w-3" />
                    Angeheftet
                  </span>
                )}
                <span>{teamName(post.team_id)}</span>
                <span>·</span>
                <time dateTime={post.created_at} title={new Date(post.created_at).toLocaleString("de-DE")}>
                  {formatRelative(post.created_at)}
                </time>
              </div>
              <h2 className="mt-1.5 text-lg font-semibold">{post.title}</h2>
            </div>

            {onEdit && (
              <div className="flex items-center gap-1">
                <button type="button" onClick={() => onTogglePin?.(post)} className={buttonGhost}>
                  {post.pinned ? "Lösen" : "Anheften"}
                </button>
                <button type="button" onClick={() => onEdit(post)} className={buttonGhost}>
                  Bearbeiten
                </button>
                <button type="button" onClick={() => onDelete?.(post)} className={`${buttonGhost} hover:text-app-bad`}>
                  Löschen
                </button>
              </div>
            )}
          </div>

          {post.body && <RichText text={post.body} className="mt-3 text-sm leading-relaxed text-app-text" />}
        </article>
      ))}
    </div>
  );
}
