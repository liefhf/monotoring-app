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

/*
 * Erste Ebene: die vier Arbeitsbereiche (Start, Athleten, Training,
 * Wettkampf) plus "Mehr". Seltenere Seiten liegen eine Ebene tiefer und
 * klappen auf, wenn man im Bereich ist oder den Pfeil antippt.
 */
type NavGroup = {
  title: string;
  icon: IconName;
  /* Hauptseite des Bereichs (null = nur Sammelpunkt) */
  main: NavItem | null;
  items: NavItem[];
};

export const coachNavigation: NavGroup[] = [
  { title: "Start", icon: "home", main: { href: "/coach", label: "Start", icon: "home" }, items: [] },
  {
    title: "Athleten",
    icon: "athlete",
    main: { href: "/coach/schwimmer", label: "Athleten", icon: "athlete" },
    items: [
      { href: "/coach/athleten-check", label: "Athleten-Check", icon: "heart" },
      { href: "/coach/anwesenheit", label: "Anwesenheit", icon: "check" },
      { href: "/coach/bericht", label: "Wochenbericht", icon: "news" },
      { href: "/coach/teams", label: "Teams", icon: "teams" },
    ],
  },
  {
    title: "Training",
    icon: "training",
    main: { href: "/coach/training", label: "Training", icon: "training" },
    items: [
      { href: "/coach/training/season", label: "Saisonplanung", icon: "calendar" },
      { href: "/coach/analytics", label: "Belastungsverlauf", icon: "chart" },
      { href: "/coach/kalender", label: "Kalender", icon: "calendar" },
    ],
  },
  {
    title: "Wettkampf",
    icon: "trophy",
    main: { href: "/coach/competitions", label: "Wettkampf", icon: "trophy" },
    items: [
      { href: "/coach/analytics/wettkampf", label: "Ergebnisse", icon: "chart" },
      { href: "/coach/meldehilfe", label: "Meldehilfe", icon: "stopwatch" },
      { href: "/coach/pflichtzeiten", label: "Pflichtzeiten", icon: "stopwatch" },
      { href: "/coach/dms", label: "DMS-Aufstellung", icon: "teams" },
      { href: "/coach/tests", label: "Testbatterie", icon: "chart" },
    ],
  },
  {
    title: "Mehr",
    icon: "more",
    main: null,
    items: [
      { href: "/coach/news", label: "News", icon: "news" },
      { href: "/coach/gruppen", label: "Gruppenräume", icon: "chat" },
      { href: "/coach/infoboard", label: "Wissen", icon: "book" },
    ],
  },
];

/* Handy: feste Leiste unten (Start · Athleten · + · Training · Mehr) */
const mobileTabs: { href: string; label: string; icon: IconName; group: string | null }[] = [
  { href: "/coach", label: "Start", icon: "home", group: null },
  { href: "/coach/schwimmer", label: "Athleten", icon: "athlete", group: "Athleten" },
  { href: "/coach/training", label: "Training", icon: "training", group: "Training" },
];

const groupHrefs = (group: NavGroup) => (group.main ? [group.main, ...group.items] : group.items).map((item) => item.href);
const allHrefs = coachNavigation.flatMap(groupHrefs).concat("/coach/settings");

/*
 * Aktiv ist der Menuepunkt mit dem laengsten passenden Pfad - so ist auf
 * /coach/training/season nur "Saisonplanung" markiert, nicht zusaetzlich
 * "Trainingswoche". "/coach" ist nur auf dem Dashboard selbst aktiv.
 */
function isActive(pathname: string, href: string) {
  if (href === "/coach") {
    return pathname === "/coach";
  }
  const matches = (candidate: string) => pathname === candidate || pathname.startsWith(`${candidate}/`);
  if (!matches(href)) return false;
  return !allHrefs.some((other) => other !== href && other.length > href.length && other.startsWith(href) && matches(other));
}

