/*
 * Wort-Bild-Marke der App: Wellen im abgerundeten Quadrat.
 * Farben kommen aus dem Designsystem, passt also in hell und dunkel.
 */
export function LogoMark({ className = "h-9 w-9" }: { className?: string }) {
  return (
    <span
      className={`flex shrink-0 items-center justify-center rounded-xl bg-app-accent text-app-accent-ink ${className}`}
      aria-hidden="true"
    >
      <svg viewBox="0 0 24 24" className="h-[60%] w-[60%]" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <path d="M2.5 9.5c1.6 0 1.6-1.5 3.2-1.5s1.6 1.5 3.2 1.5 1.6-1.5 3.1-1.5 1.6 1.5 3.2 1.5 1.6-1.5 3.2-1.5 1.6 1.5 3.1 1.5" />
        <path d="M2.5 15c1.6 0 1.6-1.5 3.2-1.5S7.3 15 8.9 15s1.6-1.5 3.1-1.5 1.6 1.5 3.2 1.5 1.6-1.5 3.2-1.5S20 15 21.5 15" opacity="0.65" />
      </svg>
    </span>
  );
}

export default function Logo({ subtitle }: { subtitle?: string }) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <LogoMark />
      <div className="min-w-0">
        <p className="truncate text-base font-bold leading-tight text-app-heading">Monitoring App</p>
        {subtitle && <p className="truncate text-xs text-app-faint">{subtitle}</p>}
      </div>
    </div>
  );
}
