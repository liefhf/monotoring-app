"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import LogoutButton from "@/components/LogoutButton";
import { ThemeSegment } from "@/components/ThemeToggle";
import NotificationBell from "@/components/NotificationBell";
import Logo from "@/components/Logo";

/*
 * Navigation des Coach-Bereichs im Aufbau der Design-Uebergabe:
 * fuenf Bereiche (Heute, Athleten, Training & Kalender,
 * Auswertung, Team). Unter dem aktiven Bereich stehen seine
 * Seiten - so bleibt jede bisherige Seite erreichbar.
 * Oben "+ Erfassen" (Taste N), unten Darstellung Hell/Dunkel.
 */
type NavPage = { href: string; label: string; also?: string[] };
type NavArea = { key: string; label: string; pages: NavPage[] };

export const coachAreas: NavArea[] = [
  { key: "heute", label: "Heute", pages: [{ href: "/coach", label: "Heute" }] },
  {
    key: "athleten",
    label: "Athleten",
    pages: [
      { href: "/coach/schwimmer", label: "Athleten", also: ["/coach/athletes", "/coach/swimmerabfrage"] },
      { href: "/coach/teams", label: "Teams" },
    ],
  },
  {
    key: "training",
    label: "Training & Kalender",
    pages: [
      { href: "/coach/training", label: "Training" },
      { href: "/coach/kalender", label: "Kalender" },
      { href: "/coach/competitions", label: "Wettkämpfe" },
    ],
  },
  {
    key: "auswertung",
    label: "Auswertung",
    pages: [
      { href: "/coach/pflichtzeiten", label: "Pflichtzeiten" },
      { href: "/coach/analytics", label: "Analysen" },
    ],
  },
  {
    key: "team",
    label: "Team",
    pages: [
      { href: "/coach/news", label: "News-Wall" },
      { href: "/coach/gruppen", label: "Gruppenräume" },
      { href: "/coach/infoboard", label: "Infoboard" },
    ],
  },
];

const settingsPage: NavPage = { href: "/coach/settings", label: "Einstellungen" };

/* Schnellerfassung hinter "+ Erfassen" */
const captureActions = [
  { href: "/coach/schwimmer", label: "Wettkampfzeiten eintragen", hint: "Athlet wählen → Ergebnisse eintragen" },
  { href: "/coach/schwimmer", label: "Athlet anlegen" },
  { href: "/coach/training/new", label: "Training planen" },
  { href: "/coach/kalender", label: "Termin eintragen" },
  { href: "/coach/news", label: "Beitrag schreiben" },
  { href: "/coach/competitions/new", label: "Wettkampf anlegen" },
];

function matches(pathname: string, page: NavPage) {
  if (page.href === "/coach") return pathname === "/coach";

  return [page.href, ...(page.also ?? [])].some((href) => pathname === href || pathname.startsWith(`${href}/`));
}

/* Bereich und Seite zur aktuellen Adresse (fuer Seitenleiste und Kopfzeile) */
export function findCoachLocation(pathname: string) {
  if (matches(pathname, settingsPage)) return { area: null, page: settingsPage };

  for (const area of coachAreas) {
    const page = area.pages.find((item) => matches(pathname, item));
    if (page) return { area, page };
  }

  return { area: null, page: null };
}

function CaptureButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  /* Taste N oeffnet das Menue - nicht beim Tippen in Feldern */
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      const typing = target && (["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName) || target.isContentEditable);

      if (event.key === "Escape") setOpen(false);
      if (!typing && !event.metaKey && !event.ctrlKey && !event.altKey && (event.key === "n" || event.key === "N")) {
        event.preventDefault();
        setOpen(true);
      }
    }

    window.addEventListener("keydown", onKeyDown);

    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: PointerEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false);
    }

    document.addEventListener("pointerdown", onPointerDown);

    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className="flex h-9 w-full items-center justify-between rounded-lg bg-app-inv px-3 text-[13px] font-semibold text-app-on-inv transition hover:opacity-90"
      >
        + Erfassen
        <kbd className="num rounded border border-current/30 px-1.5 text-[11px] font-medium opacity-70">N</kbd>
      </button>

      {open && (
        <div className="absolute inset-x-0 top-11 z-50 overflow-hidden rounded-xl border border-app-border bg-app-surface py-1 shadow-toast">
          {captureActions.map((action) => (
            <button
              key={action.label}
              type="button"
              onClick={() => {
                setOpen(false);
                router.push(action.href);
              }}
              className="block w-full px-3 py-2 text-left text-[13px] text-app-heading transition hover:bg-app-sel"
            >
              {action.label}
              {action.hint && <span className="block text-[11px] text-app-faint">{action.hint}</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function NavLinks({ pathname, onNavigate }: { pathname: string; onNavigate?: () => void }) {
  const { area: activeArea } = findCoachLocation(pathname);

  return (
    <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-2" aria-label="Coach-Bereiche">
      {coachAreas.map((area) => {
        const isActiveArea = activeArea?.key === area.key;
        const showPages = isActiveArea && area.pages.length > 1;

        return (
          <div key={area.key}>
            <Link
              href={area.pages[0].href}
              onClick={onNavigate}
              aria-current={isActiveArea && !showPages ? "page" : undefined}
              className={`flex items-center justify-between rounded-lg px-2.5 py-2 text-sm transition ${
                isActiveArea ? "bg-app-sel font-semibold text-app-heading" : "text-app-muted hover:bg-app-elevated hover:text-app-heading"
              }`}
            >
              {area.label}
            </Link>

            {showPages && (
              <div className="mb-1 ml-3 mt-1 space-y-0.5 border-l border-app-border pl-2">
                {area.pages.map((page) => {
                  const active = matches(pathname, page);

                  return (
                    <Link
                      key={page.href}
                      href={page.href}
                      onClick={onNavigate}
                      aria-current={active ? "page" : undefined}
                      className={`block rounded-md px-2 py-1.5 text-[13px] transition ${
                        active ? "font-semibold text-app-accent-fg" : "text-app-muted hover:text-app-heading"
                      }`}
                    >
                      {page.label}
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

function SidebarFooter({ pathname, onNavigate }: { pathname: string; onNavigate?: () => void }) {
  const settingsActive = matches(pathname, settingsPage);

  return (
    <div className="space-y-3 border-t border-app-border p-3">
      <Link
        href={settingsPage.href}
        onClick={onNavigate}
        className={`block rounded-lg px-2.5 py-1.5 text-[13px] transition ${
          settingsActive ? "bg-app-sel font-semibold text-app-heading" : "text-app-muted hover:text-app-heading"
        }`}
      >
        Einstellungen
      </Link>
      <div>
        <p className="kicker mb-1.5 px-1 text-[11px]">Darstellung</p>
        <ThemeSegment />
      </div>
      <LogoutButton className="w-full" />
    </div>
  );
}

export default function CoachNav() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const { page } = findCoachLocation(pathname);

  useEffect(() => {
    if (!menuOpen) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setMenuOpen(false);
    }

    window.addEventListener("keydown", onKeyDown);

    return () => window.removeEventListener("keydown", onKeyDown);
  }, [menuOpen]);

  return (
    <>
      {/* Mobil: Kopfzeile mit Menueknopf */}
      <div className="sticky top-0 z-30 flex h-14 items-center justify-between gap-3 border-b border-app-border bg-app-side px-4 lg:hidden print:hidden">
        <div className="flex min-w-0 items-center gap-3">
          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            aria-label="Menü öffnen"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-app-button-border text-app-heading transition hover:bg-app-elevated"
          >
            <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
              <path d="M3 5.5h14M3 10h14M3 14.5h14" />
            </svg>
          </button>
          <span className="truncate text-sm font-semibold text-app-heading">{page?.label ?? "Coach"}</span>
        </div>
        <NotificationBell />
      </div>

      {/* Mobil: ausgeklapptes Menue */}
      {menuOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button
            type="button"
            aria-label="Menü schließen"
            onClick={() => setMenuOpen(false)}
            className="absolute inset-0 h-full w-full bg-[oklch(0.2_0.02_250_/_0.35)]"
          />
          <div className="absolute inset-y-0 left-0 flex w-[260px] max-w-[85%] flex-col border-r border-app-border bg-app-side shadow-panel">
            <div className="space-y-4 px-4 pb-3 pt-4">
              <Logo />
              <CaptureButton />
            </div>
            <NavLinks pathname={pathname} onNavigate={() => setMenuOpen(false)} />
            <SidebarFooter pathname={pathname} onNavigate={() => setMenuOpen(false)} />
          </div>
        </div>
      )}

      {/* Desktop: feste Seitenleiste (228 px) */}
      <aside className="sticky top-0 hidden h-screen w-[228px] shrink-0 flex-col border-r border-app-border bg-app-side lg:flex print:hidden">
        <div className="space-y-4 px-4 pb-3 pt-4">
          <Logo />
          <CaptureButton />
        </div>
        <NavLinks pathname={pathname} />
        <SidebarFooter pathname={pathname} />
      </aside>
    </>
  );
}

/* Desktop-Kopfzeile (56 px): Pfad "Bereich › Seite" und Glocke */
export function CoachHeader() {
  const pathname = usePathname();
  const { area, page } = findCoachLocation(pathname);

  return (
    <header className="sticky top-0 z-20 hidden h-14 items-center justify-between border-b border-app-border bg-app-side px-8 lg:flex print:hidden">
      <p className="text-[13px] text-app-muted">
        {area && area.pages.length > 1 && (
          <>
            {area.label}
            <span className="mx-1.5 text-app-faint">›</span>
          </>
        )}
        <span className="font-semibold text-app-heading">{page?.label ?? "Coach"}</span>
      </p>
      <NotificationBell />
    </header>
  );
}
