import { supabase } from "@/lib/supabase";
import { loadTeamSwimmers } from "@/lib/attendance";

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
  notes?: string | null;
  teamName: string | null;
  /* Namen fuer die Anwesenheits-Liste im Ausdruck */
  athletes?: string[];
  sections: { name: string; rows: PlanRow[] }[];
  landRows: PlanLandRow[];
  warmUpRows: PlanLandRow[];
};

export async function loadTrainingPlan(sessionId: string): Promise<TrainingPlan | string> {
  const { data: session, error } = await supabase
    .from("training_sessions")
    .select("*")
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
    athletes: (await loadTeamSwimmers(session.team_id)).map((swimmer) => `${swimmer.last_name ?? ""}, ${swimmer.first_name}`),
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
  const totalMeters = plan.sections.reduce((sum, section) => sum + sectionMeters(section.rows), 0);

  /* Jede Serie mit leerer Notizspalte zum Mitschreiben am Beckenrand */
  const water = plan.sections
    .map(
      (section) => `<section>
      <div class="sec"><span>${esc(section.name)}</span><span>${sectionMeters(section.rows).toLocaleString("de-DE")} m</span></div>
      <table>
        <colgroup><col class="c-serie"><col class="c-lage"><col><col class="c-zone"><col class="c-int"><col class="c-note"></colgroup>
        ${section.rows
          .map(
            (row) => `<tr>
            <td class="serie">${row.repetitions > 1 ? `${row.repetitions}<span class="x">×</span>` : ""}${row.distance}</td>
            <td class="lage">${esc(row.style ?? "")}</td>
            <td>${esc(row.exercise ?? "")}${row.materials?.length ? `<div class="mat">${esc(row.materials.join(" · "))}</div>` : ""}</td>
            <td>${row.zone ? `<span class="zone">${esc(row.zone)}</span>` : ""}</td>
            <td class="int">${row.interval_time ? `${row.interval_type === "@" ? "@" : "P"} ${esc(row.interval_time)}${row.interval_type === "@" ? "" : " s"}` : ""}</td>
            <td class="note"></td></tr>`
          )
          .join("")}
      </table></section>`
    )
    .join("");

  const landTable = (title: string, rows: PlanLandRow[]) =>
    rows.length
      ? `<section><div class="sec"><span>${title}</span><span>${rows.length} Übungen</span></div>
         <table><colgroup><col><col class="c-zone"><col class="c-zone"><col class="c-zone"><col class="c-zone"><col class="c-note"></colgroup>
         <tr class="h"><td>Übung</td><td>Sätze × Wdh.</td><td>Gewicht</td><td>Material</td><td>Intensität</td><td>Notiz</td></tr>${rows
           .map(
             (row) =>
               `<tr><td>${esc(row.exercise)}</td><td>${esc([row.sets, row.repetitions].filter(Boolean).join(" × "))}</td><td>${esc(row.weight ?? "")}</td><td>${esc(row.material)}</td><td>${esc(row.intensity)}</td><td class="note"></td></tr>`
           )
           .join("")}</table></section>`
      : "";

  const facts = [
    ["Datum", formatDay(plan.session_date)],
    ["Uhrzeit", plan.start_time ? `${plan.start_time.slice(0, 5)} Uhr` : null],
    ["Dauer", plan.duration_minutes ? `${plan.duration_minutes} min` : null],
    ["Umfang", plan.training_type === "water" ? `${(plan.total_meters ?? totalMeters).toLocaleString("de-DE")} m` : null],
    ["Bahn", plan.pool_length ? `${plan.pool_length} m` : null],
    ["Gruppe", plan.teamName],
  ].filter(([, value]) => value);

  return `<!doctype html><html lang="de"><head><meta charset="utf-8"><title>${esc(plan.title)} – ${esc(plan.session_date)}</title>
<style>
/* margin 0 blendet die Kopf-/Fusszeile des Browsers (Datum, URL) aus */
@page { size: A4; margin: 0; }
* { box-sizing: border-box; }
body { font: 10pt/1.35 "Segoe UI", Arial, Helvetica, sans-serif; color: #1b2330; margin: 0; padding: 12mm 13mm; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
header { display: flex; justify-content: space-between; align-items: flex-start; gap: 6mm; border-bottom: 2px solid #1f5fa8; padding-bottom: 3mm; }
h1 { font-size: 17pt; margin: 0; color: #12325c; }
.focus { margin-top: 1mm; color: #334; }
.facts { display: grid; grid-template-columns: auto auto; gap: 0.5mm 3mm; font-size: 8.5pt; white-space: nowrap; }
.facts dt { color: #6b7686; } .facts dd { margin: 0; font-weight: 600; }
section { break-inside: avoid; margin-top: 4mm; }
.sec { display: flex; justify-content: space-between; background: #eaf1fb; color: #12325c; font-weight: 700; padding: 1.2mm 2.5mm; border-radius: 1.5mm; }
.sec span:last-child { font-weight: 600; color: #1f5fa8; }
table { width: 100%; border-collapse: collapse; table-layout: fixed; }
td { padding: 1.4mm 2mm; border-bottom: 0.5px solid #d9dee6; vertical-align: top; }
col.c-serie { width: 17mm; } col.c-lage { width: 23mm; } col.c-zone { width: 24mm; } col.c-int { width: 14mm; } col.c-note { width: 38mm; }
td.serie { font-weight: 700; font-size: 10.5pt; white-space: nowrap; } .x { font-weight: 400; color: #6b7686; margin: 0 0.3mm; }
td.lage { color: #445; }
td.int { white-space: nowrap; font-weight: 600; }
td.note { border-left: 0.5px dashed #b8c0cc; }
.zone { display: inline-block; font-size: 8pt; padding: 0.2mm 1.5mm; border-radius: 1mm; background: #f1f3f6; white-space: nowrap; }
.mat { font-size: 8pt; color: #6b7686; margin-top: 0.3mm; }
tr.h td { font-size: 8pt; color: #6b7686; }
.notes { margin-top: 5mm; break-inside: avoid; }
.notes .lines { height: 38mm; border: 0.5px solid #d9dee6; border-radius: 1.5mm; background: repeating-linear-gradient(transparent 0 7.3mm, #e3e7ed 7.3mm 7.6mm); }
.notes .pre { white-space: pre-wrap; margin-bottom: 2mm; padding: 2mm 2.5mm; background: #fff8e6; border-left: 2px solid #e0a800; border-radius: 1mm; }
.att { margin-top: 5mm; break-inside: avoid; }
.att b { display: block; margin-bottom: 1mm; color: #12325c; }
.att-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1.2mm 4mm; font-size: 9pt; }
.att-grid span { display: flex; align-items: center; gap: 1.5mm; }
.att-grid i { width: 3.5mm; height: 3.5mm; border: 0.8px solid #555; border-radius: 0.6mm; flex: none; }
.notes b { display: block; margin-bottom: 1mm; color: #12325c; }
footer { margin-top: 3mm; font-size: 7.5pt; color: #8a93a1; display: flex; justify-content: space-between; }
</style></head><body>
<header>
  <div><h1>${esc(plan.title)}</h1>${plan.focus ? `<div class="focus"><b>Fokus:</b> ${esc(plan.focus)}</div>` : ""}</div>
  <dl class="facts">${facts.map(([label, value]) => `<dt>${label}</dt><dd>${esc(value)}</dd>`).join("")}</dl>
</header>
${landTable("Warm Up an Land", plan.warmUpRows)}
${plan.training_type === "water" ? water : ""}
${plan.training_type === "land" ? landTable("Landtraining", plan.landRows) : ""}
${plan.athletes?.length ? `<div class="att"><b>Anwesenheit</b><div class="att-grid">${plan.athletes.map((name) => `<span><i></i>${esc(name)}</span>`).join("")}</div></div>` : ""}
<div class="notes"><b>Notizen</b>${plan.notes ? `<div class="pre">${esc(plan.notes)}</div>` : ""}<div class="lines"></div></div>
<footer><span>Monitoring App · Trainingsplan</span><span>${esc(formatDay(plan.session_date))}</span></footer>
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
