/*
 * Einheitliche Strich-Symbole (20x20) fuer Navigation und Kacheln.
 * Farbe kommt von aussen ueber currentColor.
 */
import type { ReactNode } from "react";

const paths = {
  home: <path d="M3 9l7-5.5L17 9v7.1a.9.9 0 0 1-.9.9H3.9a.9.9 0 0 1-.9-.9z" />,
  teams: (
    <>
      <circle cx="7" cy="7" r="2.6" />
      <circle cx="14" cy="8" r="2.1" />
      <path d="M2.5 16.5c.5-2.8 2.3-4.3 4.5-4.3s4 1.5 4.5 4.3M12 12.4c.6-.3 1.3-.4 2-.4 1.9 0 3.3 1.3 3.7 3.8" />
    </>
  ),
  athlete: (
    <>
      <circle cx="10" cy="6.3" r="3" />
      <path d="M4 17c.6-3.2 3-5 6-5s5.4 1.8 6 5" />
    </>
  ),
  swimmer: (
    <>
      <circle cx="14.5" cy="5.5" r="1.9" />
      <path d="M3 10.5l4.2-2.4 3.2 2.3 2.6-1.4" />
      <path d="M2.5 14c1.3 0 1.3-1 2.6-1s1.3 1 2.6 1 1.3-1 2.6-1 1.3 1 2.6 1 1.3-1 2.6-1 1.3 1 2 1" />
    </>
  ),
  training: (
    <>
      <path d="M3.5 5.5h13M3.5 10h13M3.5 14.5h8" />
      <circle cx="15" cy="14.5" r="1.8" />
    </>
  ),
  calendar: (
    <>
      <rect x="2.6" y="4.2" width="14.8" height="13.2" rx="2" />
      <path d="M2.6 8.3h14.8M6.6 2.4v3.2M13.4 2.4v3.2" />
      <path d="M6 11.5h1.5M9.25 11.5h1.5M12.5 11.5h1.5M6 14.3h1.5M9.25 14.3h1.5" />
    </>
  ),
  trophy: (
    <>
      <path d="M6 3.5h8v4.2a4 4 0 0 1-8 0z" />
      <path d="M6 5H3.5v1.3A2.7 2.7 0 0 0 6 9M14 5h2.5v1.3A2.7 2.7 0 0 1 14 9M10 11.7V14M7 16.5h6M8 14h4" />
    </>
  ),
  stopwatch: (
    <>
      <circle cx="10" cy="11" r="6" />
      <path d="M10 11V7.8M8.2 2.5h3.6M15 5.5l1.2-1.2" />
    </>
  ),
  search: (
    <>
      <circle cx="8.8" cy="8.8" r="5.3" />
      <path d="M12.8 12.8l4.2 4.2" />
    </>
  ),
  chart: <path d="M3.4 16.2V10M10 16.2V3.8M16.6 16.2V7.4" />,
  news: (
    <>
      <path d="M4 4h10v11.5a1.5 1.5 0 0 0 1.5 1.5H5.5A1.5 1.5 0 0 1 4 15.5z" />
      <path d="M14 7.5h2v8a1.5 1.5 0 0 1-1.5 1.5M6.5 7h5M6.5 10h5M6.5 13h3" />
    </>
  ),
  chat: (
    <>
      <path d="M3.5 5.5A2 2 0 0 1 5.5 3.5h9a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H9l-3.5 3v-3a2 2 0 0 1-2-2z" />
      <path d="M7 8.5h6" />
    </>
  ),
  book: (
    <>
      <path d="M10 5.2C8.6 4 6.6 3.5 3.5 3.6v11.5c3.1-.1 5.1.4 6.5 1.6 1.4-1.2 3.4-1.7 6.5-1.6V3.6c-3.1-.1-5.1.4-6.5 1.6z" />
      <path d="M10 5.2v11.5" />
    </>
  ),
  settings: (
    <>
      <circle cx="10" cy="10" r="2.6" />
      <path d="M10 2.5v2M10 15.5v2M2.5 10h2M15.5 10h2M4.7 4.7l1.4 1.4M13.9 13.9l1.4 1.4M4.7 15.3l1.4-1.4M13.9 6.1l1.4-1.4" />
    </>
  ),
  check: (
    <>
      <rect x="3" y="3.2" width="14" height="14" rx="2.2" />
      <path d="M6.8 10.2l2.3 2.3 4.1-4.3" />
    </>
  ),
  heart: <path d="M10 16.8S3.2 12.9 3.2 8.2a3.4 3.4 0 0 1 6.8-1 3.4 3.4 0 0 1 6.8 1c0 4.7-6.8 8.6-6.8 8.6z" />,
  more: (
    <>
      <circle cx="4.5" cy="10" r="1.2" />
      <circle cx="10" cy="10" r="1.2" />
      <circle cx="15.5" cy="10" r="1.2" />
    </>
  ),
  plus: <path d="M10 4v12M4 10h12" />,
  pin: <path d="M7.5 3h5l-.8 5 3 2.5H5.3l3-2.5zM10 10.5V17" />,
  paperclip: <path d="M15.5 9.5l-5.8 5.8a3.5 3.5 0 0 1-5-5L10.5 4.5a2.3 2.3 0 0 1 3.3 3.3l-5.7 5.7a1.2 1.2 0 0 1-1.7-1.7l5.2-5.2" />,
  send: <path d="M3 10l14-6.5-5 14-2.5-5.8z" />,
  lock: (
    <>
      <rect x="4" y="9" width="12" height="8.5" rx="1.8" />
      <path d="M6.8 9V6.5a3.2 3.2 0 0 1 6.4 0V9" />
    </>
  ),
} satisfies Record<string, ReactNode>;

export type IconName = keyof typeof paths;

export function Icon({ name, className = "h-5 w-5" }: { name: IconName; className?: string }) {
  return (
    <svg
      viewBox="0 0 20 20"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name]}
    </svg>
  );
}
