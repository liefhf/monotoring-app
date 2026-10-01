import { QualifyingStandard, Swimmer, SwimmerResult, SwimEvent, formatDate, formatEvent, formatTime, formatTimeDifference, getSwimmerName } from "@/lib/swim";

/*
 * Export der Pflichtzeiten-Auswertung: je Athlet und Strecke Bestzeit,
 * Pflichtzeit und Abstand – als CSV (Excel) oder kompakte Druckansicht.
 */

export type ExportEntry = {
  swimmer: Swimmer;
  fulfilled: number;
  rows: { event: SwimEvent; best: SwimmerResult | null; required: { time_ms: number }; diff: number | null }[];
};

const esc = (value: string) => value.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c] as string);
const status = (diff: number | null) => (diff === null ? "keine Zeit" : diff <= 0 ? `erfüllt (${formatTimeDifference(diff)})` : `fehlt ${formatTimeDifference(diff)}`);

export function standardCsv(standard: QualifyingStandard, entries: ExportEntry[]) {
  const lines = [["Nachname", "Vorname", "Jahrgang", "Strecke", "Bestzeit", "Bahn", "Datum", "Ort", "Pflichtzeit", "Stand"].join(";")];
  for (const { swimmer, rows } of entries) {
    for (const row of rows) {
      lines.push(
        [
          swimmer.last_name ?? "",
          swimmer.first_name,
          swimmer.birth_year ?? "",
          formatEvent(row.event),
          row.best ? formatTime(row.best.time_ms) : "",
          row.best ? `${row.best.pool_length}m` : "",
          row.best ? formatDate(row.best.result_date) : "",
          row.best?.location ?? "",
          formatTime(row.required.time_ms),
          status(row.diff),
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

export function printStandard(standard: QualifyingStandard, entries: ExportEntry[]) {
  const win = window.open("", "_blank");
  if (!win) return "Das Druckfenster wurde vom Browser blockiert – bitte Pop-ups für diese Seite erlauben.";
  const blocks = entries
    .map(
      ({ swimmer, rows, fulfilled }) => `<section>
      <div class="sec"><span>${esc(getSwimmerName(swimmer))} <small>Jg. ${swimmer.birth_year ?? "?"}</small></span><span>${fulfilled} / ${rows.length} erfüllt</span></div>
      <table>${rows
        .map(
          (row) => `<tr class="${row.diff !== null && row.diff <= 0 ? "ok" : ""}"><td class="ev">${esc(formatEvent(row.event))}</td>
          <td class="t">${row.best ? formatTime(row.best.time_ms) : "–"}${row.best ? ` <small>${row.best.pool_length}m · ${formatDate(row.best.result_date)}</small>` : ""}</td>
          <td class="t">${formatTime(row.required.time_ms)}</td><td>${esc(status(row.diff))}</td></tr>`
        )
        .join("")}</table></section>`
    )
    .join("");
  win.document.write(`<!doctype html><html lang="de"><head><meta charset="utf-8"><title>Bestzeiten – ${esc(standard.name)}</title><style>
@page { size: A4; margin: 0; }
* { box-sizing: border-box; }
body { font: 8.8pt/1.25 "Segoe UI", Arial, sans-serif; color: #2a2640; margin: 0; padding: 9mm 11mm; }
header { display: flex; justify-content: space-between; align-items: baseline; border-bottom: 1.5px solid #7c4dde; padding-bottom: 2mm; }
h1 { font-size: 14pt; margin: 0; } header span { color: #6b6585; }
.cols { columns: 2; column-gap: 6mm; margin-top: 3mm; }
section { break-inside: avoid; margin-bottom: 3mm; }
.sec { display: flex; justify-content: space-between; color: #7c4dde; font-weight: 700; border-bottom: 1px solid #7c4dde; padding: 0.4mm 0; }
.sec small { color: #6b6585; font-weight: 400; } .sec span:last-child { color: #2a2640; }
table { width: 100%; border-collapse: collapse; }
td { padding: 0.6mm 1mm; border-bottom: 0.5px solid #e6e2f3; white-space: nowrap; }
td.ev { font-weight: 600; } td.t { font-variant-numeric: tabular-nums; } td small { color: #8a84a3; }
tr.ok td:last-child { font-weight: 700; }
footer { margin-top: 2mm; font-size: 7pt; color: #a09bb8; }
</style></head><body>
<header><h1>Bestzeiten – ${esc(standard.name)}</h1><span>${standard.count_both_pools ? "25m und 50m" : `${standard.pool_length}m-Bahn`}${standard.valid_from || standard.valid_to ? ` · Zeitraum ${formatDate(standard.valid_from)} – ${formatDate(standard.valid_to)}` : ""} · Stand ${formatDate(new Date().toISOString().slice(0, 10))}</span></header>
<div class="cols">${blocks}</div>
<footer>Monitoring App · Spalten: Strecke · Bestzeit · Pflichtzeit · Stand</footer>
</body></html>`);
  win.document.close();
  win.focus();
  setTimeout(() => win.print(), 300);
  return null;
}
