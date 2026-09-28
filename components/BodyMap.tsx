"use client";

import { useState } from "react";
import { BODY_SPOTS, BodySpot, BodyView, painColor } from "@/lib/pain";

/*
 * Anatomisches Koerpermodell (vorne und hinten) im Stil eines
 * Anatomie-Atlas: Muskelgruppen mit feinen Trennlinien, Gelenke
 * als kleine Punkte. Beim Zeigen/Antippen erscheint ein
 * Namensschild. Mit levels werden Stellen nach Schmerzstaerke
 * eingefaerbt (mit leichtem Leuchten). Ohne onSelect ist das Bild
 * nur zum Ansehen (z. B. beim Coach).
 */

const VIEWBOX = "-6 -6 112 234";

function Label({ spot, level }: { spot: BodySpot; level?: number }) {
  const text = level ? `${spot.label} · ${level}` : spot.label;
  const width = Math.min(96, text.length * 2.05 + 7);
  const x = Math.min(100 - width / 2 + 4, Math.max(width / 2 - 4, spot.anchor.x));
  const above = spot.anchor.y > 16;
  const y = above ? spot.anchor.y - (spot.type === "joint" ? 6 : 9) : spot.anchor.y + 9;

  return (
    <g pointerEvents="none">
      <rect x={x - width / 2} y={y - 4.4} width={width} height={8.4} rx={4.2} fill="var(--app-heading)" opacity={0.92} />
      <text x={x} y={y + 1.35} textAnchor="middle" fontSize={4} fontWeight={600} fill="var(--app-surface)">
        {text}
      </text>
    </g>
  );
}

function Figure({
  view,
  levels,
  selectedId,
  onSelect,
}: {
  view: BodyView;
  levels: Record<string, number>;
  selectedId?: string | null;
  onSelect?: (spot: BodySpot) => void;
}) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const spots = BODY_SPOTS.filter((spot) => spot.view === view);
  const muscles = spots.filter((spot) => spot.shape.kind === "polygons");
  const joints = spots.filter((spot) => spot.shape.kind === "circle");
  const interactive = Boolean(onSelect);
  const labelled = spots.find((spot) => spot.id === (hoveredId ?? selectedId));
  const gradientId = `muscle-${view}`;

  function handlers(spot: BodySpot) {
    if (!interactive) return {};

    return {
      role: "button",
      tabIndex: 0,
      "aria-label": `${spot.label}${levels[spot.id] ? ` – Stärke ${levels[spot.id]}` : ""}`,
      onClick: () => onSelect!(spot),
      onMouseEnter: () => setHoveredId(spot.id),
      onMouseLeave: () => setHoveredId((current) => (current === spot.id ? null : current)),
      onFocus: () => setHoveredId(spot.id),
      onBlur: () => setHoveredId(null),
      onKeyDown: (event: React.KeyboardEvent) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onSelect!(spot);
        }
      },
      className: "cursor-pointer outline-none",
    };
  }

  const jointStroke = "color-mix(in srgb, var(--app-heading) 45%, var(--app-surface))";

  return (
    <figure className="flex flex-col items-center">
      <svg
        viewBox={VIEWBOX}
        className="h-auto w-full max-w-[280px] select-none sm:max-w-[250px]"
        role="group"
        aria-label={view === "front" ? "Körper von vorne" : "Körper von hinten"}
      >
        <defs>
          {/* Muskelton: dezentes Blaugrau mit Licht von oben links */}
          <linearGradient id={gradientId} x1="0" y1="0" x2="0.6" y2="1">
            <stop offset="0%" stopColor="color-mix(in srgb, var(--app-accent) 12%, color-mix(in srgb, var(--app-heading) 9%, var(--app-surface)))" />
            <stop offset="100%" stopColor="color-mix(in srgb, var(--app-accent) 20%, color-mix(in srgb, var(--app-heading) 20%, var(--app-surface)))" />
          </linearGradient>
          <filter id={`glow-${view}`} x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="1.6" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id={`shadow-${view}`} x="-20%" y="-10%" width="140%" height="120%">
            <feDropShadow dx="0" dy="1.2" stdDeviation="1.4" floodColor="var(--app-heading)" floodOpacity="0.12" />
          </filter>
        </defs>

        {/* Muskeln */}
        <g filter={`url(#shadow-${view})`}>
          {muscles.map((spot) => {
            if (spot.shape.kind !== "polygons") return null;

            const level = levels[spot.id];
            const active = spot.id === hoveredId || spot.id === selectedId;
            const fill = level
              ? painColor(level)
              : active
                ? "color-mix(in srgb, var(--app-accent) 45%, var(--app-surface))"
                : `url(#${gradientId})`;

            return (
              <g key={spot.id} {...handlers(spot)} filter={level ? `url(#glow-${view})` : undefined}>
                <title>{spot.label}</title>
                {spot.shape.points.map((points, index) => (
                  <polygon
                    key={index}
                    points={points}
                    fill={fill}
                    stroke="var(--app-surface)"
                    strokeWidth={0.7}
                    strokeLinejoin="round"
                    style={{ transition: "fill 150ms ease" }}
                  />
                ))}
              </g>
            );
          })}
        </g>

        {/* Gelenke: kleine Punkte mit Ring */}
        {joints.map((spot) => {
          if (spot.shape.kind !== "circle") return null;

          const level = levels[spot.id];
          const active = spot.id === hoveredId || spot.id === selectedId;
          const { cx, cy, r } = spot.shape;

          return (
            <g key={spot.id} {...handlers(spot)} filter={level ? `url(#glow-${view})` : undefined}>
              <title>{spot.label}</title>
              {/* groessere, unsichtbare Trefferflaeche fuer den Finger */}
              <circle cx={cx} cy={cy} r={r * 2} fill="transparent" />
              <circle
                cx={cx}
                cy={cy}
                r={active ? r * 1.25 : r}
                fill={level ? painColor(level) : "var(--app-surface)"}
                stroke={active ? "var(--app-accent)" : jointStroke}
                strokeWidth={active ? 0.9 : 0.6}
              />
              {!level && (
                <circle cx={cx} cy={cy} r={r * 0.36} fill={active ? "var(--app-accent)" : jointStroke} pointerEvents="none" />
              )}
            </g>
          );
        })}

        {labelled && <Label spot={labelled} level={levels[labelled.id]} />}
      </svg>

      <figcaption className="mt-2 flex flex-col items-center gap-0.5">
        <span className="rounded-full bg-app-elevated px-3 py-0.5 text-xs font-semibold uppercase tracking-wider text-app-muted">
          {view === "front" ? "Vorne" : "Hinten"}
        </span>
        <span className="text-[11px] text-app-faint">
          {view === "front" ? "deine rechte Seite links im Bild" : "deine linke Seite links im Bild"}
        </span>
      </figcaption>
    </figure>
  );
}

