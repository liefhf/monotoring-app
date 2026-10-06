"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import LogoutButton from "@/components/LogoutButton";
import ThemeToggle from "@/components/ThemeToggle";
import ContrastToggle from "@/components/ContrastToggle";
import NotificationBell from "@/components/NotificationBell";
import Logo, { LogoMark } from "@/components/Logo";
import { Icon, IconName } from "@/components/icons";

/*
 * Die Navigation des Coach-Bereichs steht nur hier.
 * Die Eintraege sind nach Aufgaben gruppiert, damit man
 * bei vielen Seiten schnell findet, was man sucht.
 */
type NavItem = { href: string; label: string; icon: IconName };

type NavGroup = {
  title: string | null;
  icon: IconName;
  /* Farbe des Gruppen-Symbols (Design: jede Gruppe eine Farbe) */
  tone: string;
  items: NavItem[];
};

export const coachNavigation: NavGroup[] = [
  {
    title: null,
    icon: "home",
    tone: "bg-app-elevated text-app-heading",
    items: [{ href: "/coach", label: "Start", icon: "home" }],
  },
  {
    title: "Team",
    icon: "teams",
    tone: "bg-app-good/20 text-app-good",
    items: [
      { href: "/coach/schwimmer", label: "Athleten", icon: "athlete" },
      { href: "/coach/anwesenheit", label: "Anwesenheit", icon: "check" },
      { href: "/coach/athleten-check", label: "Athleten-Check", icon: "heart" },
      { href: "/coach/teams", label: "Teams", icon: "teams" },
    ],
  },
  {
    title: "Planung",
    icon: "calendar",
    tone: "bg-app-accent-soft/20 text-app-accent-soft",
    items: [
      { href: "/coach/wochenplan", label: "Wochenplan", icon: "calendar" },
      { href: "/coach/training", label: "Training", icon: "training" },
      { href: "/coach/kalender", label: "Kalender", icon: "calendar" },
    ],
  },
  {
    title: "Wettkampf",
    icon: "trophy",
    tone: "bg-app-soon/20 text-app-soon",
    items: [
      { href: "/coach/competitions", label: "Wettkämpfe", icon: "trophy" },
      { href: "/coach/analytics/wettkampf", label: "Auswertung", icon: "chart" },
      { href: "/coach/meldehilfe", label: "Meldehilfe", icon: "stopwatch" },
      { href: "/coach/dms", label: "DMS-Aufstellung", icon: "teams" },
    ],
  },
  {
    title: "Leistung",
    icon: "chart",
    tone: "bg-app-warn/20 text-app-warn",
    items: [
      { href: "/coach/pflichtzeiten", label: "Pflichtzeiten", icon: "stopwatch" },
      { href: "/coach/tests", label: "Testbatterie", icon: "chart" },
    ],
  },
  {
    title: "Infos",
    icon: "news",
    tone: "bg-app-info/20 text-app-info",
    items: [
      { href: "/coach/infoboard", label: "Infoboard", icon: "book" },
      { href: "/coach/gruppen", label: "Gruppenräume", icon: "chat" },
    ],
  },
];

