"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import {
  EFFECT_CARDS,
  coreGoalToEffectCard,
  startOfWeek,
  toDateString,
  zoneToEffectCard,
  type EffectCardKey,
} from "@/lib/kapitel1";

/*
 * Kapitel 1.3 - "Was dein Training bewirkt"
 *
 * Kurze Infokarten fuer Athleten. Karten, die zu den
 * Einheiten der laufenden Woche passen, stehen vorne und
 * sind markiert. Der Athlet sieht nur Einheiten seiner
 * eigenen Teams (RLS).
 */

export default function TrainingEffectCards() {
  const [active, setActive] = useState<Set<EffectCardKey>>(
    new Set()
  );

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      const { data: memberships } = await supabase
        .from("team_members")
        .select("team_id")
        .eq("athlete_id", user.id);

      const teamIds = (memberships ?? []).map(
        (m: { team_id: string }) => m.team_id
      );

      if (teamIds.length === 0) return;

      const monday = startOfWeek(new Date());
      const sunday = new Date(monday);
      sunday.setDate(sunday.getDate() + 6);

      const { data: sessionData } = await supabase
        .from("training_sessions")
        .select("id, training_type, core_goals")
        .in("team_id", teamIds)
        .gte("session_date", toDateString(monday))
        .lte("session_date", toDateString(sunday));

      const sessions = (sessionData ?? []) as {
        id: string;
        training_type: "water" | "land";
        core_goals: string[] | null;
      }[];

      const found = new Set<EffectCardKey>();

      sessions.forEach((s) => {
        if (s.training_type === "land") {
          found.add("land");
        }

        (s.core_goals ?? []).forEach((goal) => {
          const card = coreGoalToEffectCard(goal);
          if (card) found.add(card);
        });
      });

      const waterIds = sessions
        .filter((s) => s.training_type === "water")
        .map((s) => s.id);

      if (waterIds.length > 0) {
        const { data: sectionData } = await supabase
          .from("training_sections")
          .select("id, practice_mode")
          .in("training_session_id", waterIds);

        const sections = (sectionData ?? []) as {
          id: string;
          practice_mode: string | null;
        }[];

        if (
          sections.some((s) => s.practice_mode === "ueben")
        ) {
          found.add("technik");
        }

        if (sections.length > 0) {
          const { data: rowData } = await supabase
            .from("training_rows")
            .select("zone")
            .in(
              "section_id",
              sections.map((s) => s.id)
            );

          (rowData ?? []).forEach(
            (row: { zone: string | null }) => {
              const card = zoneToEffectCard(row.zone);
              if (card) found.add(card);
            }
          );
        }
      }

      if (!cancelled) {
        setActive(found);
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, []);

  const cards = [...EFFECT_CARDS].sort(
    (a, b) =>
      Number(active.has(b.key)) - Number(active.has(a.key))
  );

  return (
    <section className="mt-4 overflow-hidden rounded-xl border border-app-border bg-app-surface">
      <details className="group">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3">
          <div>
            <h2 className="text-sm font-semibold text-white">
              Was dein Training bewirkt
            </h2>
            <p className="text-xs text-app-faint">
              {active.size > 0
                ? `${active.size} Themen passen zu deiner Woche`
                : "Kurz erklärt – warum wir so trainieren"}
            </p>
          </div>
          <span className="text-xs text-app-faint transition group-open:rotate-180">
            ↓
          </span>
        </summary>

        <div className="flex snap-x gap-2.5 overflow-x-auto px-4 pb-4">
          {cards.map((card) => {
            const isActive = active.has(card.key);

            return (
              <article
                key={card.key}
                className={`w-60 shrink-0 snap-start rounded-lg border p-3 ${
                  isActive
                    ? "border-sky-700 bg-sky-950/40"
                    : "border-app-border bg-app-bg"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[11px] text-app-faint">
                    {card.tag}
                  </p>
                  {isActive && (
                    <span className="rounded-full bg-sky-900/70 px-2 py-0.5 text-[10px] text-sky-300">
                      diese Woche
                    </span>
                  )}
                </div>
                <h3 className="mt-1 text-sm font-semibold text-white">
                  {card.title}
                </h3>
                <p className="mt-1 text-xs leading-5 text-app-muted">
                  {card.text}
                </p>
              </article>
            );
          })}
        </div>
      </details>
    </section>
  );
}
