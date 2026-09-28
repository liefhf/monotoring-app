import { NON_FINISH_LABELS, NonFinish, formatEventShort, formatTime, getSwimmerName } from "@/lib/swim";
import { MeetStart } from "@/lib/meetReport";
import { AthleteSheet, monthYearShort } from "@/lib/nextMeetSheet";

/*
 * Kompakte PDF-Ausgabe (ueber den Druckdialog "Als PDF speichern"):
 * - Wettkampf-Uebersicht je Athlet
 * - Bis zum naechsten Wettkampf je Athlet
 */

const esc = (value: unknown) =>
  String(value ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const diff = (ms: number) => `${ms > 0 ? "+" : ms < 0 ? "−" : "±"}${formatTime(Math.abs(ms))}`;

const STYLE = `
@page { size: A4; margin: 10mm; }
* { box-sizing: border-box; }
body { font: 8.5pt/1.25 Arial, Helvetica, sans-serif; color: #111; margin: 0; }
h1 { font-size: 13pt; margin: 0 0 1mm; }
.sub { color: #555; margin-bottom: 3mm; }
h2 { font-size: 10.5pt; margin: 4mm 0 1.5mm; border-bottom: 1px solid #999; }
.grid { columns: 2; column-gap: 5mm; }
.athlete { break-inside: avoid; margin-bottom: 3mm; }
.athlete b.name { font-size: 9pt; }
table { width: 100%; border-collapse: collapse; margin-top: 0.5mm; }
th, td { padding: 0.6mm 1mm; text-align: left; border-bottom: 0.5px solid #ddd; white-space: nowrap; }
th { font-size: 7pt; color: #555; font-weight: normal; }
td.r, th.r { text-align: right; }
.good { color: #137333; font-weight: bold; }
.bad { color: #b3261e; font-weight: bold; }
.muted { color: #777; }
.dq { color: #b3261e; margin: 0.5mm 0; white-space: normal; }
.tag { font-size: 6.5pt; border: 0.5px solid #555; border-radius: 2px; padding: 0 1px; margin-left: 1mm; }
`;

function sheetHtml(sheet: AthleteSheet, withStandard: boolean) {
  const rows = sheet.rows
    .map((row) => {
      const cell = (best: typeof row.best25) =>
        best ? `${formatTime(best.time_ms)} <span class="muted">${monthYearShort(best.result_date)}</span>` : "–";
      const gap =
        row.gapMs === null ? "–" : row.gapMs <= 0 ? `<span class="good">✓ ${diff(row.gapMs)}</span>` : `<b>${diff(row.gapMs)}</b>`;
      return `<tr><td>${esc(formatEventShort(row.event))}${row.role ? `<span class="tag">${row.role === "haupt" ? "H" : "N"}</span>` : ""}</td>
        <td class="r">${cell(row.best25)}</td><td class="r">${cell(row.best50)}</td>
        ${withStandard ? `<td class="r">${row.requiredMs ? formatTime(row.requiredMs) : "–"}</td><td class="r">${gap}</td>` : ""}</tr>`;
    })
    .join("");

  const dqs = sheet.disqualifications
    .map((dq) => `<div class="dq">⚠ DS ${esc(formatEventShort(dq))}${dq.location ? ` (${esc(dq.location)})` : ""}: ${esc(dq.reason ?? "Grund fehlt")}</div>`)
    .join("");

  return `<div class="athlete"><b class="name">${esc(getSwimmerName(sheet.swimmer))}</b>
    <span class="muted">Jg. ${esc(sheet.swimmer.birth_year ?? "?")}</span>${dqs}
    ${rows ? `<table><tr><th>Strecke</th><th class="r">25m</th><th class="r">50m</th>${withStandard ? `<th class="r">Pflicht</th><th class="r">Abstand</th>` : ""}</tr>${rows}</table>` : `<div class="muted">keine Fokus-Strecken</div>`}
  </div>`;
}

function meetHtml(starts: MeetStart[], nonFinishes: NonFinish[], nameOf: (id: string) => string) {
  const bySwimmer = new Map<string, MeetStart[]>();
  for (const start of starts) bySwimmer.set(start.swimmer.id, [...(bySwimmer.get(start.swimmer.id) ?? []), start]);

  return [...bySwimmer.values()]
    .sort((a, b) => (a[0].swimmer.last_name ?? "").localeCompare(b[0].swimmer.last_name ?? "", "de"))
    .map((list) => {
      const swimmer = list[0].swimmer;
      const rows = list
        .map((start) => {
          const status = !start.previousBest
            ? `<span class="muted">neu</span>`
            : start.previousDiff! < 0
              ? `<span class="good">${diff(start.previousDiff!)}</span>`
              : `<span class="bad">${diff(start.previousDiff!)}</span>`;
          const quali = start.required
            ? start.requiredDiff! <= 0
              ? `<span class="good">✓${start.newlyQualified ? " neu" : ""}</span>`
              : diff(start.requiredDiff!)
            : "–";
          return `<tr><td>${esc(formatEventShort(start.result))}${start.result.round ? ` <span class="muted">${esc(start.result.round)}</span>` : ""}</td>
            <td class="r"><b>${formatTime(start.result.time_ms)}</b></td>
            <td class="r muted">${start.previousBest ? formatTime(start.previousBest.time_ms) : "–"}</td>
            <td class="r">${status}</td><td class="r">${quali}</td></tr>`;
        })
        .join("");
      const dqs = nonFinishes
        .filter((entry) => entry.swimmer_id === swimmer.id)
        .map((entry) => `<div class="dq">${entry.status} ${esc(formatEventShort(entry))} – ${esc(entry.reason ?? NON_FINISH_LABELS[entry.status])}</div>`)
        .join("");
      return `<div class="athlete"><b class="name">${esc(nameOf(swimmer.id))}</b> <span class="muted">Jg. ${esc(swimmer.birth_year ?? "?")}</span>
        <table><tr><th>Strecke</th><th class="r">Zeit</th><th class="r">vorher</th><th class="r">Δ</th><th class="r">Pflicht</th></tr>${rows}</table>${dqs}</div>`;
    })
    .join("");
}

type PdfInput = Parameters<typeof meetPdfHtml>[0];

export function openMeetPdf(input: PdfInput) {
  const win = window.open("", "_blank");
  if (!win) return false;
  win.document.write(meetPdfHtml(input));
  win.document.close();
  win.focus();
  setTimeout(() => win.print(), 300);
  return true;
}

export function meetPdfHtml({
  title,
  subtitle,
  meetStarts,
  meetNonFinishes,
  sheets,
  nextTitle,
  withStandard,
  sections,
}: {
  title: string;
  subtitle: string;
  meetStarts: MeetStart[];
  meetNonFinishes: NonFinish[];
  sheets: AthleteSheet[];
  nextTitle: string;
  withStandard: boolean;
  sections: ("meet" | "next")[];
}) {
  const nameOf = (id: string) => {
    const start = meetStarts.find((item) => item.swimmer.id === id);
    return start ? getSwimmerName(start.swimmer) : "";
  };

  const body = [
    `<h1>${esc(title)}</h1><div class="sub">${esc(subtitle)}</div>`,
    sections.includes("meet")
      ? `<h2>Wettkampf-Übersicht</h2><div class="grid">${meetHtml(meetStarts, meetNonFinishes, nameOf)}</div>`
      : "",
    sections.includes("next")
      ? `<h2>Bis zum nächsten Wettkampf – ${esc(nextTitle)}</h2>
         <div class="sub">H = Hauptstrecke, N = Nebenstrecke · Bestzeiten mit Monat/Jahr · Abstand zur Pflichtzeit (25m oder 50m, je nach Liste)</div>
         <div class="grid">${sheets.map((sheet) => sheetHtml(sheet, withStandard)).join("")}</div>`
      : "",
  ].join("");

  return `<!doctype html><html lang="de"><head><meta charset="utf-8"><title>${esc(title)}</title><style>${STYLE}</style></head><body>${body}</body></html>`;
}
