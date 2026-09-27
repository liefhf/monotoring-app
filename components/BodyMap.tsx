"use client";

import { useState } from "react";
import { BODY_SPOTS, BodySpot, BodyView, SILHOUETTE_HALF, SpotShape, painColor } from "@/lib/pain";

/*
 * Anklickbares Koerpermodell (vorne und hinten).
 * Muskeln sind Flaechen, Gelenke Punkte. Mit levels wird jede
 * Stelle nach Schmerzstaerke eingefaerbt; ohne onSelect ist das
 * Bild nur zum Ansehen (z. B. beim Coach).
 */

function Shape({ shape, ...props }: { shape: SpotShape } & React.SVGProps<SVGElement>) {
  const common = props as React.SVGProps<SVGPathElement & SVGEllipseElement & SVGCircleElement>;

  if (shape.kind === "path") return <path d={shape.d} {...common} />;
  if (shape.kind === "ellipse") return <ellipse cx={shape.cx} cy={shape.cy} rx={shape.rx} ry={shape.ry} {...common} />;

  return <circle cx={shape.cx} cy={shape.cy} r={shape.r} {...common} />;
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
  const spots = BODY_SPOTS.filter((spot) => spot.view === view);
  const muscles = spots.filter((spot) => spot.type === "muscle");
  const joints = spots.filter((spot) => spot.type === "joint");
  const interactive = Boolean(onSelect);

  function renderSpot(spot: BodySpot) {
    const level = levels[spot.id];
    const selected = spot.id === selectedId;
    const isJoint = spot.type === "joint";

    /* Muskeln in einem weichen Hautton, Gelenke als dezente Ringe */
    const fill = level ? painColor(level) : isJoint ? "var(--app-surface)" : "url(#muscle-shade)";

    return (
      <g key={spot.id} transform={spot.mirrored ? "matrix(-1 0 0 1 200 0)" : undefined}>
        <Shape
          shape={spot.shape}
          fill={fill}
          fillOpacity={level ? 0.9 : isJoint ? 0.85 : 1}
          stroke={selected ? "var(--app-accent)" : isJoint ? "var(--app-faint)" : "var(--app-bg)"}
          strokeWidth={selected ? 2 : isJoint ? 1 : 1.3}
          strokeDasharray={isJoint && !level && !selected ? "2 1.5" : undefined}
          className={
            interactive
              ? "cursor-pointer outline-none transition-[fill-opacity,stroke] hover:fill-opacity-60 hover:[stroke:var(--app-accent)] focus-visible:[stroke:var(--app-accent)] focus-visible:[stroke-width:2]"
              : undefined
          }
          role={interactive ? "button" : undefined}
          tabIndex={interactive ? 0 : undefined}
          aria-label={interactive ? `${spot.label}${level ? ` – Stärke ${level}` : ""}` : undefined}
          onClick={interactive ? () => onSelect!(spot) : undefined}
          onKeyDown={
            interactive
              ? (event: React.KeyboardEvent) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    onSelect!(spot);
                  }
                }
              : undefined
          }
        >
          <title>{spot.label}</title>
        </Shape>
      </g>
    );
  }

  return (
    <figure className="flex flex-col items-center">
      <svg viewBox="0 0 200 400" className="h-auto w-full max-w-[300px] sm:max-w-[260px]" role="group" aria-label={view === "front" ? "Körper von vorne" : "Körper von hinten"}>
        <defs>
          <linearGradient id="muscle-shade" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="color-mix(in srgb, var(--app-accent) 10%, var(--app-elevated))" />
            <stop offset="100%" stopColor="color-mix(in srgb, var(--app-accent) 22%, var(--app-elevated))" />
          </linearGradient>
        </defs>

        {/* Silhouette (beide Haelften), darauf Muskeln, darueber Gelenke */}
        <g fill="var(--app-surface)" stroke="var(--app-border)" strokeWidth="1.2" strokeLinejoin="round">
          <path d={SILHOUETTE_HALF} />
          <path d={SILHOUETTE_HALF} transform="matrix(-1 0 0 1 200 0)" />
        </g>
        {muscles.map(renderSpot)}
        {joints.map(renderSpot)}
      </svg>
      <figcaption className="mt-1 text-xs font-semibold uppercase tracking-wider text-app-faint">
        {view === "front" ? "Vorne" : "Hinten"}
        <span className="ml-1 font-normal normal-case tracking-normal">
          {view === "front" ? "(deine rechte Seite links im Bild)" : "(deine linke Seite links im Bild)"}
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
  const countFor = (view: BodyView) =>
    BODY_SPOTS.filter((spot) => spot.view === view && levels[spot.id]).length;

  return (
    <div>
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

      <div className={`grid gap-4 ${both ? "sm:grid-cols-2" : ""}`}>
        {views.map((view) => (
          <div key={view} className={both && view !== mobileView ? "hidden sm:block" : "block"}>
            <Figure view={view} levels={levels} selectedId={selectedId} onSelect={onSelect} />
          </div>
        ))}
      </div>
    </div>
  );
}
