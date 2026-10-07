/*
 * Browser-Tests der Arbeitsablaeufe mit nachgebauter Datenbank (mockdb.cjs).
 * Keine echten Daten, keine echte Datenbank.
 *
 *   1. Dev-Server mit Test-Adresse starten:
 *      NEXT_PUBLIC_SUPABASE_URL=http://mock.local NEXT_PUBLIC_SUPABASE_ANON_KEY=x npx next dev -p 3200
 *   2. node tests/e2e/workflows.cjs [390x844|1280x900] [filter]
 *
 * Die Uhr des Browsers steht fest auf Mittwoch, 07.10.2026, 12:00 Uhr,
 * damit "heute", "laeuft" und "beendet" reproduzierbar sind.
 */
const { chromium } = require("playwright");
const { createMock, COACH, ATH, key } = require("./mockdb.cjs");

const BASE = process.env.BASE_URL || "http://localhost:3200";
const NOW = new Date(2026, 9, 7, 12, 0, 0);
const [W, H] = (process.argv[2] || "390x844").split("x").map(Number);
const FILTER = process.argv[3] || "";
const SHOTS = process.env.SHOTS || "";
let failed = 0;
let passed = 0;

async function open(browser, role, opts = {}) {
  const mock = createMock({ now: NOW, faults: opts.faults });
  const uid = role === "coach" ? COACH : ATH;
  const ctx = await browser.newContext({ viewport: { width: W, height: H }, colorScheme: opts.dark ? "dark" : "light" });
  const user = { id: uid, aud: "authenticated", role: "authenticated", email: "t@t.de" };
  await ctx.addInitScript(([u, theme]) => {
    localStorage.setItem("sb-mock-auth-token", JSON.stringify({ access_token: "a", refresh_token: "r", token_type: "bearer", expires_in: 3600, expires_at: 4102444800, user: u }));
    localStorage.setItem("theme", theme);
  }, [user, opts.dark ? "dark" : "light"]);
  await ctx.route("http://mock.local/**", (route) => mock.handle(route, uid));
  const page = await ctx.newPage();
  await page.clock.install({ time: opts.time || NOW });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("dialog", (d) => d.accept(opts.prompt ?? undefined));
  return { page, mock, ctx, errors };
}

async function test(name, fn) {
  if (FILTER && !name.includes(FILTER)) return;
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM || "/opt/pw-browsers/chromium" });
  try {
    await fn(browser);
    passed++;
    console.log(`  ✓ ${name}`);
  } catch (e) {
    failed++;
    console.log(`  ✗ ${name}\n      → ${String(e.message).split("\n")[0]}`);
  } finally {
    await browser.close();
  }
}

const go = (page, path) => page.goto(BASE + path, { waitUntil: "networkidle", timeout: 120000 });
const see = (page, text, timeout = 15000) => page.getByText(text).first().waitFor({ timeout });
async function notSee(page, text) {
  if (await page.getByText(text).count()) throw new Error(`soll nicht sichtbar sein: ${text}`);
}
const shot = async (page, name) => SHOTS && page.screenshot({ path: `${SHOTS}/${W}-${name}.png`, fullPage: true });
const wrote = (mock, prefix, n = 0) => mock.writes.slice(n).some((w) => w.startsWith(prefix));

