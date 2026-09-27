"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import LogoutButton from "@/components/LogoutButton";
import ThemeToggle from "@/components/ThemeToggle";
import Logo from "@/components/Logo";
import { Icon, IconName } from "@/components/icons";

/*
 * Die Navigation des Coach-Bereichs steht nur hier.
 * Die Eintraege sind nach Aufgaben gruppiert, damit man
 * bei vielen Seiten schnell findet, was man sucht.
 */
type NavItem = { href: string; label: string; icon: IconName };

export const coachNavigation: { title: string | null; items: NavItem[] }[] = [
  {
    title: null,
    items: [{ href: "/coach", label: "Dashboard", icon: "home" }],
  },
  {
    title: "Team",
    items: [
      { href: "/coach/teams", label: "Teams", icon: "teams" },
      { href: "/coach/athletes", label: "Athleten", icon: "athlete" },
      { href: "/coach/schwimmer", label: "Meine Schwimmer", icon: "swimmer" },
    ],
  },
  {
    title: "Planung",
    items: [
      { href: "/coach/kalender", label: "Kalender", icon: "calendar" },
      { href: "/coach/training", label: "Training", icon: "training" },
      { href: "/coach/competitions", label: "Wettkämpfe", icon: "trophy" },
    ],
  },
  {
    title: "Leistung",
    items: [
      { href: "/coach/pflichtzeiten", label: "Pflichtzeiten", icon: "stopwatch" },
      { href: "/coach/swimmerabfrage", label: "Schwimmerabfrage", icon: "search" },
      { href: "/coach/analytics", label: "Analysen", icon: "chart" },
    ],
  },
  {
    title: "Kommunikation",
    items: [
      { href: "/coach/news", label: "News-Wall", icon: "news" },
      { href: "/coach/gruppen", label: "Gruppenräume", icon: "chat" },
    ],
  },
  {
    title: "Wissen",
    items: [
      { href: "/coach/infoboard", label: "Infoboard", icon: "book" },
      { href: "/coach/settings", label: "Einstellungen", icon: "settings" },
    ],
  },
];

function isActive(pathname: string, href: string) {
  /*
   * "/coach" ist nur dann aktiv, wenn man wirklich auf
   * dem Dashboard steht - sonst waere es auf jeder
   * Unterseite mit hervorgehoben.
   */
  if (href === "/coach") {
    return pathname === "/coach";
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

function NavLinks({ pathname, onNavigate }: { pathname: string; onNavigate?: () => void }) {
  return (
    <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-4">
      {coachNavigation.map((group) => (
        <div key={group.title ?? "start"}>
          {group.title && (
            <p className="mb-1.5 px-3 text-[11px] font-semibold uppercase tracking-wider text-app-faint">
              {group.title}
            </p>
          )}
          <div className="space-y-0.5">
            {group.items.map((item) => {
              const active = isActive(pathname, item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onNavigate}
                  aria-current={active ? "page" : undefined}
                  className={`flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition ${
                    active
                      ? "bg-app-accent/12 font-semibold text-app-accent"
                      : "text-app-text hover:bg-app-elevated hover:text-app-heading"
                  }`}
                >
                  <Icon name={item.icon} className="h-[18px] w-[18px] shrink-0" />
                  {item.label}
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );
}

export default function CoachNav() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (!menuOpen) {
      return;
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setMenuOpen(false);
      }
    }

    window.addEventListener("keydown", onKeyDown);

    return () => window.removeEventListener("keydown", onKeyDown);
  }, [menuOpen]);

  const currentLabel =
    coachNavigation
      .flatMap((group) => group.items)
      .find((item) => isActive(pathname, item.href))?.label ?? "Coach";

  return (
    <>
      {/* Mobil: Kopfzeile mit Menueknopf */}
      <div className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-app-border bg-app-surface/90 px-4 py-3 backdrop-blur lg:hidden print:hidden">
        <div className="flex min-w-0 items-center gap-3">
          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            aria-label="Menü öffnen"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-app-border text-app-text transition hover:bg-app-elevated"
          >
            <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
              <path d="M3 5.5h14M3 10h14M3 14.5h14" />
            </svg>
          </button>

          <span className="truncate text-sm font-semibold text-app-heading">{currentLabel}</span>
        </div>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          <LogoutButton />
        </div>
      </div>

      {/* Mobil: ausgeklapptes Menue */}
      {menuOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button
            type="button"
            aria-label="Menü schließen"
            onClick={() => setMenuOpen(false)}
            className="absolute inset-0 h-full w-full bg-app-bg/70 backdrop-blur-sm"
          />

          <div className="absolute inset-y-0 left-0 flex w-72 max-w-[85%] flex-col border-r border-app-border bg-app-surface shadow-app">
            <div className="flex items-center justify-between gap-3 border-b border-app-border px-4 py-4">
              <Logo subtitle="Coach-Bereich" />

              <button
                type="button"
                onClick={() => setMenuOpen(false)}
                aria-label="Menü schließen"
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-app-border text-app-text transition hover:bg-app-elevated"
              >
                <svg viewBox="0 0 20 20" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                  <path d="M5 5l10 10M15 5L5 15" />
                </svg>
              </button>
            </div>

            <NavLinks pathname={pathname} onNavigate={() => setMenuOpen(false)} />
          </div>
        </div>
      )}

      {/* Desktop: feste Seitenleiste */}
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 border-r border-app-border bg-app-surface lg:flex lg:flex-col print:hidden">
        <div className="border-b border-app-border px-4 py-5">
          <Logo subtitle="Coach-Bereich" />
        </div>

        <NavLinks pathname={pathname} />

        <div className="flex items-center gap-2 border-t border-app-border p-3">
          <LogoutButton className="flex-1" />
          <ThemeToggle />
        </div>
      </aside>
    </>
  );
}
