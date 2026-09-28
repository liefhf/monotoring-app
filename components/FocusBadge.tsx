"use client";

import { createContext, useContext } from "react";
import { SwimEvent } from "@/lib/swim";
import { AthleteFocus, FocusRole, focusRole } from "@/lib/trainingFocus";

/*
 * Kleiner Hinweis "Haupt" / "Neben" neben einer Strecke, ueberall auf der
 * Athletenseite. Der Fokus kommt ueber den FocusContext.
 */
export const FocusContext = createContext<AthleteFocus | null>(null);

export const ROLE_STYLE: Record<FocusRole, { label: string; className: string }> = {
  haupt: { label: "Haupt", className: "bg-app-accent text-app-accent-ink" },
  neben: { label: "Neben", className: "border border-app-accent/60 text-app-accent" },
};

export function RoleBadge({ role }: { role: FocusRole | null | undefined }) {
  if (!role) return null;
  return (
    <span
      className={`ml-1.5 inline-block rounded-full px-1.5 py-px align-middle text-[10px] font-semibold leading-4 ${ROLE_STYLE[role].className}`}
      title={role === "haupt" ? "Hauptstrecke im Fokus" : "Nebenstrecke im Fokus"}
    >
      {ROLE_STYLE[role].label}
    </span>
  );
}

export default function FocusBadge({ event }: { event: SwimEvent }) {
  const focus = useContext(FocusContext);
  return <RoleBadge role={focusRole(event, focus)} />;
}