export default function BodyMap({
  levels = {},
  selectedId,
  onSelect,
  views = ["front", "back"],
}: {
  levels?: Record<string, number>;
  selectedId?: string | null;
  onSelect?: (spot: BodySpot) => void;
  views?: BodyView[];
}) {
  const [mobileView, setMobileView] = useState<BodyView>(views[0]);
  const both = views.length === 2;

  /* Zaehler je Ansicht fuer den Umschalter (wie viele Stellen markiert) */
  const countFor = (view: BodyView) => BODY_SPOTS.filter((spot) => spot.view === view && levels[spot.id]).length;

  return (
    <div className="rounded-2xl bg-[radial-gradient(ellipse_at_center,color-mix(in_srgb,var(--app-accent)_7%,transparent),transparent_70%)] py-2">
      {/* Handy: eine grosse Figur mit Umschalter, damit man Gelenke gut trifft */}
      {both && (
        <div className="mb-3 flex justify-center sm:hidden">
          <div className="inline-flex rounded-xl border border-app-border bg-app-bg p-1">
            {views.map((view) => (
              <button
                key={view}
                type="button"
                onClick={() => setMobileView(view)}
                aria-pressed={mobileView === view}
                className={`rounded-lg px-4 py-1.5 text-sm transition ${
                  mobileView === view ? "bg-app-accent font-semibold text-app-accent-ink" : "text-app-text"
                }`}
              >
                {view === "front" ? "Vorne" : "Hinten"}
                {countFor(view) > 0 && <span className="ml-1.5 opacity-80">({countFor(view)})</span>}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className={`grid gap-6 ${both ? "sm:grid-cols-2" : ""}`}>
        {views.map((view) => (
          <div key={view} className={both && view !== mobileView ? "hidden sm:block" : "block"}>
            <Figure view={view} levels={levels} selectedId={selectedId} onSelect={onSelect} />
          </div>
        ))}
      </div>
    </div>
  );
}
