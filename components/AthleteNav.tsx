"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/*
 * Navigation des Athletenbereichs - eine Leiste am
 * unteren Rand, damit sie am Becken mit dem Daumen
 * erreichbar ist.
 *
 * Mehr als fuenf Eintraege passen hier nicht hin.
 */
const navigation = [
  {
    href: "/athlete",
    label: "Start",
    icon: (
      <path d="M3 9l7-5.5L17 9v7.1a.9.9 0 0 1-.9.9H3.9a.9.9 0 0 1-.9-.9z" />
    ),
  },
  {
    href: "/athlete/check-in",
    label: "Check-in",
    icon: (
      <>
        <rect x="3" y="3.2" width="14" height="14" rx="2.2" />
        <path d="M6.8 10.2l2.3 2.3 4.1-4.3" />
      </>
    ),
  },
  {
    href: "/athlete/training",
    label: "Training",
    icon: (
      <>
        <rect x="2.6" y="4.2" width="14.8" height="13.2" rx="2" />
        <path d="M2.6 8.3h14.8M6.6 2.4v3.2M13.4 2.4v3.2" />
      </>
    ),
  },
  {
    href: "/athlete/pain",
    label: "Schmerz",
    icon: (
      <path d="M10 16.8S3.2 12.9 3.2 8.2a3.4 3.4 0 0 1 6.8-1 3.4 3.4 0 0 1 6.8 1c0 4.7-6.8 8.6-6.8 8.6z" />
    ),
  },
  {
    href: "/athlete/analytics",
    label: "Werte",
    icon: <path d="M3.4 16.2V10M10 16.2V3.8M16.6 16.2V7.4" />,
  },
];

function isActive(
  pathname: string,
  href: string
) {
  if (href === "/athlete") {
    return pathname === "/athlete";
  }

  return (
    pathname === href ||
    pathname.startsWith(`${href}/`)
  );
}

export default function AthleteNav() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-30 border-t border-app-border bg-app-surface"
      style={{
        paddingBottom:
          "env(safe-area-inset-bottom, 0px)",
      }}
    >
      <div className="mx-auto flex max-w-xl items-stretch justify-around gap-1 px-2 py-1.5">
        {navigation.map((item) => {
          const active = isActive(
            pathname,
            item.href
          );

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={
                active ? "page" : undefined
              }
              className={`flex min-h-12 flex-1 flex-col items-center justify-center gap-1 rounded-xl px-1 py-1.5 text-[11px] font-medium transition ${
                active
                  ? "bg-app-elevated text-sky-400"
                  : "text-app-muted hover:bg-app-elevated hover:text-white"
              }`}
            >
              <svg
                viewBox="0 0 20 20"
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                {item.icon}
              </svg>

              <span className="leading-none">
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
