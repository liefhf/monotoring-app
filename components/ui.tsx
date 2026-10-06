"use client";

/*
 * Gemeinsame Bausteine fuer Seiten im neuen Design.
 * Neue Seiten bitte hieraus zusammensetzen, damit
 * alles gleich aussieht.
 */
import { ReactNode, useEffect } from "react";
import { Icon, IconName } from "@/components/icons";

export const inputClass =
  "w-full rounded-xl border border-app-border bg-app-bg px-3.5 py-2.5 text-sm text-app-heading outline-none transition placeholder:text-app-faint focus:border-app-accent";

export const buttonPrimary =
  "inline-flex items-center justify-center gap-2 rounded-full bg-app-accent px-5 py-2.5 text-sm font-semibold text-app-accent-ink shadow-app transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50";

export const buttonSecondary =
  "inline-flex items-center justify-center gap-2 rounded-full border border-app-border bg-app-surface px-5 py-2.5 text-sm font-medium text-app-heading transition hover:bg-app-elevated disabled:cursor-not-allowed disabled:opacity-50";

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
          <span className="hidden h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-app-accent/12 text-app-accent sm:flex">
            <Icon name={icon} className="h-6 w-6" />
          </span>
        )}
        <div className="min-w-0">
          {eyebrow && <p className="text-sm font-medium text-app-muted">{eyebrow}</p>}
          <h1 className="text-2xl font-bold sm:text-3xl">{title}</h1>
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
    <section className={`overflow-hidden rounded-3xl border border-app-border bg-app-surface shadow-app ${className}`}>
      {(title || action) && (
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 pb-2 pt-5">
          <div className="min-w-0">
            {title && <h2 className="text-base font-semibold text-app-heading">{title}</h2>}
            {description && <p className="mt-0.5 text-sm text-app-muted">{description}</p>}
          </div>
          {action}
        </div>
      )}
      <div className={padded ? "p-5" : ""}>{children}</div>
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
  tone?: "info" | "good" | "bad" | "warn";
  children: ReactNode;
}) {
  const tones = {
    info: "border-app-accent/30 bg-app-accent/8 text-app-text",
    good: "border-app-good/40 bg-app-good/10 text-app-good",
    bad: "border-app-bad/40 bg-app-bad/10 text-app-bad",
    warn: "border-app-warn/40 bg-app-warn/10 text-app-warn",
  };

  return <div className={`rounded-xl border px-4 py-3 text-sm ${tones[tone]}`}>{children}</div>;
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
