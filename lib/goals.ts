import { STROKES, Stroke, SwimmerResult, findBestResult } from "@/lib/swim";

/*
 * Ziele je Athlet. Ein Zeitziel wird automatisch mit der Bestzeit
 * verglichen (gleiche Strecke, Lage, Bahn; Regel wie findBestResult) -
 * der Trainer muss "erreicht" nicht selbst pflegen.
 */

export type GoalKind = "zeit" | "technik" | "training";

export type Goal = {
  id: string;
  swimmer_id: string;
  kind: GoalKind;
  title: string | null;
  distance: number | null;
  stroke: Stroke | null;
  pool_length: 25 | 50 | null;
  target_ms: number | null;
  due_date: string | null;
  achieved_at: string | null;
  visible_to_athlete: boolean;
  created_at: string;
};

export const GOAL_KIND_LABELS: Record<GoalKind, string> = {
  zeit: "Zeitziel",
  technik: "Technikziel",
  training: "Trainingsziel",
};

export function goalLabel(goal: Goal) {
  if (goal.kind === "zeit" && goal.distance && goal.stroke) {
    const stroke = STROKES.find((item) => item.value === goal.stroke)?.label ?? goal.stroke;
    return `${goal.distance} m ${stroke}${goal.pool_length ? ` (${goal.pool_length}-m-Bahn)` : ""}`;
  }
  return goal.title ?? GOAL_KIND_LABELS[goal.kind];
}

export type GoalProgress = {
  best: SwimmerResult | null;
  /* Rest bis zum Ziel in ms (positiv = noch zu langsam) */
  remainingMs: number | null;
  reached: boolean;
};

export function goalProgress(goal: Goal, results: SwimmerResult[]): GoalProgress {
  if (goal.kind !== "zeit" || !goal.target_ms) return { best: null, remainingMs: null, reached: Boolean(goal.achieved_at) };
  /* dieselbe Bestzeit-Regel wie ueberall in der App (findBestResult) */
  const best = findBestResult(results, { distance: goal.distance!, stroke: goal.stroke! }, goal.pool_length);
  if (!best) return { best: null, remainingMs: null, reached: Boolean(goal.achieved_at) };
  const remainingMs = best.time_ms - goal.target_ms;
  return { best, remainingMs, reached: remainingMs <= 0 || Boolean(goal.achieved_at) };
}

/* Offene Ziele zuerst, darin die knappsten zuerst */
export function sortGoals(goals: Goal[], results: SwimmerResult[]) {
  return [...goals].sort((a, b) => {
    const pa = goalProgress(a, results);
    const pb = goalProgress(b, results);
    if (pa.reached !== pb.reached) return pa.reached ? 1 : -1;
    return (pa.remainingMs ?? Infinity) - (pb.remainingMs ?? Infinity);
  });
}