function NavLinks({ pathname, onNavigate }: { pathname: string; onNavigate?: () => void }) {
  const [opened, setOpened] = useState<Record<string, boolean>>({});
  return (
    <nav aria-label="Hauptnavigation" className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
      {coachNavigation.map((group) => {
        const inGroup = groupHrefs(group).some((href) => isActive(pathname, href));
        const expanded = group.items.length > 0 && (opened[group.title] ?? inGroup);
        const mainActive = group.main ? isActive(pathname, group.main.href) : false;
        const listId = `nav-${group.title}`;
        return (
          <div key={group.title}>
            <div className="flex items-center gap-1">
              {group.main ? (
                <Link
                  href={group.main.href}
                  onClick={onNavigate}
                  aria-current={mainActive ? "page" : undefined}
                  className={`relative flex min-h-11 flex-1 items-center gap-3 rounded-xl px-2.5 text-sm font-bold transition focus-visible:outline-2 focus-visible:outline-app-accent ${
                    mainActive ? "nav-active text-app-heading" : inGroup ? "text-app-heading hover:bg-app-accent/10" : "text-app-text hover:bg-app-accent/10 hover:text-app-heading"
                  }`}
                >
                  {mainActive && <span aria-hidden="true" className="bg-highlight absolute inset-y-2 left-0 w-1 rounded-full" />}
                  <span className={`flex h-7 w-7 items-center justify-center rounded-lg ${mainActive || inGroup ? "text-app-accent-soft" : "text-app-muted"}`}>
                    <Icon name={group.icon} className="h-[19px] w-[19px]" />
                  </span>
                  {group.title}
                </Link>
              ) : (
                <button
                  type="button"
                  onClick={() => setOpened((current) => ({ ...current, [group.title]: !expanded }))}
                  aria-expanded={expanded}
                  aria-controls={listId}
                  className="flex min-h-11 flex-1 items-center gap-3 rounded-xl px-2.5 text-left text-sm font-bold text-app-text hover:bg-app-accent/10 hover:text-app-heading focus-visible:outline-2 focus-visible:outline-app-accent"
                >
                  <span className={`flex h-7 w-7 items-center justify-center rounded-lg ${inGroup ? "text-app-accent-soft" : "text-app-muted"}`}>
                    <Icon name={group.icon} className="h-[19px] w-[19px]" />
                  </span>
                  {group.title}
                </button>
              )}
              {group.items.length > 0 && (
                <button
                  type="button"
                  onClick={() => setOpened((current) => ({ ...current, [group.title]: !expanded }))}
                  aria-expanded={expanded}
                  aria-controls={listId}
                  aria-label={`${group.title}: weitere Seiten ${expanded ? "zuklappen" : "aufklappen"}`}
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-app-muted hover:bg-app-elevated/60 hover:text-app-heading"
                >
                  <svg viewBox="0 0 20 20" className={`h-4 w-4 transition ${expanded ? "rotate-180" : ""}`} fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                    <path d="M5 8l5 5 5-5" />
                  </svg>
                </button>
              )}
            </div>
            {expanded && (
              <div id={listId} className="mb-1 ml-[23px] border-l border-app-border/70 pl-3">
                {group.items.map((item) => {
                  const active = isActive(pathname, item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={onNavigate}
                      aria-current={active ? "page" : undefined}
                      className={`-ml-[13px] flex min-h-10 items-center rounded-r-lg border-l-2 pl-[11px] text-sm transition focus-visible:outline-2 focus-visible:outline-app-accent ${
                        active ? "nav-active border-app-accent-2 font-bold text-app-heading" : "border-transparent text-app-muted hover:bg-app-accent/10 hover:text-app-heading"
                      }`}
                    >
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            )}
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

  const owner = coachNavigation.find((g) => groupHrefs(g).some((href) => isActive(pathname, href)));
  const ownerTitle = pathname === "/coach" ? null : (owner?.title ?? "more");

  if (group === "more") {
    return ownerTitle !== null && ownerTitle !== "Athleten" && ownerTitle !== "Training";
  }

  return ownerTitle === group;
}

function MobileTab({ tab, active }: { tab: (typeof mobileTabs)[number]; active: boolean }) {
  return (
    <Link
      href={tab.href}
      aria-current={active ? "page" : undefined}
      className={`flex h-14 flex-1 flex-col items-center justify-center gap-0.5 text-[11px] font-bold ${
        active ? "text-app-heading" : "text-app-muted"
      }`}
    >
      <span className={`flex h-7 w-12 items-center justify-center rounded-full ${active ? "nav-active text-app-accent-soft" : ""}`}>
        <Icon name={tab.icon} className="h-[22px] w-[22px]" />
      </span>
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
      .flatMap((group) => (group.main ? [group.main, ...group.items] : group.items))
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
              <p className="mt-2 px-1 text-[13px] text-app-muted">Darstellung</p>
              <div className="mt-1 flex flex-wrap gap-2">
                <ThemeToggle withLabel />
                <ContrastToggle withLabel />
              </div>
              <LogoutButton className="mt-2 w-full" />
            </div>
          </div>
        </div>
      )}

      {/* Handy: Leiste unten mit "+" in der Mitte */}
      <nav
        aria-label="Schnellnavigation"
        className="fixed inset-x-0 bottom-0 z-30 flex items-center border-t border-app-border bg-app-sidebar/95 px-1 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden print:hidden"
      >
        {mobileTabs.slice(0, 2).map((tab) => (
          <MobileTab key={tab.href} tab={tab} active={isTabActive(pathname, tab.group)} />
        ))}
        {/* Neue Einheit: gut erreichbar, aber ohne die taeglichen Aktionen zu ueberstrahlen */}
        <Link
          href="/coach/training/new"
          aria-current={pathname === "/coach/training/new" ? "page" : undefined}
          aria-label="Neue Einheit planen"
          className="flex h-14 flex-1 flex-col items-center justify-center gap-0.5 text-[11px] font-bold text-app-muted"
        >
          <span className="bg-highlight flex h-9 w-9 items-center justify-center rounded-full text-white shadow-[0_4px_14px_rgb(124_77_222/0.35)]">
            <Icon name="plus" className="h-5 w-5" />
          </span>
          <span className="sm:hidden">Neu</span>
          <span className="hidden sm:inline">Neue Einheit</span>
        </Link>
        {mobileTabs.slice(2).map((tab) => (
          <MobileTab key={tab.href} tab={tab} active={isTabActive(pathname, tab.group)} />
        ))}
        <button
          type="button"
          onClick={() => setMenuOpen(true)}
          className={`flex h-14 flex-1 flex-col items-center justify-center gap-0.5 text-[11px] font-bold ${
            menuOpen || isTabActive(pathname, "more") ? "text-app-heading" : "text-app-muted"
          }`}
        >
          <span className={`flex h-7 w-12 items-center justify-center rounded-full ${menuOpen || isTabActive(pathname, "more") ? "nav-active text-app-accent-soft" : ""}`}>
            <Icon name="more" className="h-[22px] w-[22px]" />
          </span>
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
