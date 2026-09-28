"use client";

/*
 * Gemeinsame Bausteine im Stil der Design-Uebergabe
 * (Claude Design): Karten mit Rahmen statt Schatten,
 * Buttons 36 px, Inputs 8 px Radius, Titel 30/600 mit
 * Mono-Kicker, Eingaben in einem Panel von rechts.
 * Neue Seiten bitte hieraus zusammensetzen.
 */
import { ReactNode, useEffect } from "react";
import type { IconName } from "@/components/icons";

export const inputClass =
  "w-full min-w-0 rounded-lg border border-app-input-border bg-app-input px-3 py-2 text-sm text-app-heading outline-none transition placeholder:text-app-faint focus:border-app-accent";

export const buttonPrimary =
  "inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-app-accent px-3.5 text-[13px] font-semibold text-app-accent-ink transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50";

export const buttonSecondary =
  "inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-app-button-border bg-app-surface px-3.5 text-[13px] font-semibold text-app-heading transition hover:bg-app-elevated disabled:cursor-not-allowed disabled:opacity-50";

export const buttonGhost =
  "inline-flex items-center justify-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[13px] text-app-muted transition hover:bg-app-elevated hover:text-app-heading";

/* Invertierter Button (dunkel im hellen Design), z. B. "+ Erfassen" */
export const buttonInverted =
  "inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-app-inv px-3.5 text-[13px] font-semibold text-app-on-inv transition hover:opacity-90";

/* Chips: Mono 11, Radius 5 */
export function Chip({
  tone = "neutral",
  children,
}: {
  tone?: "neutral" | "accent" | "good" | "warn" | "bad";
  children: ReactNode;
}) {
  const tones = {
    neutral: "bg-app-elevated text-app-muted",
    accent: "bg-app-accent-tint text-app-accent-fg",
    good: "bg-app-good-tint text-app-good",
    warn: "bg-app-warn-tint text-app-warn",
    bad: "bg-app-bad-tint text-app-bad",
  };

  return <span className={`num inline-flex items-center rounded-[5px] px-[7px] py-[3px] text-[11px] font-semibold ${tones[tone]}`}>{children}</span>;
}

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string;
  title: string;
  description?: ReactNode;
  /* aus Kompatibilitaet noch erlaubt - das Design zeigt keine Symbole im Titel */
  icon?: IconName;
  actions?: ReactNode;
}) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        {eyebrow && <p className="kicker mb-1.5">{eyebrow}</p>}
        <h1 className="text-[26px] sm:text-[30px]">{title}</h1>
        {description && <p className="mt-2 max-w-2xl text-[13px] leading-relaxed text-app-muted">{description}</p>}
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
    <section className={`overflow-hidden rounded-2xl border border-app-border bg-app-surface ${className}`}>
      {(title || action) && (
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 pb-3 pt-[18px]">
          <div className="min-w-0">
            {title && <h3 className="text-[15px]">{title}</h3>}
            {description && <p className="mt-0.5 text-xs text-app-faint">{description}</p>}
          </div>
          {action}
        </div>
      )}
      <div className={padded ? "px-5 pb-5 pt-1" : ""}>{children}</div>
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
    <label className={`block min-w-0 ${className}`}>
      <span className="mb-1.5 block text-xs font-semibold text-app-muted">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-app-faint">{hint}</span>}
    </label>
  );
}

export function EmptyState({
  title,
  children,
}: {
  /* aus Kompatibilitaet noch erlaubt */
  icon?: IconName;
  title: string;
  children?: ReactNode;
}) {
  return (
    <div className="px-6 py-12 text-center">
      <p className="text-[15px] font-semibold text-app-heading">{title}</p>
      {children && <div className="mx-auto mt-1 max-w-sm text-[13px] text-app-muted">{children}</div>}
    </div>
  );
}

export function Notice({
  tone = "info",
  children,
}: {
  tone?: "info" | "good" | "bad" | "warn";
  children: ReactNode;
}) {
  const tones = {
    info: "border-app-border bg-app-surface text-app-text",
    good: "border-app-good/30 bg-app-good-tint text-app-good",
    bad: "border-app-bad/30 bg-app-bad-tint text-app-bad",
    warn: "border-app-warn/30 bg-app-warn-tint text-app-warn",
  };

  return <div className={`rounded-xl border px-4 py-3 text-[13px] ${tones[tone]}`}>{children}</div>;
}

/*
 * Eingaben als Panel von rechts (480 px, volle Hoehe), auf dem
 * Handy als Vollbild. Klick daneben oder Esc schliesst.
 */
export function Modal({
  open,
  title,
  onClose,
  children,
  wide = false,
  kicker,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  wide?: boolean;
  kicker?: string;
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
    <div className="fixed inset-0 z-[60] flex justify-end">
      <button
        type="button"
        aria-label="Schließen"
        onClick={onClose}
        className="absolute inset-0 h-full w-full bg-[oklch(0.2_0.02_250_/_0.35)] [animation:fade-in_150ms_ease-out]"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`relative flex h-full w-full flex-col border-l border-app-border bg-app-surface shadow-panel [animation:panel-in_180ms_ease-out] ${
          wide ? "sm:max-w-[640px]" : "sm:max-w-[480px]"
        }`}
      >
        <div className="flex items-start justify-between gap-3 border-b border-app-border px-6 py-5">
          <div className="min-w-0">
            {kicker && <p className="kicker mb-1">{kicker}</p>}
            <h2 className="text-xl">{title}</h2>
          </div>
          <button type="button" onClick={onClose} aria-label="Schließen" className={`${buttonGhost} -mr-2`}>
            <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <path d="M5 5l10 10M15 5L5 15" />
            </svg>
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>
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
