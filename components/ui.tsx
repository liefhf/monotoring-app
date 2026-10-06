"use client";

/*
 * Gemeinsame Bausteine fuer Seiten im neuen Design.
 * Neue Seiten bitte hieraus zusammensetzen, damit
 * alles gleich aussieht.
 */
import Link from "next/link";
import { ReactNode, useEffect } from "react";
import { Icon, IconName } from "@/components/icons";

export const inputClass =
  "w-full rounded-xl border border-app-border bg-app-bg px-3.5 py-2.5 text-sm text-app-heading outline-none transition placeholder:text-app-faint focus:border-app-accent";

/* Knoepfe nach Design 9f: 44 px hoch, Radius 12, Icon + ein kurzes Wort. */
export const buttonPrimary =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-app-accent px-[18px] py-2.5 text-sm font-bold text-app-accent-ink transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50";

export const buttonSecondary =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-app-elevated px-[18px] py-2.5 text-sm font-bold text-app-heading transition hover:bg-app-border/70 disabled:cursor-not-allowed disabled:opacity-50";

export const buttonDanger =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-app-bad/15 px-[18px] py-2.5 text-sm font-bold text-app-bad transition hover:bg-app-bad/25 disabled:cursor-not-allowed disabled:opacity-50";

export const buttonGhost =
  "inline-flex items-center justify-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm text-app-muted transition hover:bg-app-elevated hover:text-app-heading";

export function PageHeader({
  eyebrow,
  title,
  description,
  icon,
  actions,
}: {
  eyebrow?: string;
  title: string;
  description?: ReactNode;
  icon?: IconName;
  actions?: ReactNode;
}) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-4">
      <div className="flex min-w-0 items-start gap-4">
        {icon && (
          <span className="hidden h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-app-accent/15 text-app-accent-soft sm:flex">
            <Icon name={icon} className="h-6 w-6" />
          </span>
        )}
        <div className="min-w-0">
          {eyebrow && <p className="text-sm font-medium text-app-muted">{eyebrow}</p>}
          <h1 className="text-2xl font-extrabold tracking-tight sm:text-[28px]">{title}</h1>
          {description && <p className="mt-1.5 max-w-2xl text-sm text-app-muted">{description}</p>}
        </div>
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}

export function Card({
  title,
  description,
  action,
  children,
  className = "",
  padded = false,
}: {
  title?: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  padded?: boolean;
}) {
  return (
    <section className={`overflow-hidden rounded-[20px] border border-app-border/60 bg-app-surface shadow-app ${className}`}>
      {(title || action) && (
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 pb-2 pt-4 sm:px-[22px] sm:pt-5">
          <div className="min-w-0">
            {title && <h2 className="text-[15px] font-bold text-app-heading">{title}</h2>}
            {description && <p className="mt-0.5 text-sm text-app-muted">{description}</p>}
          </div>
          {action}
        </div>
      )}
      <div className={padded ? "p-4 sm:p-[22px]" : ""}>{children}</div>
    </section>
  );
}

export function FormField({
  label,
  hint,
  children,
  className = "",
}: {
  label: string;
  hint?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1.5 block text-sm font-medium text-app-text">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-app-faint">{hint}</span>}
    </label>
  );
}

export function EmptyState({
  icon,
  title,
  children,
}: {
  icon: IconName;
  title: string;
  children?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center px-6 py-12 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-app-elevated text-app-muted">
        <Icon name={icon} className="h-7 w-7" />
      </span>
      <p className="mt-4 font-semibold text-app-heading">{title}</p>
      {children && <div className="mt-1 max-w-sm text-sm text-app-muted">{children}</div>}
    </div>
  );
}

export function Notice({
  tone = "info",
  children,
}: {
  tone?: "info" | "good" | "bad" | "warn" | "soon";
  children: ReactNode;
}) {
  const tones = {
    info: "border-app-accent/30 bg-app-accent/10 text-app-text",
    soon: "border-app-soon/40 bg-app-soon/10 text-app-text",
    good: "border-app-good/40 bg-app-good/10 text-app-good",
    bad: "border-app-bad/40 bg-app-bad/10 text-app-bad",
    warn: "border-app-warn/40 bg-app-warn/10 text-app-warn",
  };

  return <div className={`rounded-[14px] border px-4 py-3 text-sm ${tones[tone]}`}>{children}</div>;
}

