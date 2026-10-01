"use client";

import Loader from "@/components/Loader";
import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { CALENDAR_COLUMNS, CalendarEntry, NewsPost, formatRelative, formatTimeOfDay, getCategory } from "@/lib/community";
import { Icon, IconName } from "@/components/icons";

/*
 * Bausteine fuer die Startseiten (Coach-Dashboard und
 * Athleten-Start): Schnellzugriff-Kacheln, naechste
 * Termine und neueste News.
 */

export type Tile = { href: string; label: string; icon: IconName; hint?: string };

export function QuickTiles({ tiles }: { tiles: Tile[] }) {
  return (
    <div className="grid grid-cols-4 gap-1 sm:gap-3 lg:grid-cols-6 xl:grid-cols-8">
      {tiles.map((tile) => (
        <Link
          key={tile.href}
          href={tile.href}
          title={tile.hint}
          className="group flex flex-col items-center gap-2 rounded-2xl p-2 text-center transition hover:bg-app-surface"
        >
          <span className="flex h-14 w-14 items-center justify-center rounded-[22px] border-2 border-app-border bg-app-surface text-app-accent shadow-app transition group-hover:-translate-y-0.5 group-hover:border-app-accent/60 sm:h-[72px] sm:w-[72px]">
            <Icon name={tile.icon} className="h-7 w-7 sm:h-8 sm:w-8" />
          </span>
          <span className="text-[11px] font-medium leading-tight text-app-heading sm:text-sm">{tile.label}</span>
        </Link>
      ))}
    </div>
  );
}

function WidgetCard({
  title,
  href,
  linkLabel,
  children,
}: {
  title: string;
  href: string;
  linkLabel: string;
  children: React.ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-app-border bg-app-surface shadow-app">
      <div className="flex items-center justify-between gap-3 border-b border-app-border px-4 py-3">
        <h2 className="text-sm font-semibold">{title}</h2>
        <Link href={href} className="text-xs font-medium text-app-accent hover:underline">
          {linkLabel} →
        </Link>
      </div>
      {children}
    </section>
  );
}

export function UpcomingEntries({ href, limit = 4 }: { href: string; limit?: number }) {
  const [entries, setEntries] = useState<CalendarEntry[] | null>(null);

  useEffect(() => {
    supabase
      .from("calendar_entries")
      .select(CALENDAR_COLUMNS)
      .gte("starts_at", new Date(Date.now() - 3600000).toISOString())
      .order("starts_at")
      .limit(limit)
      .then(({ data }) => setEntries((data ?? []) as CalendarEntry[]));
  }, [limit]);

  return (
    <WidgetCard title="Nächste Termine" href={href} linkLabel="Kalender">
      {entries === null ? (
        <p className="px-4 py-6 text-sm text-app-muted"><Loader /></p>
      ) : entries.length === 0 ? (
        <p className="px-4 py-6 text-sm text-app-muted">Keine anstehenden Termine.</p>
      ) : (
        <ul className="divide-y divide-app-border">
          {entries.map((entry) => {
            const start = new Date(entry.starts_at);

            return (
              <li key={entry.id}>
                <Link href={href} className="flex items-center gap-3 px-4 py-2.5 transition hover:bg-app-elevated">
                  <span className="flex w-10 shrink-0 flex-col items-center rounded-lg border border-app-border py-0.5">
                    <span className="text-[9px] font-semibold uppercase text-app-faint">
                      {start.toLocaleDateString("de-DE", { weekday: "short" })}
                    </span>
                    <span className="text-base font-bold leading-none text-app-heading">{start.getDate()}.</span>
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1.5">
                      <span className={`h-2 w-2 shrink-0 rounded-full ${getCategory(entry.category).dot}`} />
                      <span className="truncate text-sm font-medium text-app-heading">{entry.title}</span>
                    </span>
                    <span className="block truncate text-xs text-app-muted">
                      {entry.all_day ? "ganztägig" : `${formatTimeOfDay(entry.starts_at)} Uhr`}
                      {entry.location ? ` · ${entry.location}` : ""}
                    </span>
                  </span>
                  {entry.visibility === "coach" && <Icon name="lock" className="h-3.5 w-3.5 shrink-0 text-app-faint" />}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </WidgetCard>
  );
}

export function LatestNews({ href, limit = 3 }: { href: string; limit?: number }) {
  const [posts, setPosts] = useState<NewsPost[] | null>(null);

  useEffect(() => {
    supabase
      .from("news_posts")
      .select("id, coach_id, team_id, title, body, pinned, created_at")
      .order("pinned", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(limit)
      .then(({ data }) => setPosts((data ?? []) as NewsPost[]));
  }, [limit]);

  return (
    <WidgetCard title="Neuigkeiten" href={href} linkLabel="Alle News">
      {posts === null ? (
        <p className="px-4 py-6 text-sm text-app-muted"><Loader /></p>
      ) : posts.length === 0 ? (
        <p className="px-4 py-6 text-sm text-app-muted">Noch keine Neuigkeiten.</p>
      ) : (
        <ul className="divide-y divide-app-border">
          {posts.map((post) => (
            <li key={post.id}>
              <Link href={href} className="block px-4 py-3 transition hover:bg-app-elevated">
                <span className="flex items-center gap-1.5">
                  {post.pinned && <Icon name="pin" className="h-3.5 w-3.5 shrink-0 text-app-accent" />}
                  <span className="truncate text-sm font-semibold text-app-heading">{post.title}</span>
                </span>
                {post.body && <span className="mt-0.5 line-clamp-2 block text-xs text-app-muted">{post.body}</span>}
                <span className="mt-1 block text-[11px] text-app-faint">{formatRelative(post.created_at)}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </WidgetCard>
  );
}