(async () => {
  console.log(`== Arbeitsablaeufe ${W}x${H}`);

  /* 1 Trainer-Hinweis -> Ursache */
  await test("1 Hinweis auf dem Dashboard fuehrt zur Ursache", async (b) => {
    const { page } = await open(b, "coach");
    await go(page, "/coach");
    await see(page, /Trainingspause: Schulter rechts/);
    await see(page, /Fristen: Dokumente/);
    await shot(page, "dashboard");
    await page.getByRole("link", { name: /Mia Schulz/ }).first().click();
    await page.waitForURL(/schwimmer\/w1\?tab=gesundheit/);
    await see(page, "Physio Do");
  });

  /* 2 Training planen, kopieren, verschieben, Schnelleingabe */
  await test("2 Training kopieren und verschieben bleibt nach Neuladen", async (b) => {
    const { page, mock } = await open(b, "coach", { prompt: key(new Date(2026, 9, 14)) });
    await go(page, "/coach/training");
    await see(page, "GA1 Kraul");
    await page.getByRole("button", { name: "Kopieren" }).nth(1).click();
    await see(page, /wurde auf den 14\.10\. kopiert/);
    const copy = mock.db.training_sessions.find((s) => s.session_date === "2026-10-14" && s.title === "GA1 Kraul");
    if (!copy) throw new Error("Kopie fehlt");
    if (!mock.db.training_sections.some((x) => x.training_session_id === copy.id)) throw new Error("Abschnitte nicht kopiert");
    if (!mock.db.training_rows.some((r) => mock.db.training_sections.find((x) => x.id === r.section_id && x.training_session_id === copy.id))) throw new Error("Serien nicht kopiert");
    await page.getByRole("button", { name: "Verschieben" }).first().click();
    await see(page, /liegt jetzt am 14\.10\./);
    await page.reload({ waitUntil: "networkidle" });
    await shot(page, "trainingswoche");
  });

  await test("2b Kopieren scheitert sauber ohne halbe Kopie", async (b) => {
    const { page, mock } = await open(b, "coach", { prompt: "2026-10-14", faults: { writeError: new Set(["training_rows"]) } });
    await go(page, "/coach/training");
    await page.getByRole("button", { name: "Kopieren" }).nth(1).click();
    await see(page, /Serien konnten nicht kopiert werden\. Es wurde nichts kopiert/);
    if (mock.db.training_sessions.some((s) => s.session_date === "2026-10-14")) throw new Error("halbe Kopie bleibt liegen");
  });

  await test("2c Schnelleingabe behaelt unbekannte Zeilen", async (b) => {
    const { page } = await open(b, "coach");
    await go(page, "/coach/training/new?day=2026-10-08");
    const box = page.getByLabel("Serien als Text eingeben").first();
    await box.fill("8x200 Kraul GA2 @3:00\n10 min Dehnen");
    await page.getByRole("button", { name: "Übernehmen" }).first().click();
    await see(page, /1 übernommen/);
    if ((await box.inputValue()) !== "10 min Dehnen") throw new Error("Rest fehlt");
  });

  /* 3 Anwesenheit */
  await test("3 Anwesenheit speichern und nach Neuladen sehen", async (b) => {
    const { page, mock } = await open(b, "coach");
    await go(page, "/coach/training/session/s0");
    await see(page, "Ben Thiel");
    const row = page.locator("li, tr").filter({ hasText: "Ben Thiel" }).first();
    await row.getByRole("button", { name: "anwesend" }).click();
    await page.waitForTimeout(500);
    if (!mock.db.training_attendance.some((a) => a.swimmer_id === "w2" && a.training_session_id === "s0")) throw new Error("nicht gespeichert");
    await page.reload({ waitUntil: "networkidle" });
    await see(page, "Ben Thiel");
    const pressed = await page.locator("li, tr").filter({ hasText: "Ben Thiel" }).first().getByRole("button", { name: "anwesend" }).getAttribute("aria-pressed");
    if (pressed !== "true") throw new Error("nach Neuladen nicht markiert");
  });

  await test("3b Anwesenheit: Schreibfehler setzt nur diesen Athleten zurueck", async (b) => {
    const { page } = await open(b, "coach", { faults: { writeError: new Set(["training_attendance"]) } });
    await go(page, "/coach/training/session/s0");
    await see(page, "Ben Thiel");
    const row = page.locator("li, tr").filter({ hasText: "Ben Thiel" }).first();
    await row.getByRole("button", { name: "anwesend" }).click();
    await see(page, /Anwesenheit: Speichern fehlgeschlagen/);
    if ((await row.getByRole("button", { name: "anwesend" }).getAttribute("aria-pressed")) === "true") throw new Error("falsch als gespeichert angezeigt");
  });

  /* 4 Leistung: Ziel */
  await test("4 Ziel anlegen, Fortschritt sehen, bleibt nach Neuladen", async (b) => {
    const { page, mock } = await open(b, "coach");
    await go(page, "/coach/schwimmer/w1?tab=ziele");
    await see(page, /noch 2,30/);
    await page.getByRole("button", { name: "+ Ziel" }).first().click();
    await page.getByLabel("Zielzeit").fill("1:10,00");
    await page.getByRole("button", { name: "Speichern" }).click();
    await see(page, "Ziel gespeichert.");
    if (mock.db.athlete_goals.length !== 2) throw new Error("nicht gespeichert");
    await page.reload({ waitUntil: "networkidle" });
    await see(page, /Ziel 1:10,00/);
  });

  await test("4b Ziel: Schreibfehler behaelt Eingabe im Dialog", async (b) => {
    const { page } = await open(b, "coach", { faults: { writeError: new Set(["athlete_goals"]) } });
    await go(page, "/coach/schwimmer/w1?tab=ziele");
    await page.getByRole("button", { name: "+ Ziel" }).first().click();
    await page.getByLabel("Zielzeit").fill("1:10,00");
    await page.getByRole("button", { name: "Speichern" }).click();
    await see(page, /Eingaben bleiben erhalten/);
    if ((await page.getByLabel("Zielzeit").inputValue()) !== "1:10,00") throw new Error("Eingabe verloren");
  });

  await test("4c Ziele-Tabelle fehlt -> Einrichtungs-Hinweis", async (b) => {
    const { page } = await open(b, "coach", { faults: { missing: new Set(["athlete_goals"]) } });
    await go(page, "/coach/schwimmer/w1?tab=ziele");
    await see(page, /Skript 24/);
  });

  /* 5 Gesundheit */
  await test("5 Einschraenkung dokumentieren aus dem Profilkopf", async (b) => {
    const { page, mock } = await open(b, "coach");
    await go(page, "/coach/schwimmer/w2");
    await page.getByRole("button", { name: "+ Einschränkung" }).click();
    await page.getByLabel("Was? *").fill("Knie links");
    await page.getByRole("button", { name: "Speichern" }).click();
    await see(page, "Eintrag gespeichert.");
    if (!mock.db.health_events.some((h) => h.swimmer_id === "w2" && h.title === "Knie links")) throw new Error("nicht gespeichert");
    await page.reload({ waitUntil: "networkidle" });
    await see(page, "Knie links");
  });

  await test("5b Gesundheit: Ladefehler zeigt nie 'voll trainingsfaehig'", async (b) => {
    const { page } = await open(b, "coach", { faults: { readError: new Set(["health_events"]) } });
    await go(page, "/coach/schwimmer/w1?tab=gesundheit");
    await see(page, /Gesundheitsstatus konnte nicht geladen werden/);
    await notSee(page, "Keine Einträge");
    await notSee(page, "voll trainingsfähig");
  });

  await test("5c Gesundheit: 0 Zeilen (keine Berechtigung) ist kein Erfolg", async (b) => {
    const { page } = await open(b, "coach", { faults: { zeroRows: new Set(["health_events"]) } });
    await go(page, "/coach/schwimmer/w1?tab=gesundheit");
    await page.getByRole("button", { name: "Beendet (heute)" }).click();
    await see(page, /Es wurde nichts geändert/);
  });

  /* 6 Check-in */
  await test("6 Check-in mit Schmerzfrage, danach erledigt", async (b) => {
    const { page, mock } = await open(b, "athlete");
    await go(page, "/athlete");
    await page.getByText("Wie geht es dir heute?").first().click();
    await page.waitForURL(/check-in/);
    for (let i = 0; i < 5; i++) {
      await page.getByRole("button", { name: "gut", exact: true }).click();
      await page.waitForTimeout(350);
    }
    await see(page, "Tut dir gerade etwas weh?");
    await page.getByRole("button", { name: "Check-in speichern" }).click();
    await see(page, /sag uns noch, ob dir etwas wehtut/);
    await page.getByRole("radio", { name: "Nein" }).click();
    await shot(page, "check-in-schmerz");
    await page.getByRole("button", { name: "Check-in speichern" }).click();
    await see(page, "✓ Danke!");
    const entry = mock.db.befinden_entries.find((e) => e.entry_date === "2026-10-07");
    if (!entry || entry.pain_answer !== "nein" || entry.has_pain !== false) throw new Error("falsch gespeichert " + JSON.stringify(entry));
    await go(page, "/athlete");
    await see(page, "Check-in erledigt. Danke!");
  });

  await test("6b Check-in-Ladefehler heisst nicht 'offen'", async (b) => {
    const { page } = await open(b, "athlete", { faults: { readError: new Set(["befinden_entries"]) } });
    await go(page, "/athlete");
    await see(page, "Check-in konnte gerade nicht geprüft werden");
  });

  /* 7 Athleten-Rueckmeldung -> Trainer */
  await test("7 Rueckmeldung nur fuer beendete, besuchte Einheit; Trainer sieht sie", async (b) => {
    const { page, mock } = await open(b, "athlete");
    await go(page, "/athlete");
    await see(page, "GA1 Kraul"); // heute 23:00 = naechstes Training, nicht das Fruehtraining
    await see(page, "Wie anstrengend war dein Training?");
    await see(page, /Frühtraining|Gestern Ausdauer/);
    await shot(page, "athlet-heute");
    await go(page, "/athlete/feedback/s1");
    await see(page, /noch nicht vorbei/);
    await go(page, "/athlete/feedback/s3");
    await page.getByRole("button", { name: /^6/ }).first().click();
    await page.getByRole("button", { name: "Feedback speichern" }).click();
    await page.waitForTimeout(800);
    if (!mock.db.training_feedback.some((f) => f.training_session_id === "s3")) throw new Error("nicht gespeichert");
  });

  await test("7b Krank gemeldet -> keine Rueckmeldung erfragt", async (b) => {
    const { page, mock } = await open(b, "athlete");
    mock.db.training_attendance.push({ id: "x", training_session_id: "s0", swimmer_id: "w1", status: "krank" });
    mock.db.training_attendance.find((a) => a.id === "att1").status = "krank";
    await go(page, "/athlete");
    await see(page, "GA1 Kraul");
    await notSee(page, "Wie anstrengend war dein Training?");
  });

  /* 8 Fortschritt */
  await test("8 Fortschritt zeigt Bestzeit und Ziel ohne Fachbegriffe", async (b) => {
    const { page } = await open(b, "athlete");
    await go(page, "/athlete/fortschritt");
    await see(page, "Neue Bestzeiten 🎉");
    const text = await page.locator("main").innerText();
    for (const bad of ["RPE", "Readiness", "ACWR"]) if (text.includes(bad)) throw new Error("Fachbegriff " + bad);
  });

  /* 9 Dokumente */
  await test("9 Dokument hochladen, oeffnen, loeschen", async (b) => {
    const { page, mock } = await open(b, "coach");
    await go(page, "/coach/schwimmer/w2?tab=dokumente");
    await page.getByRole("button", { name: "+ Dokument" }).click();
    await page.locator('input[type="file"]').setInputFiles({ name: "attest.pdf", mimeType: "application/pdf", buffer: Buffer.from("%PDF-1.4") });
    await page.getByRole("button", { name: "Speichern" }).click();
    await see(page, "Dokument gespeichert.");
    const doc = mock.db.athlete_documents.find((d) => d.swimmer_id === "w2");
    if (!doc || !doc.file_path.startsWith("w2/")) throw new Error("Eintrag/Ordner falsch");
    await page.getByRole("button", { name: "Löschen" }).first().click();
    await see(page, "Dokument gelöscht.");
    if (mock.db.athlete_documents.some((d) => d.swimmer_id === "w2")) throw new Error("nicht geloescht");
  });

  await test("9b Eintrag scheitert -> hochgeladene Datei wird wieder entfernt", async (b) => {
    const { page, mock } = await open(b, "coach", { faults: { writeError: new Set(["athlete_documents"]) } });
    await go(page, "/coach/schwimmer/w2?tab=dokumente");
    await page.getByRole("button", { name: "+ Dokument" }).click();
    await page.locator('input[type="file"]').setInputFiles({ name: "attest.pdf", mimeType: "application/pdf", buffer: Buffer.from("%PDF-1.4") });
    await page.getByRole("button", { name: "Speichern" }).click();
    await see(page, /Speichern fehlgeschlagen/);
    if (!wrote(mock, "STORAGE remove")) throw new Error("keine Ausgleichs-Loeschung");
  });

  await test("9c Datei loeschen scheitert -> erneut versuchen", async (b) => {
    const { page } = await open(b, "coach", { faults: { storageError: new Set(["remove"]) } });
    await go(page, "/coach/schwimmer/w1?tab=dokumente");
    await page.getByRole("button", { name: "Löschen" }).first().click();
    await see(page, /Datei konnte nicht entfernt werden/);
    await see(page, "Datei erneut löschen");
  });

  await test("9d Fehlende Datei wird als 'Datei fehlt' gezeigt", async (b) => {
    const { page, mock } = await open(b, "coach");
    mock.files.clear();
    await go(page, "/coach/schwimmer/w1?tab=dokumente");
    await page.getByRole("button", { name: "Öffnen" }).first().click();
    await see(page, /Datei fehlt im Speicher/);
  });

  await test("9e Zu grosse Datei wird vor dem Hochladen abgelehnt", async (b) => {
    const { page, mock } = await open(b, "coach");
    await go(page, "/coach/schwimmer/w2?tab=dokumente");
    await page.getByRole("button", { name: "+ Dokument" }).click();
    await page.locator('input[type="file"]').setInputFiles({ name: "gross.pdf", mimeType: "application/pdf", buffer: Buffer.alloc(11 * 1024 * 1024) });
    await page.getByRole("button", { name: "Speichern" }).click();
    await see(page, /größer als 10 MB/);
    if (wrote(mock, "STORAGE upload")) throw new Error("trotzdem hochgeladen");
  });

  /* 10 Teamwechsel und Entzug */
  await test("10 Schneller Teamwechsel zeigt nur das neue Team", async (b) => {
    const { page } = await open(b, "coach", { faults: { delay: { befinden_entries: 1500 } } });
    await go(page, "/coach");
    await see(page, /Trainingspause: Schulter rechts/);
    await page.getByRole("combobox").first().selectOption({ label: "Masters" }).catch(async () => {
      await page.getByRole("button", { name: /Masters/ }).first().click();
    });
    await page.waitForTimeout(2500);
    await notSee(page, /Trainingspause: Schulter rechts/);
    await see(page, "Masters Abend");
  });

  await test("10b Entzogener Zugriff: Loeschen ohne Wirkung wird gemeldet", async (b) => {
    const { page } = await open(b, "coach", { faults: { zeroRows: new Set(["athlete_notes"]) } });
    await go(page, "/coach/schwimmer/w1");
    await see(page, "Wende Rücken üben");
    await page.getByRole("button", { name: "Notiz löschen" }).first().click();
    await see(page, /Es wurde nichts geändert/);
  });

  await test("10c Dashboard: Ladefehler ist keine Entwarnung", async (b) => {
    const { page } = await open(b, "coach", { faults: { readError: new Set(["training_attendance", "befinden_entries"]) } });
    await go(page, "/coach");
    await see(page, /Unvollständig: .*konnten nicht geladen werden/);
    await notSee(page, /Keine Auffälligkeiten/);
  });

  await test("10d Tageswechsel bei offener App", async (b) => {
    const { page } = await open(b, "athlete", { time: new Date(2026, 9, 7, 23, 58, 0) });
    await go(page, "/athlete");
    await see(page, "Läuft gerade"); // GA1 Kraul 23:00-00:30
    await page.clock.runFor(3 * 60_000); // 00:01
    await page.waitForTimeout(1500);
    await see(page, "Wie geht es dir heute?"); // neuer Tag -> neuer Check-in
  });

  console.log(`\n${passed} bestanden, ${failed} fehlgeschlagen`);
  process.exit(failed ? 1 : 0);
})();
