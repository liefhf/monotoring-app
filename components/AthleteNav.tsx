"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import LogoutButton from "@/components/LogoutButton";
import { Icon, IconName } from "@/components/icons";

/*
 * Navigation des Athletenbereichs - eine Leiste am
 * unteren Rand, damit sie am Becken mit dem Daumen
 * erreichbar ist.
 *
 * In die Leiste passen fuenf Eintraege. Alles Weitere
 * steht unter "Mehr".
 */
type NavItem = { href: string; label: string; icon: IconName };

const mainItems: NavItem[] = [
  { href: "/athlete", label: "Start", icon: "home" },
  { href: "/athlete/check-in", label: "Check-in", icon: "check" },
  { href: "/athlete/training", label: "Training", icon: "training" },
  { href: "/athlete/termine", label: "Termine", icon: "calendar" },
];

const moreItems: NavItem[] = [
  { href: "/athlete/wettkaempfe", label: "Wettkämpfe", icon: "trophy" },
  { href: "/athlete/news", label: "News", icon: "news" },
  { href: "/athlete/gruppen", label: "Gruppenräume", icon: "chat" },
  { href: "/athlete/pain", label: "Schmerz", icon: "heart" },
  { href: "/athlete/analytics", label: "Meine Werte", icon: "chart" },
];

function isActive(pathname: string, href: string) {
  if (href === "/athlete") {
    return pathname === "/athlete";
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function AthleteNav() {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);
  const moreActive = moreItems.some((item) => isActive(pathname, item.href));

  useEffect(() => {
    if (!moreOpen) {
      return;
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setMoreOpen(false);
      }
    }

    window.addEventListener("keydown", onKeyDown);

    return () => window.removeEventListener("keydown", onKeyDown);
  }, [moreOpen]);

  const itemClass = (active: boolean) =>
    `flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 rounded-xl px-1 py-1.5 text-[11px] font-bold transition ${
      active ? "text-app-heading" : "text-app-faint hover:text-app-heading"
    }`;

  return (
    <>
      {moreOpen && (
        <div className="fixed inset-0 z-40">
          <button
            type="button"
            aria-label="Menü schließen"
            onClick={() => setMoreOpen(false)}
            className="absolute inset-0 h-full w-full bg-app-bg/60 backdrop-blur-sm"
          />

          <div
            className="absolute inset-x-0 bottom-0 mx-auto max-w-xl rounded-t-3xl border border-app-border bg-app-surface p-4 shadow-app"
            style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 5.5rem)" }}
          >
            <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-app-border" />
            <div className="grid grid-cols-2 gap-2">
              {moreItems.map((item) => {
                const active = isActive(pathname, item.href);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMoreOpen(false)}
                    aria-current={active ? "page" : undefined}
                    className={`flex min-h-13 items-center gap-3 rounded-[14px] border px-4 py-3 text-sm font-semibold transition ${
                      active
                        ? "border-app-accent/40 bg-app-accent/15 text-app-accent-soft"
                        : "border-app-border/60 text-app-heading hover:bg-app-elevated"
                    }`}
                  >
                    <Icon name={item.icon} />
                    {item.label}
                  </Link>
                );
              })}
            </div>
            <LogoutButton className="mt-3 w-full" />
          </div>
        </div>
      )}

      <nav
        aria-label="Hauptnavigation"
        className="fixed inset-x-3 bottom-3 z-50 mx-auto max-w-xl rounded-[22px] border border-app-border/60 bg-app-sidebar/95 shadow-app backdrop-blur print:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      >
        <div className="flex items-stretch justify-around gap-1 px-2">
          {mainItems.map((item) => {
            const active = isActive(pathname, item.href) && !moreOpen;

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMoreOpen(false)}
                aria-current={active ? "page" : undefined}
                className={itemClass(active)}
              >
                <Icon name={item.icon} />
                <span className="leading-none">{item.label}</span>
              </Link>
            );
          })}

          <button
            type="button"
            onClick={() => setMoreOpen((open) => !open)}
            aria-expanded={moreOpen}
            className={itemClass(moreOpen || moreActive)}
          >
            <Icon name="more" />
            <span className="leading-none">Mehr</span>
          </button>
        </div>
      </nav>
    </>
  );
}
