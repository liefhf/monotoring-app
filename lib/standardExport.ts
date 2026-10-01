import {
  QualifyingStandard,
  QualifyingTime,
  SWIM_EVENTS,
  Swimmer,
  SwimmerResult,
  findBestForStandard,
  findBestResult,
  findQualifyingTime,
  formatStroke,
  formatTime,
  formatTimeDifference,
} from "@/lib/swim";

/*
 * Bestzeitenliste zu einer Pflichtzeiten-Liste: je Athlet alle Strecken mit
 * Bestzeit 25m- und 50m-Bahn (mit Monat/Jahr), Pflichtzeit und Stand.
 * Als CSV (Excel) oder Druckansicht.
 */

type Line = {
  distance: number;
  stroke: string;
  newStroke: boolean;
  best25: SwimmerResult | null;
  best50: SwimmerResult | null;
  required: number | null;
  status: string;
  ok: boolean;
};

const esc = (value: string) => value.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c] as string);
const monthYear = (date: string | undefined) => (date ? `${Number(date.slice(5, 7))}/${date.slice(0, 4)}` : "");

function linesFor(swimmer: Swimmer, results: SwimmerResult[], times: QualifyingTime[], standard: QualifyingStandard): Line[] {
  const own = results.filter((result) => result.swimmer_id === swimmer.id);
  return SWIM_EVENTS.map((event, index) => {
    const required = findQualifyingTime(times, swimmer, event);
    const counted = required ? findBestForStandard(own, event, standard) : null;
    const diff = required && counted ? counted.time_ms - required.time_ms : null;
    return {
      distance: event.distance,
      stroke: formatStroke(event.stroke),
      newStroke: index > 0 && SWIM_EVENTS[index - 1].stroke !== event.stroke,
      best25: findBestResult(own, event, 25),
      best50: findBestResult(own, event, 50),
      required: required?.time_ms ?? null,
      status: !required ? "" : diff === null ? "keine Zeit" : diff <= 0 ? `✓ ${formatTimeDifference(diff)}` : `fehlt ${formatTimeDifference(diff)}`,
      ok: diff !== null && diff <= 0,
    };
  });
}

export function standardCsv(standard: QualifyingStandard, swimmers: Swimmer[], results: SwimmerResult[], times: QualifyingTime[]) {
  const lines = [["Vorname", "Nachname", "Geburtsjahr", "Disziplin", "Bestzeit 25m Bahn", "Datum", "Bestzeit 50m Bahn", "Datum", "Pflichtzeit", "Stand"].join(";")];
  for (const swimmer of swimmers) {
    for (const line of linesFor(swimmer, results, times, standard)) {
      lines.push(
        [
          swimmer.first_name,
          swimmer.last_name ?? "",
          swimmer.birth_year ?? "",
          `${line.distance}m ${line.stroke}`,
          line.best25 ? formatTime(line.best25.time_ms) : "",
          monthYear(line.best25?.result_date),
          line.best50 ? formatTime(line.best50.time_ms) : "",
          monthYear(line.best50?.result_date),
          line.required ? formatTime(line.required) : "",
          line.status,
        ].join(";")
      );
    }
  }
  const blob = new Blob([`﻿${lines.join("\n")}`], { type: "text/csv;charset=utf-8" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `Bestzeiten_${standard.name.replace(/\s+/g, "_")}.csv`;
  link.click();
  URL.revokeObjectURL(link.href);
}

export function printStandard(standard: QualifyingStandard, swimmers: Swimmer[], results: SwimmerResult[], times: QualifyingTime[]) {
  const win = window.open("", "_blank");
  if (!win) return "Das Druckfenster wurde vom Browser blockiert – bitte Pop-ups für diese Seite erlauben.";
  const blocks = swimmers
    .map((swimmer) => {
      const lines = linesFor(swimmer, results, times, standard);
      const rows = lines
        .map(
          (line, index) => `<tr class="${line.newStroke ? "grp" : ""}">
          ${index === 0 ? `<td class="name" rowspan="${lines.length}">${esc(swimmer.first_name)} ${esc(swimmer.last_name ?? "")}</td><td class="jg" rowspan="${lines.length}">${swimmer.birth_year ?? ""}</td>` : ""}
          <td class="d">${line.distance}m</td><td>${esc(line.stroke)}</td>
          <td class="t">${line.best25 ? formatTime(line.best25.time_ms) : ""}</td><td class="m">${monthYear(line.best25?.result_date)}</td>
          <td class="t">${line.best50 ? formatTime(line.best50.time_ms) : ""}</td><td class="m">${monthYear(line.best50?.result_date)}</td>
          <td class="t pz">${line.required ? formatTime(line.required) : ""}</td><td class="st${line.ok ? " ok" : ""}">${esc(line.status)}</td></tr>`
        )
        .join("");
      return `<tbody>${rows}</tbody>`;
    })
    .join("");
  win.document.write(`<!doctype html><html lang="de"><head><meta charset="utf-8"><title>Bestzeiten – ${esc(standard.name)}</title><style>
@page { size: A4; margin: 0; }
* { box-sizing: border-box; }
body { font: 8.3pt/1.2 "Segoe UI", Arial, sans-serif; color: #2a2640; margin: 0; padding: 9mm 10mm; }
header { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 2mm; }
h1 { font-size: 13pt; margin: 0; } header span { color: #6b6585; }
table { width: 100%; border-collapse: collapse; }
thead th { border-top: 1.5px solid #7c4dde; border-bottom: 1.5px solid #7c4dde; color: #7c4dde; font-size: 7.8pt; padding: 1mm; text-align: left; }
thead { display: table-header-group; }
tbody { break-inside: avoid; border-bottom: 1.5px solid #7c4dde; }
td { padding: 0.45mm 1mm; border-bottom: 0.5px solid #e6e2f3; white-space: nowrap; }
tr.grp td { border-top: 0.8px solid #b9aee0; }
td.name { font-weight: 700; vertical-align: top; padding-top: 1mm; border-right: 0.5px solid #e6e2f3; }
td.jg { vertical-align: top; padding-top: 1mm; color: #6b6585; border-right: 0.5px solid #e6e2f3; }
td.d { text-align: right; color: #6b6585; }
td.t { font-weight: 700; font-variant-numeric: tabular-nums; }
td.m { color: #8a84a3; font-size: 7.3pt; border-right: 0.5px solid #e6e2f3; }
td.pz { font-weight: 400; } td.st { color: #6b6585; } td.st.ok { color: #2a2640; font-weight: 700; }
</style></head><body>
<header><h1>Bestzeiten · Pflichtzeiten ${esc(standard.name)}</h1><span>Stand ${new Date().toLocaleDateString("de-DE")}</span></header>
<table><thead><tr><th>Name</th><th>Jg.</th><th colspan="2">Disziplin</th><th>Bestzeit 25m</th><th>Datum</th><th>Bestzeit 50m</th><th>Datum</th><th>Pflichtzeit</th><th>Stand</th></tr></thead>${blocks}</table>
</body></html>`);
  win.document.close();
  win.focus();
  setTimeout(() => win.print(), 300);
  return null;
}