export function Modal({
  open,
  title,
  onClose,
  children,
  wide = false,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  wide?: boolean;
}) {
  useEffect(() => {
    if (!open) {
      return;
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    window.addEventListener("keydown", onKeyDown);

    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center sm:p-6">
      <button
        type="button"
        aria-label="Schließen"
        onClick={onClose}
        className="absolute inset-0 h-full w-full bg-app-bg/70 backdrop-blur-sm"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`relative flex max-h-[92vh] w-full flex-col rounded-t-3xl border border-app-border bg-app-surface shadow-app sm:rounded-3xl ${
          wide ? "sm:max-w-3xl" : "sm:max-w-xl"
        }`}
      >
        <div className="flex items-center justify-between gap-3 border-b border-app-border px-5 py-4">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button type="button" onClick={onClose} aria-label="Schließen" className={buttonGhost}>
            <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <path d="M5 5l10 10M15 5L5 15" />
            </svg>
          </button>
        </div>
        <div className="overflow-y-auto p-5">{children}</div>
      </div>
    </div>
  );
}

/* Text mit klickbaren Links und erhaltenen Zeilenumbruechen */
export function RichText({ text, className = "" }: { text: string; className?: string }) {
  const parts = text.split(/(https?:\/\/[^\s]+)/g);

  return (
    <p className={`whitespace-pre-wrap break-words ${className}`}>
      {parts.map((part, index) =>
        index % 2 === 1 ? (
          <a key={index} href={part} target="_blank" rel="noopener noreferrer" className="text-app-accent underline underline-offset-2">
            {part}
          </a>
        ) : (
          <span key={index}>{part}</span>
        )
      )}
    </p>
  );
}

/* ---------- Bausteine aus dem Gesamtdesign ---------- */

export type ChipTone = "soon" | "good" | "warn" | "bad" | "neutral" | "primary" | "info";

const chipTones: Record<ChipTone, string> = {
  soon: "bg-app-soon/15 text-app-soon",
  good: "bg-app-good/15 text-app-good",
  warn: "bg-app-warn/15 text-app-warn",
  bad: "bg-app-bad/15 text-app-bad",
  neutral: "bg-app-elevated text-app-muted",
  primary: "bg-app-accent/20 text-app-accent-soft",
  info: "bg-app-info/15 text-app-info",
};

/*
 * Status-Chip (Design 9g). Pink = bald faellig,
 * Ampel (good/warn/bad) nur fuer den Athleten-Status.
 */
export function Chip({ tone = "neutral", children, className = "" }: { tone?: ChipTone; children: ReactNode; className?: string }) {
  return (
    <span className={`inline-flex h-7 shrink-0 items-center gap-1 whitespace-nowrap rounded-full px-2.5 text-xs font-extrabold ${chipTones[tone]} ${className}`}>
      {children}
    </span>
  );
}

/* Kennzahl (Design 9l): Label in Grossbuchstaben, Wert in Rubik. */
export function Stat({ label, value, unit, trend, className = "" }: { label: string; value: ReactNode; unit?: string; trend?: ReactNode; className?: string }) {
  return (
    <div className={`min-w-0 rounded-[14px] bg-app-elevated/60 px-3.5 py-3 ${className}`}>
      <div className="label-caps truncate">{label}</div>
      <div className="mt-1 flex items-baseline gap-1">
        <span className="num text-xl font-semibold text-app-heading">{value}</span>
        {unit && <span className="text-xs text-app-muted">{unit}</span>}
      </div>
      {trend && <div className="mt-0.5 text-xs">{trend}</div>}
    </div>
  );
}

/*
 * Kachel (Design 9d): ganze Flaeche klickbar, Pfeil oben rechts.
 * Titel 15 · Zusatz 13 · Inhalt.
 */
export function Tile({ href, title, meta, children, className = "" }: { href: string; title: ReactNode; meta?: ReactNode; children?: ReactNode; className?: string }) {
  return (
    <Link
      href={href}
      className={`block rounded-[20px] border border-app-border/60 bg-app-surface p-4 shadow-app transition hover:border-app-accent/40 hover:bg-app-elevated/40 sm:p-[22px] ${className}`}
    >
      <div className="mb-3 flex items-center gap-3">
        <h2 className="min-w-0 flex-1 truncate text-[15px] font-bold text-app-heading">{title}</h2>
        {meta && <span className="shrink-0 text-[13px] text-app-muted">{meta}</span>}
        <svg viewBox="0 0 20 20" className="h-4 w-4 shrink-0 text-app-muted" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M6 14L14 6M7 6h7v7" />
        </svg>
      </div>
      {children}
    </Link>
  );
}

/*
 * Listenzeile (Design 9j): ganze Zeile antippbar,
 * mindestens 52 px hoch, Pfeil rechts.
 */
export function ListRow({ href, leading, title, subtitle, trailing, className = "" }: { href?: string; leading?: ReactNode; title: ReactNode; subtitle?: ReactNode; trailing?: ReactNode; className?: string }) {
  const content = (
    <>
      {leading}
      <div className="min-w-0 flex-1">
        <div className="truncate font-semibold text-app-heading">{title}</div>
        {subtitle && <div className="truncate text-[13px] text-app-muted">{subtitle}</div>}
      </div>
      {trailing}
      {href && (
        <svg viewBox="0 0 20 20" className="h-4 w-4 shrink-0 text-app-faint" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M8 5l5 5-5 5" />
        </svg>
      )}
    </>
  );
  const base = `flex min-h-13 items-center gap-3 rounded-[14px] bg-app-surface px-3.5 py-2.5 ${className}`;

  return href ? (
    <Link href={href} className={`${base} transition hover:bg-app-elevated`}>
      {content}
    </Link>
  ) : (
    <div className={base}>{content}</div>
  );
}
