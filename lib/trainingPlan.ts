import { supabase } from "@/lib/supabase";

/*
 * Trainingseinheit komplett laden, drucken (PDF) und loeschen.
 */

type PlanRow = {
  section_id: string;
  repetitions: number;
  distance: number;
  exercise: string | null;
  style: string | null;
  materials: string[] | null;
  zone: string | null;
  interval_type: string | null;
  interval_time: string | null;
  sort_order: number;
};

type PlanLandRow = {
  exercise: string;
  sets: string | null;
  repetitions: string | null;
  weight?: string | null;
  material: string | null;
  intensity: string | null;
};

export type TrainingPlan = {
  title: string;
  session_date: string;
  start_time: string | null;
  training_type: "water" | "land";
  duration_minutes: number | null;
  total_meters: number | null;
  pool_length: number | null;
  focus: string | null;
  teamName: string | null;
  sections: { name: string; rows: PlanRow[] }[];
  landRows: PlanLandRow[];
  warmUpRows: PlanLandRow[];
};

export async function loadTrainingPlan(sessionId: string): Promise<TrainingPlan | string> {
  const { data: session, error } = await supabase
    .from("training_sessions")
    .select("title, session_date, start_time, training_type, duration_minutes, total_meters, pool_length, focus, team_id")
    .eq("id", sessionId)
    .single();
  if (error || !session) return `Training konnte nicht geladen werden: ${error?.message ?? "nicht gefunden"}`;

  const [team, sections, land, warmUp] = await Promise.all([
    supabase.from("teams").select("name").eq("id", session.team_id).maybeSingle(),
    supabase.from("training_sections").select("id, section_name, sort_order").eq("training_session_id", sessionId).order("sort_order"),
    supabase.from("training_land_rows").select("exercise, sets, repetitions, weight, material, intensity, sort_order").eq("training_session_id", sessionId).order("sort_order"),
    supabase.from("training_warmup_land_rows").select("exercise, sets, repetitions, material, intensity, sort_order").eq("training_session_id", sessionId).order("sort_order"),
  ]);

  const sectionList = (sections.data ?? []) as { id: string; section_name: string }[];
  const rows = sectionList.length
    ? (((
        await supabase
          .from("training_rows")
          .select("section_id, repetitions, distance, exercise, style, materials, zone, interval_type, interval_time, sort_order")
          .in("section_id", sectionList.map((section) => section.id))
          .order("sort_order")
      ).data ?? []) as PlanRow[])
    : [];

  return {
    ...(session as Omit<TrainingPlan, "teamName" | "sections" | "landRows" | "warmUpRows">),
    teamName: (team.data as { name: string } | null)?.name ?? null,
    sections: sectionList
      .map((section) => ({ name: section.section_name, rows: rows.filter((row) => row.section_id === section.id) }))
      .filter((section) => section.rows.length > 0),
    landRows: ((land.data ?? []) as PlanLandRow[]).filter((row) => row.exercise?.trim()),
    warmUpRows: ((warmUp.data ?? []) as PlanLandRow[]).filter((row) => row.exercise?.trim()),
  };
}

