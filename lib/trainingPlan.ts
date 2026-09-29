import { supabase } from "@/lib/supabase";
import { loadTeamSwimmers } from "@/lib/attendance";
import { LactateTest, analyzeLactateTest, formatPace } from "@/lib/lactate";

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
  /* persoenliches Tempo je Zone aus dem letzten Laktattest (Kraul) */
  paces?: { name: string; zones: Record<string, string> }[];
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
    ...(await (async () => {
      const team = await loadTeamSwimmers(session.team_id);
      const tests = team.length
        ? await supabase.from("lactate_tests").select("*").in("swimmer_id", team.map((swimmer) => swimmer.id)).eq("stroke", "freestyle").order("test_date", { ascending: false })
        : { data: [], error: null };
      const latest = new Map<string, LactateTest>();
      for (const test of ((tests.error ? [] : tests.data) ?? []) as LactateTest[]) if (!latest.has(test.swimmer_id)) latest.set(test.swimmer_id, test);
      const paces = team
        .filter((swimmer) => latest.has(swimmer.id))
        .map((swimmer) => {
          const zones = analyzeLactateTest(latest.get(swimmer.id)!).zones;
          return {
            name: `${swimmer.first_name} ${(swimmer.last_name ?? "").slice(0, 1)}.`,
            zones: Object.fromEntries(
              zones.map((zone) => [
                zone.code,
                zone.fromPace && zone.toPace ? `${formatPace(zone.fromPace)}–${formatPace(zone.toPace)}` : zone.toPace ? `> ${formatPace(zone.toPace)}` : `< ${formatPace(zone.fromPace!)}`,
              ])
            ),
          };
        })
        .filter((entry) => Object.keys(entry.zones).length);
      return { athletes: team.map((swimmer) => `${swimmer.last_name ?? ""}, ${swimmer.first_name}`), paces };
    })()),
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
      (section, index) => `<section>
      <div class="sec"><span>${esc(section.name)}</span><span>${sectionMeters(section.rows).toLocaleString("de-DE")} m</span></div>
      <table>
        <colgroup><col class="c-serie"><col class="c-lage"><col><col class="c-zone"><col class="c-int"><col class="c-note"></colgroup>
        ${index === 0 ? `<tr class="colh"><td>Serie</td><td>Lage</td><td>Übung</td><td>Zone</td><td>Pause</td><td>Notiz</td></tr>` : ""}
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
/* margin 0 blendet die Kopf-/Fusszeile des Browsers (Datum, URL) aus; Farben wie in der App */
@page { size: A4; margin: 0; }
* { box-sizing: border-box; }
body { font: 10pt/1.3 "Segoe UI", Arial, Helvetica, sans-serif; color: #2a2640; margin: 0; padding: 9mm 11mm; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
header { display: flex; justify-content: space-between; align-items: center; gap: 5mm; padding-bottom: 2.5mm; border-bottom: 1.5px solid #7c4dde; }
h1 { font-size: 15pt; margin: 0; color: #2a2640; }
.focus { margin-top: 0.5mm; color: #6b6585; }
.facts { display: flex; flex-wrap: wrap; justify-content: flex-end; gap: 1.2mm; margin: 0; max-width: 95mm; }
.facts div { border: 0.5px solid #d6d1e6; border-radius: 10mm; padding: 0.6mm 2.4mm; font-size: 7.8pt; white-space: nowrap; }
.facts dt { display: inline; color: #8a84a3; } .facts dd { display: inline; margin: 0 0 0 1mm; font-weight: 700; }
section { break-inside: avoid; margin-top: 3.8mm; }
.sec { display: flex; justify-content: space-between; color: #7c4dde; font-size: 11pt; font-weight: 700; padding: 0.6mm 0; border-bottom: 1.2px solid #7c4dde; text-transform: uppercase; letter-spacing: 0.3px; }
.sec span:last-child { color: #2a2640; text-transform: none; }
table { width: 100%; border-collapse: collapse; table-layout: fixed; }
td { padding: 1.2mm 1.6mm; border-bottom: 0.5px solid #e6e2f3; vertical-align: top; }
tr.colh td { font-size: 7.5pt; color: #8a84a3; padding-top: 1mm; padding-bottom: 0.6mm; text-transform: uppercase; }
col.c-serie { width: 19mm; } col.c-lage { width: 23mm; } col.c-zone { width: 20mm; } col.c-int { width: 13mm; } col.c-note { width: 32mm; }
td.serie { font-weight: 800; font-size: 11.5pt; white-space: nowrap; color: #2a2640; } .x { font-weight: 400; color: #8a84a3; margin: 0 0.3mm; }
td.lage { color: #6b6585; }
td.int { white-space: nowrap; font-weight: 600; }
td.note { border-left: 0.5px dashed #cfc8e6; }
.zone { font-size: 8.5pt; color: #2a2640; font-weight: 600; white-space: nowrap; }
.mat { font-size: 8pt; font-style: italic; color: #8a84a3; }
tr.h td { font-size: 7.5pt; color: #8a84a3; }
.bottom { display: grid; grid-template-columns: 1.4fr 1fr; gap: 4mm; margin-top: 3mm; break-inside: avoid; }
.notes .lines { height: 22mm; border: 0.5px solid #e6e2f3; border-radius: 2.5mm; background: repeating-linear-gradient(transparent 0 5.3mm, #ece8f6 5.3mm 5.6mm); }
.notes .pre { white-space: pre-wrap; margin-bottom: 1.5mm; padding: 1.5mm 2.5mm; border-left: 2px solid #7c4dde; border-radius: 1mm; }
.att { margin-top: 3mm; break-inside: avoid; }
.bottom .att { margin-top: 0; }
.att b, .notes b { display: block; margin-bottom: 1mm; color: #7c4dde; }
.att-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 0.8mm 3mm; font-size: 8pt; }
.att-grid span { display: flex; align-items: center; gap: 1.4mm; }
.att-grid i { width: 3mm; height: 3mm; border: 0.8px solid #555; border-radius: 50%; flex: none; }
footer { margin-top: 2mm; font-size: 7pt; color: #a09bb8; display: flex; justify-content: space-between; }
</style></head><body>
<header>
  <div><h1>${esc(plan.title)}</h1>${plan.focus ? `<div class="focus"><b>Fokus:</b> ${esc(plan.focus)}</div>` : ""}</div>
  <dl class="facts">${facts.map(([label, value]) => `<div><dt>${label}</dt><dd>${esc(value)}</dd></div>`).join("")}</dl>
</header>
${landTable("Warm Up an Land", plan.warmUpRows)}
${plan.training_type === "water" ? water : ""}
${plan.training_type === "land" ? landTable("Landtraining", plan.landRows) : ""}
${(() => {
  const used = [...new Set(plan.sections.flatMap((section) => section.rows.map((row) => row.zone ?? "")))].filter((zone) => plan.paces?.some((p) => p.zones[zone]));
  if (!plan.paces?.length || !used.length) return "";
  return `<div class="att"><b>Tempo je Zone (/100 m Kraul, aus dem letzten Laktattest)</b><table><tr class="h"><td>Athlet</td>${used.map((z) => `<td>${esc(z)}</td>`).join("")}</tr>${plan.paces.map((p) => `<tr><td>${esc(p.name)}</td>${used.map((z) => `<td>${esc(p.zones[z] ?? "–")}</td>`).join("")}</tr>`).join("")}</table></div>`;
})()}
<div class="bottom">${plan.athletes?.length ? `<div class="att"><b>Anwesenheit</b><div class="att-grid">${plan.athletes.map((name) => `<span><i></i>${esc(name)}</span>`).join("")}</div></div>` : ""}
<div class="notes"><b>Notizen</b>${plan.notes ? `<div class="pre">${esc(plan.notes)}</div>` : ""}<div class="lines"></div></div></div>
<footer><span>Monitoring App · Trainingsplan</span><span>${esc(formatDay(plan.session_date))}</span></footer>
<script>
(function () {
  var page = 297 * 96 / 25.4, h = document.documentElement.scrollHeight;
  if (h > page) document.body.style.zoom = String(Math.max(0.6, (page - 4) / h));
})();
</script>
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
