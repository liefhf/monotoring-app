#!/usr/bin/env node
/*
 * Demo mit Testdaten starten - ohne echte Datenbank, ohne .env.local.
 *   npm run demo            -> baut und startet auf http://localhost:3100/demo
 * Funktioniert unter Windows, macOS und Linux (keine zusaetzlichen Pakete).
 */
import { spawnSync, spawn } from "node:child_process";

const env = {
  ...process.env,
  NEXT_PUBLIC_DEMO: "1",
  NEXT_PUBLIC_SUPABASE_URL: "https://demo.invalid",
  NEXT_PUBLIC_SUPABASE_ANON_KEY: "demo",
  NEXT_DIST_DIR: ".next-demo",
};
const port = process.env.PORT || "3100";
const npx = process.platform === "win32" ? "npx.cmd" : "npx";

if (!process.argv.includes("--no-build")) {
  console.log("Baue die Demo (dauert ca. 1-2 Minuten) …");
  const build = spawnSync(npx, ["next", "build"], { env, stdio: "inherit", shell: process.platform === "win32" });
  if (build.status !== 0) process.exit(build.status ?? 1);
}
console.log(`\nDemo läuft: http://localhost:${port}/demo  (Beenden mit Strg+C)\n`);
spawn(npx, ["next", "start", "-p", port], { env, stdio: "inherit", shell: process.platform === "win32" });