const esc = (value: unknown) => String(value ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function formatDay(date: string) {
  return new Date(`${date}T12:00:00`).toLocaleDateString("de-DE", { weekday: "short", day: "2-digit", month: "2-digit", year: "numeric" });
}

export function trainingPlanHtml(plan: TrainingPlan) {
  const sectionMeters = (rows: PlanRow[]) => rows.reduce((sum, row) => sum + row.repetitions * row.distance, 0);

  const water = plan.sections
    .map(
      (section) => `<h2>${esc(section.name)} <span class="m">${sectionMeters(section.rows)} m</span></h2>
      <table>${section.rows
        .map(
          (row) => `<tr><td class="s"><b>${row.repetitions > 1 ? `${row.repetitions}×` : ""}${row.distance}</b></td>
            <td>${esc(row.style ?? "")}</td>
            <td class="w">${esc(row.exercise ?? "")}${row.materials?.length ? ` <span class="m">(${esc(row.materials.join(", "))})</span>` : ""}</td>
            <td>${esc(row.zone ?? "")}</td>
            <td>${row.interval_time ? `${esc(row.interval_type ?? "P")} ${esc(row.interval_time)}` : ""}</td></tr>`
        )
        .join("")}</table>`
    )
    .join("");

  const landTable = (title: string, rows: PlanLandRow[]) =>
    rows.length
      ? `<h2>${title}</h2><table><tr class="h"><td>Übung</td><td>Sätze</td><td>Wdh.</td><td>Gewicht</td><td>Material</td><td>Intensität</td></tr>${rows
          .map(
            (row) =>
              `<tr><td class="w">${esc(row.exercise)}</td><td>${esc(row.sets)}</td><td>${esc(row.repetitions)}</td><td>${esc(row.weight ?? "")}</td><td>${esc(row.material)}</td><td>${esc(row.intensity)}</td></tr>`
          )
          .join("")}</table>`
      : "";

  const meta = [
    formatDay(plan.session_date),
    plan.start_time ? `${plan.start_time.slice(0, 5)} Uhr` : null,
    plan.duration_minutes ? `${plan.duration_minutes} min` : null,
    plan.training_type === "water" && plan.total_meters ? `${plan.total_meters} m` : null,
    plan.pool_length ? `${plan.pool_length}m-Bahn` : null,
    plan.teamName,
  ]
    .filter(Boolean)
    .join(" · ");

  return `<!doctype html><html lang="de"><head><meta charset="utf-8"><title>${esc(plan.title)} – ${esc(plan.session_date)}</title>
<style>
@page { size: A4; margin: 12mm; }
body { font: 10pt/1.35 Arial, Helvetica, sans-serif; color: #111; margin: 0; }
h1 { font-size: 15pt; margin: 0; }
.meta { color: #444; margin: 1mm 0 1mm; }
.focus { margin: 0 0 3mm; }
h2 { font-size: 11pt; margin: 4mm 0 1mm; border-bottom: 1px solid #888; }
table { width: 100%; border-collapse: collapse; }
td { padding: 1mm 1.5mm; border-bottom: 0.5px solid #ddd; vertical-align: top; }
td.s { width: 14mm; white-space: nowrap; }
td.w { width: 55%; }
tr.h td { font-size: 8pt; color: #555; }
.m { font-weight: normal; color: #666; font-size: 8.5pt; }
</style></head><body>
<h1>${esc(plan.title)}</h1>
<div class="meta">${esc(meta)}</div>
${plan.focus ? `<div class="focus"><b>Fokus:</b> ${esc(plan.focus)}</div>` : ""}
${landTable("Warm Up an Land", plan.warmUpRows)}
${plan.training_type === "water" ? water : ""}
${plan.training_type === "land" ? landTable("Landtraining", plan.landRows) : ""}
</body></html>`;
}

/* Oeffnet die Druckansicht ("Als PDF speichern" oder direkt drucken) */
export async function printTraining(sessionId: string) {
  const win = window.open("", "_blank");
  if (!win) return "Das Druckfenster wurde vom Browser blockiert – bitte Pop-ups für diese Seite erlauben.";
  win.document.write("<p style='font-family:Arial'>Trainingsplan wird geladen …</p>");
  const plan = await loadTrainingPlan(sessionId);
  if (typeof plan === "string") {
    win.close();
    return plan;
  }
  win.document.open();
  win.document.write(trainingPlanHtml(plan));
  win.document.close();
  win.focus();
  setTimeout(() => win.print(), 300);
  return null;
}

/* Einheit mit allen Serien/Uebungen loeschen. Rueckgabe: Fehlermeldung oder null */
export async function deleteTraining(sessionId: string) {
  const { data: sections } = await supabase.from("training_sections").select("id").eq("training_session_id", sessionId);
  const sectionIds = ((sections ?? []) as { id: string }[]).map((section) => section.id);

  const steps = [
    sectionIds.length ? supabase.from("training_rows").delete().in("section_id", sectionIds) : null,
    supabase.from("training_sections").delete().eq("training_session_id", sessionId),
    supabase.from("training_land_rows").delete().eq("training_session_id", sessionId),
    supabase.from("training_warmup_land_rows").delete().eq("training_session_id", sessionId),
  ];
  for (const step of steps) {
    if (!step) continue;
    const { error } = await step;
    if (error) return `Training konnte nicht gelöscht werden: ${error.message}`;
  }

  const { error } = await supabase.from("training_sessions").delete().eq("id", sessionId);
  return error ? `Training konnte nicht gelöscht werden: ${error.message}` : null;
}
