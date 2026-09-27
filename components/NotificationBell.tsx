"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { formatRelative } from "@/lib/community";
import { Icon, IconName } from "@/components/icons";

/*
 * Glocke mit Hinweisen (News, Termine, Feedback, Einschaetzungen).
 * Die Hinweise legt die Datenbank per Trigger an
 * (supabase/hinweise.sql); hier werden sie nur angezeigt und
 * als gelesen markiert. Neue kommen live dazu.
 * Ist die Tabelle noch nicht eingerichtet, blendet sich die
 * Glocke einfach aus.
 */

type Notification = {
  id: string;
  kind: "news" | "termin" | "feedback" | "einschaetzung";
  title: string;
  body: string | null;
  link: string | null;
  read_at: string | null;
  created_at: string;
};

const KIND_ICONS: Record<Notification["kind"], IconName> = {
  news: "news",
  termin: "calendar",
  feedback: "trophy",
  einschaetzung: "chat",
};

export default function NotificationBell({ align = "right" }: { align?: "left" | "right" }) {
  const [items, setItems] = useState<Notification[] | null>(null);
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from("notifications")
      .select("id, kind, title, body, link, read_at, created_at")
      .order("created_at", { ascending: false })
      .limit(30);

    setItems(error ? null : ((data ?? []) as Notification[]));
  }, []);

  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null;

    // eslint-disable-next-line react-hooks/set-state-in-effect -- Daten beim Oeffnen laden
    load();

    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) return;

      channel = supabase
        .channel(`notifications-${data.user.id}`)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "notifications", filter: `recipient_id=eq.${data.user.id}` },
          () => load()
        )
        .subscribe();
    });

    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, [load]);

  /* Klick ausserhalb schliesst */
  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: PointerEvent) {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) setOpen(false);
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  async function markRead(ids: string[]) {
    if (ids.length === 0) return;

    const now = new Date().toISOString();
    setItems((current) => current?.map((item) => (ids.includes(item.id) ? { ...item, read_at: now } : item)) ?? current);
    await supabase.from("notifications").update({ read_at: now }).in("id", ids);
  }

  if (items === null) return null;

  const unread = items.filter((item) => !item.read_at);

  return (
    <div ref={panelRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-label={unread.length ? `${unread.length} neue Hinweise` : "Hinweise"}
        aria-expanded={open}
        className="relative flex h-9 w-9 items-center justify-center rounded-lg border border-app-border text-app-muted transition hover:bg-app-elevated hover:text-app-heading"
      >
        <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M5 8a5 5 0 0 1 10 0c0 4.5 1.8 5.8 1.8 5.8H3.2S5 12.5 5 8z" />
          <path d="M8.3 16.5a1.8 1.8 0 0 0 3.4 0" />
        </svg>
        {unread.length > 0 && (
          <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-app-bad px-1 text-[10px] font-bold text-white">
            {unread.length > 9 ? "9+" : unread.length}
          </span>
        )}
      </button>

      {open && (
        <div
          className={`absolute top-11 z-[70] w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-app-border bg-app-surface shadow-app ${
            align === "right" ? "right-0" : "left-0"
          }`}
        >
          <div className="flex items-center justify-between border-b border-app-border px-4 py-3">
            <p className="font-semibold text-app-heading">Hinweise</p>
            {unread.length > 0 && (
              <button type="button" onClick={() => markRead(unread.map((item) => item.id))} className="text-xs font-medium text-app-accent hover:underline">
                Alle gelesen
              </button>
            )}
          </div>

          {items.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-app-muted">Keine Hinweise.</p>
          ) : (
            <ul className="max-h-[60vh] divide-y divide-app-border overflow-y-auto">
              {items.map((item) => {
                const content = (
                  <>
                    <span
                      className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${
                        item.read_at ? "bg-app-elevated text-app-muted" : "bg-app-accent/12 text-app-accent"
                      }`}
                    >
                      <Icon name={KIND_ICONS[item.kind]} className="h-4 w-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className={`block text-sm ${item.read_at ? "text-app-text" : "font-semibold text-app-heading"}`}>{item.title}</span>
                      {item.body && <span className="line-clamp-2 block text-xs text-app-muted">{item.body}</span>}
                      <span className="mt-0.5 block text-[11px] text-app-faint">{formatRelative(item.created_at)}</span>
                    </span>
                    {!item.read_at && <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-app-accent" aria-label="ungelesen" />}
                  </>
                );

                const className = "flex w-full items-start gap-3 px-4 py-3 text-left transition hover:bg-app-elevated";

                return (
                  <li key={item.id}>
                    {item.link ? (
                      <Link
                        href={item.link}
                        onClick={() => {
                          markRead([item.id]);
                          setOpen(false);
                        }}
                        className={className}
                      >
                        {content}
                      </Link>
                    ) : (
                      <button type="button" onClick={() => markRead([item.id])} className={className}>
                        {content}
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