/* Handy: feste Leiste unten (Design: Start · Team · + · Planung · Mehr) */
const mobileTabs: { href: string; label: string; icon: IconName; group: string | null }[] = [
  { href: "/coach", label: "Start", icon: "home", group: null },
  { href: "/coach/schwimmer", label: "Team", icon: "teams", group: "Team" },
  { href: "/coach/wochenplan", label: "Planung", icon: "calendar", group: "Planung" },
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

  /* Die Wettkampf-Auswertung hat einen eigenen Menuepunkt */
  if (href === "/coach/analytics") {
    return pathname === href;
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

function NavLinks({ pathname, onNavigate }: { pathname: string; onNavigate?: () => void }) {
  return (
    <nav aria-label="Hauptnavigation" className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
      {coachNavigation.map((group) => {
        /* Startseite: eine einzelne Zeile ohne Unterpunkte */
        if (!group.title) {
          const item = group.items[0];
          const active = isActive(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              aria-current={active ? "page" : undefined}
              className={`flex h-10 items-center gap-3 rounded-xl px-2.5 text-sm font-bold transition ${
                active ? "bg-app-elevated text-app-heading" : "text-app-heading hover:bg-app-elevated/60"
              }`}
            >
              <span className={`flex h-7 w-7 items-center justify-center rounded-lg ${group.tone}`}>
                <Icon name={item.icon} className="h-[17px] w-[17px]" />
              </span>
              {item.label}
            </Link>
          );
        }

        return (
          <div key={group.title} className="pt-2">
            <p className="flex h-10 items-center gap-3 px-2.5 text-sm font-bold text-app-heading">
              <span className={`flex h-7 w-7 items-center justify-center rounded-lg ${group.tone}`}>
                <Icon name={group.icon} className="h-[17px] w-[17px]" />
              </span>
              {group.title}
            </p>
            <div className="ml-[23px] border-l border-app-border/70 pl-3">
              {group.items.map((item) => {
                const active = isActive(pathname, item.href);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onNavigate}
                    aria-current={active ? "page" : undefined}
                    className={`-ml-[13px] flex min-h-9 items-center border-l-2 pl-[11px] text-sm transition ${
                      active
                        ? "border-app-good font-bold text-app-heading"
                        : "border-transparent text-app-muted hover:text-app-heading"
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>
        );
      })}
    </nav>
  );
}

/* Ein Handy-Tab ist aktiv, wenn die aktuelle Seite zu seiner Gruppe gehoert. */
function isTabActive(pathname: string, group: string | null) {
  if (group === null) {
    return pathname === "/coach";
  }

  const owner = coachNavigation.find((g) => g.items.some((item) => isActive(pathname, item.href)));
  const ownerTitle = owner?.title ?? (pathname === "/coach" ? null : "more");

  if (group === "more") {
    return ownerTitle !== null && ownerTitle !== "Team" && ownerTitle !== "Planung";
  }

  return ownerTitle === group;
}

function MobileTab({ tab, active }: { tab: (typeof mobileTabs)[number]; active: boolean }) {
  return (
    <Link
      href={tab.href}
      aria-current={active ? "page" : undefined}
      className={`flex h-14 flex-1 flex-col items-center justify-center gap-0.5 text-[11px] font-bold ${
        active ? "text-app-heading" : "text-app-faint"
      }`}
    >
      <Icon name={tab.icon} className="h-[22px] w-[22px]" />
      {tab.label}
    </Link>
  );
}

function SettingsLink({ active }: { active: boolean }) {
  return (
    <Link
      href="/coach/settings"
      aria-label="Einstellungen"
      aria-current={active ? "page" : undefined}
      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition hover:bg-app-elevated ${
        active ? "text-app-heading" : "text-app-muted"
      }`}
    >
      <Icon name="settings" className="h-[18px] w-[18px]" />
    </Link>
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
          <LogoMark className="h-8 w-8" />
          <span className="truncate text-sm font-bold text-app-heading">{currentLabel}</span>
        </div>

        <div className="flex items-center gap-2">
          <NotificationBell />
          <ContrastToggle />
          <ThemeToggle />
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

            <div className="border-t border-app-border/60 p-3">
              <Link
                href="/coach/settings"
                onClick={() => setMenuOpen(false)}
                className="flex min-h-11 items-center gap-3 rounded-xl px-2.5 text-sm font-bold text-app-heading hover:bg-app-elevated"
              >
                <Icon name="settings" className="h-[18px] w-[18px]" />
                Einstellungen
              </Link>
              <LogoutButton className="mt-2 w-full" />
            </div>
          </div>
        </div>
      )}

      {/* Handy: Leiste unten mit "+" in der Mitte */}
      <nav
        aria-label="Schnellnavigation"
        className="fixed inset-x-3 bottom-3 z-30 flex items-center rounded-[22px] border border-app-border/60 bg-app-sidebar/95 px-2 pb-[env(safe-area-inset-bottom)] shadow-app backdrop-blur lg:hidden print:hidden"
      >
        {mobileTabs.slice(0, 2).map((tab) => (
          <MobileTab key={tab.href} tab={tab} active={isTabActive(pathname, tab.group)} />
        ))}
        <Link
          href="/coach/training/new"
          aria-label="Neue Einheit planen"
          className="bg-highlight -mt-6 flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-white shadow-lg"
        >
          <Icon name="plus" className="h-7 w-7" />
        </Link>
        {mobileTabs.slice(2).map((tab) => (
          <MobileTab key={tab.href} tab={tab} active={isTabActive(pathname, tab.group)} />
        ))}
        <button
          type="button"
          onClick={() => setMenuOpen(true)}
          className={`flex h-14 flex-1 flex-col items-center justify-center gap-0.5 text-[11px] font-bold ${
            menuOpen || isTabActive(pathname, "more") ? "text-app-heading" : "text-app-faint"
          }`}
        >
          <Icon name="more" className="h-[22px] w-[22px]" />
          Mehr
        </button>
      </nav>

      {/* Desktop: feste Seitenleiste */}
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 border-r border-app-border/60 bg-app-sidebar lg:flex lg:flex-col print:hidden">
        <div className="relative z-10 flex items-center justify-between gap-2 px-4 pb-1 pt-5">
          <Logo subtitle="Coach-Bereich" />
          <NotificationBell align="left" />
        </div>

        <NavLinks pathname={pathname} />

        <div className="flex items-center gap-2 border-t border-app-border/60 p-3">
          <LogoutButton className="flex-1" />
          <SettingsLink active={isActive(pathname, "/coach/settings")} />
          <ContrastToggle />
          <ThemeToggle />
        </div>
      </aside>
    </>
  );
}
