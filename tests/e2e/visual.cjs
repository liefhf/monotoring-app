/*
 * Sichtpruefung: wichtige Seiten in 320 / 390 / 768 / 1280 px, hell und dunkel.
 * Meldet waagrechtes Scrollen, Tippflaechen < 44 px, Knoepfe ohne Namen und
 * fehlenden sichtbaren Fokus. Screenshots nach $SHOTS (optional).
 *   node tests/e2e/visual.cjs
 */
const { chromium } = require("playwright");
const { createMock, COACH, ATH } = require("./mockdb.cjs");

const BASE = process.env.BASE_URL || "http://localhost:3200";
const NOW = new Date(2026, 9, 7, 12, 0, 0);
const SHOTS = process.env.SHOTS || "";
const SIZES = [[320, 640], [390, 844], [768, 1024], [1280, 900]];
const PAGES = {
  coach: ["/coach", "/coach/schwimmer/w1", "/coach/schwimmer", "/coach/schwimmer/w3", "/coach/schwimmer/w1?tab=gesundheit", "/coach/schwimmer/w1?tab=serien", "/coach/training", "/coach/training/session/s3", "/coach/training/new?session=s1", "/coach/teams", "/coach/competitions", "/coach/bericht", "/coach/settings"],
  // Athletin
  athlete: ["/athlete", "/athlete/check-in", "/athlete/fortschritt", "/athlete/training/s3", "/athlete/feedback/s0"],
};
let problems = 0;

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM || "/opt/pw-browsers/chromium" });
  for (const theme of ["light", "dark"]) {
    for (const [w, h] of SIZES) {
      for (const [role, paths] of Object.entries(PAGES)) {
        const mock = createMock({ now: NOW });
        const uid = role === "coach" ? COACH : ATH;
        const ctx = await browser.newContext({ viewport: { width: w, height: h }, colorScheme: theme });
        await ctx.addInitScript(([u, t]) => {
          localStorage.setItem("sb-mock-auth-token", JSON.stringify({ access_token: "a", refresh_token: "r", token_type: "bearer", expires_in: 3600, expires_at: 4102444800, user: u }));
          localStorage.setItem("theme", t);
        }, [{ id: uid, aud: "authenticated", role: "authenticated" }, theme]);
        await ctx.route("http://mock.local/**", (r) => mock.handle(r, uid));
        const page = await ctx.newPage();
        await page.clock.install({ time: NOW });
        for (const path of paths) {
          // Dev-Server kompiliert manchmal neu -> einmal wiederholen
          await page.goto(BASE + path, { waitUntil: "networkidle", timeout: 120000 }).catch(() => page.goto(BASE + path, { waitUntil: "networkidle", timeout: 120000 }));
          await page.waitForTimeout(600);
          const report = await page.evaluate(() => {
            const out = [];
            if (document.documentElement.scrollWidth > innerWidth + 1) out.push(`waagrechtes Scrollen (${document.documentElement.scrollWidth}px)`);
            const small = [];
            for (const el of document.querySelectorAll("main a, main button, nav a, nav button, main input, main select")) {
              const r = el.getBoundingClientRect();
              if (!r.width || !r.height || getComputedStyle(el).visibility === "hidden") continue;
              const inline = el.tagName === "A" && getComputedStyle(el).display === "inline";
              if (!inline && (r.height < 40 || r.width < 40) && el.type !== "checkbox") small.push((el.getAttribute("aria-label") || el.textContent || el.tagName).trim().slice(0, 25));
              if ((el.tagName === "BUTTON" || el.tagName === "A") && !(el.getAttribute("aria-label") || el.textContent.trim() || el.getAttribute("title"))) out.push("Bedienelement ohne Namen");
            }
            if (small.length) out.push(`klein (<40px): ${[...new Set(small)].slice(0, 6).join(" | ")}`);
            return out;
          });
          // Fokus sichtbar? Erstes Bedienelement per Tab
          await page.keyboard.press("Tab");
          const focusOk = await page.evaluate(() => {
            const el = document.activeElement;
            if (!el || el === document.body) return true;
            const s = getComputedStyle(el);
            return s.outlineStyle !== "none" || s.boxShadow !== "none";
          });
          if (!focusOk) report.push("Fokus nicht sichtbar");
          if (report.length) {
            problems += report.length;
            console.log(`${theme} ${w}px ${path}: ${report.join(" · ")}`);
          }
          if (SHOTS) await page.screenshot({ path: `${SHOTS}/v-${theme}-${w}${path.replace(/[/?=]/g, "_")}.png`, fullPage: true });
        }
        await ctx.close();
      }
    }
  }
  await browser.close();
  console.log(`\n${problems} Auffaelligkeiten`);
})();
