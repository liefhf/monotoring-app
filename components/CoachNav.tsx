"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import LogoutButton from "@/components/LogoutButton";

/*
 * Die Navigation des Coach-Bereichs steht nur noch
 * hier. Frueher hatte fast jede Seite ihre eigene
 * Liste - mit unterschiedlich vielen Eintraegen.
 */
const navigation = [
  {
    href: "/coach",
    label: "Dashboard",
  },
  {
    href: "/coach/teams",
    label: "Teams",
  },
  {
    href: "/coach/athletes",
    label: "Athleten",
  },
  {
    href: "/coach/training",
    label: "Training",
  },
  {
    href: "/coach/competitions",
    label: "Wettkämpfe",
  },
  {
    href: "/coach/schwimmer",
    label: "Meine Schwimmer",
  },
  {
    href: "/coach/pflichtzeiten",
    label: "Pflichtzeiten",
  },
  {
    href: "/coach/swimmerabfrage",
    label: "Schwimmerabfrage",
  },
  {
    href: "/coach/analytics",
    label: "Analysen",
  },
  {
    href: "/coach/infoboard",
    label: "Infoboard",
  },
  {
    href: "/coach/settings",
    label: "Einstellungen",
  },
];

function isActive(
  pathname: string,
  href: string
) {
  /*
   * "/coach" ist nur dann aktiv, wenn man wirklich
   * auf dem Dashboard steht - sonst waere es auf
   * jeder Unterseite mit hervorgehoben.
   */
  if (href === "/coach") {
    return pathname === "/coach";
  }

  return (
    pathname === href ||
    pathname.startsWith(`${href}/`)
  );
}

function navClass(active: boolean) {
  return `block rounded-xl px-4 py-3 text-sm transition ${
    active
      ? "bg-app-accent font-semibold text-app-accent-ink"
      : "text-app-text hover:bg-app-elevated hover:text-white"
  }`;
}

export default function CoachNav() {
  const pathname = usePathname();

  const [menuOpen, setMenuOpen] =
    useState(false);

  /*
   * Beim Seitenwechsel schliesst sich das
   * mobile Menue von selbst.
   */
  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    function onKeyDown(
      event: KeyboardEvent
    ) {
      if (event.key === "Escape") {
        setMenuOpen(false);
      }
    }

    window.addEventListener(
      "keydown",
      onKeyDown
    );

    return () =>
      window.removeEventListener(
        "keydown",
        onKeyDown
      );
  }, []);

  const currentLabel =
    navigation.find((item) =>
      isActive(pathname, item.href)
    )?.label ?? "Coach";

  return (
    <>
      {/* Mobil: Kopfzeile mit Menueknopf */}
      <div className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-app-border bg-app-surface px-4 py-3 lg:hidden">
        <div className="flex min-w-0 items-center gap-3">
          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            aria-label="Menü öffnen"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-app-border text-app-text transition hover:bg-app-elevated hover:text-white"
          >
            <svg
              viewBox="0 0 20 20"
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              aria-hidden="true"
            >
              <path d="M3 5.5h14M3 10h14M3 14.5h14" />
            </svg>
          </button>

          <span className="truncate text-sm font-semibold text-white">
            {currentLabel}
          </span>
        </div>

        <LogoutButton />
      </div>

      {/* Mobil: ausgeklapptes Menue */}
      {menuOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button
            type="button"
            aria-label="Menü schließen"
            onClick={() => setMenuOpen(false)}
            className="absolute inset-0 h-full w-full bg-app-bg/70"
          />

          <div className="absolute inset-y-0 left-0 flex w-64 max-w-[85%] flex-col border-r border-app-border bg-app-surface">
            <div className="flex items-start justify-between gap-3 border-b border-app-border px-5 py-5">
              <div className="min-w-0">
                <h2 className="text-lg font-bold text-white">
                  Monitoring App
                </h2>

                <p className="mt-1 text-sm text-app-faint">
                  Coach Bereich
                </p>
              </div>

              <button
                type="button"
                onClick={() => setMenuOpen(false)}
                aria-label="Menü schließen"
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-app-border text-app-text transition hover:bg-app-elevated hover:text-white"
              >
                <svg
                  viewBox="0 0 20 20"
                  className="h-3.5 w-3.5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  aria-hidden="true"
                >
                  <path d="M5 5l10 10M15 5L5 15" />
                </svg>
              </button>
            </div>

            <nav className="flex-1 space-y-1 overflow-y-auto p-3">
              {navigation.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={navClass(
                    isActive(pathname, item.href)
                  )}
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
        </div>
      )}

      {/* Desktop: feste Seitenleiste */}
      <aside className="hidden w-64 shrink-0 border-r border-app-border bg-app-surface lg:flex lg:flex-col">
        <div className="border-b border-app-border px-6 py-6">
          <h2 className="text-xl font-bold text-white">
            Monitoring App
          </h2>

          <p className="mt-1 text-sm text-app-faint">
            Coach Bereich
          </p>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto p-3">
          {navigation.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={navClass(
                isActive(pathname, item.href)
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="border-t border-app-border p-3">
          <LogoutButton className="w-full" />
        </div>
      </aside>
    </>
  );
}
