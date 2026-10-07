/* eslint-disable @typescript-eslint/no-explicit-any -- nachgebildete, untypisierte Tabellen */
/*
 * Nachgebildete Supabase-Schnittstelle mit Testdaten (KEINE echte Datenbank).
 * Genutzt von
 *   - der Demo (Browser, NEXT_PUBLIC_DEMO=1, lib/demo/demoFetch.ts) und
 *   - den Browser-Tests (tests/e2e/mockdb.cjs).
 * Ohne Importe, damit Node die Datei direkt laden kann.
 *
 * Schreibvorgaenge veraendern die Daten wirklich ("nach Neuladen noch da").
 * Fehler gezielt ausloesen ueber faults (nur Tests).
 * Filter: eq, neq, in, gte, gt, lte, lt, is, not.*, eingebettet "tabelle.spalte"; order, limit.
 */

const DAY = 864e5;
const pad = (n: number) => String(n).padStart(2, "0");
export const dateKey = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const ago = (n: number, now = new Date()) => dateKey(new Date(now.getTime() - n * DAY));

export const COACH = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
export const ATH = "cccccccc-cccc-cccc-cccc-cccccccccccc";
export const COACH2 = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";

type Db = Record<string, any[]>;

export function seed(now = new Date()): Db {
  const today = dateKey(now);
  const long = "Maximiliane-Charlotte von Hohenstein-Waldburg";
  const row = (id: string, section: string, reps: number, distance: number, style: string, zone: string, interval: string, sort = 0) => ({
    id, section_id: section, repetitions: reps, distance, exercise: null, style, materials: [], zone, interval_type: "@", interval_time: interval, sort_order: sort,
  });
  const times = (base: number, steps: number[]) => steps.map((s) => base + s);
  return {
    profiles: [
      { id: COACH, role: "coach", first_name: "Sabine", last_name: "Kramer" },
      { id: COACH2, role: "coach", first_name: "Tom", last_name: "Berger", email: "tom@demo.verein" },
      { id: ATH, role: "athlete", first_name: "Mia", last_name: "Schulz" },
      { id: "dddddddd-0000-0000-0000-000000000000", role: "athlete", first_name: "Maximiliane-Charlotte", last_name: "von Hohenstein-Waldburg" },
    ],
    teams: [
      { id: "t1", name: "Jg. 2012–14", coach_id: COACH },
      { id: "t2", name: "Masters", coach_id: COACH },
    ],
    team_swimmers: [
      { id: "ts1", team_id: "t1", swimmer_id: "w1" },
      { id: "ts2", team_id: "t1", swimmer_id: "w2" },
      { id: "ts3", team_id: "t1", swimmer_id: "w3" },
      { id: "ts4", team_id: "t2", swimmer_id: "w4" },
    ],
    team_members: [{ team_id: "t1", athlete_id: ATH }, { team_id: "t1", athlete_id: "dddddddd-0000-0000-0000-000000000000" }],
    swimmers: [
      { id: "w1", first_name: "Mia", last_name: "Schulz", birth_year: 2013, gender: "female", profile_id: ATH, coach_id: COACH },
      { id: "w2", first_name: "Ben", last_name: "Thiel", birth_year: 2012, gender: "male", profile_id: null, coach_id: COACH },
      { id: "w3", first_name: long.split(" ")[0], last_name: long.split(" ").slice(1).join(" "), birth_year: 2012, gender: "female", profile_id: "dddddddd-0000-0000-0000-000000000000", coach_id: COACH },
      { id: "w4", first_name: "Olaf", last_name: "Master", birth_year: 1970, gender: "male", profile_id: null, coach_id: COACH },
    ],
    training_sessions: [
      { id: "s0", title: "Frühtraining", session_date: today, start_time: "06:00:00", total_meters: 2500, duration_minutes: 60, team_id: "t1", coach_id: COACH, training_type: "water", planned_rpe: 4, pool_length: 25, content_version: 1 },
      { id: "s1", title: "GA1 Kraul", session_date: today, start_time: "23:00:00", total_meters: 4200, duration_minutes: 90, team_id: "t1", coach_id: COACH, training_type: "water", planned_rpe: 5, pool_length: 25, content_version: 1 },
      { id: "s2", title: "Technik Rücken", session_date: ago(-2, now), start_time: "16:30:00", total_meters: 3000, duration_minutes: 90, team_id: "t1", coach_id: COACH, training_type: "water", planned_rpe: 4, pool_length: 25, content_version: 1 },
      { id: "s3", title: "Ausdauer GA2", session_date: ago(1, now), start_time: "17:00:00", total_meters: 3800, duration_minutes: 90, team_id: "t1", coach_id: COACH, training_type: "water", planned_rpe: 6, pool_length: 25, content_version: 1 },
      { id: "s5", title: "Ausdauer GA2", session_date: ago(8, now), start_time: "17:00:00", total_meters: 3800, duration_minutes: 90, team_id: "t1", coach_id: COACH, training_type: "water", planned_rpe: 6, pool_length: 25, content_version: 1 },
      { id: "s4", title: "Masters Abend", session_date: today, start_time: "20:00:00", total_meters: 2000, duration_minutes: 60, team_id: "t2", coach_id: COACH, training_type: "water", planned_rpe: 4, pool_length: 25, content_version: 1 },
    ],
    training_sections: [
      { id: "sec1", training_session_id: "s1", section_key: "a", section_name: "Hauptteil", practice_mode: "einzeln", sort_order: 0 },
      { id: "sec3", training_session_id: "s3", section_key: "a", section_name: "Hauptteil", practice_mode: "einzeln", sort_order: 0 },
      { id: "sec5", training_session_id: "s5", section_key: "a", section_name: "Hauptteil", practice_mode: "einzeln", sort_order: 0 },
      { id: "sec0", training_session_id: "s0", section_key: "a", section_name: "Hauptteil", practice_mode: "einzeln", sort_order: 0 },
    ],
    training_rows: [
      row("row1", "sec1", 8, 200, "Kraul", "GA1", "3:00"),
      row("row3", "sec3", 8, 200, "Kraul", "GA2", "3:00"),
      row("row3b", "sec3", 6, 50, "Beine", "GA1", "1:10", 1),
      row("row5", "sec5", 8, 200, "Kraul", "GA2", "3:00"),
      row("row0", "sec0", 10, 100, "Kraul", "GA1", "1:45"),
    ],
    training_land_rows: [],
    training_warmup_land_rows: [],
    training_attendance: [
      { id: "att1", training_session_id: "s3", swimmer_id: "w1", status: "anwesend", note: null },
      { id: "att2", training_session_id: "s3", swimmer_id: "w3", status: "anwesend", note: null },
      { id: "att3", training_session_id: "s3", swimmer_id: "w2", status: "krank", note: null },
    ],
    training_feedback: [{ id: "fb1", training_session_id: "s3", athlete_id: ATH, rpe: 8, completed: true }],
    training_set_times: [
      // vor einer Woche: gleiche Serie, gleiche Bedingungen
      { id: "st5", training_session_id: "s5", swimmer_id: "w1", set_label: "8×200 Kraul GA2 @3:00", stroke: "Kraul", interval_seconds: 180, interval_type: "@", distance: 200, repetitions: 8, pool_length: 25, zone: "GA2", materials: [], target_ms: 156000, missed_reps: [], plan_key: "0.0", note: null,
        times_ms: times(156000, [0, 400, 600, 300, 900, 1200, 1500, 2000]) },
      // gestern: wird gegen Ende langsamer, eine Wiederholung nicht erfasst
      { id: "st3", training_session_id: "s3", swimmer_id: "w1", set_label: "8×200 Kraul GA2 @3:00", stroke: "Kraul", interval_seconds: 180, interval_type: "@", distance: 200, repetitions: 8, pool_length: 25, zone: "GA2", materials: [], target_ms: 156000, missed_reps: [], plan_key: "0.0", note: "Wende 5 zu weit weg",
        times_ms: [154800, 155200, 155600, 155900, null, 158900, 159800, 160400] },
      { id: "st3b", training_session_id: "s3", swimmer_id: "w3", set_label: "8×200 Kraul GA2 @3:00", stroke: "Kraul", interval_seconds: 180, interval_type: "@", distance: 200, repetitions: 8, pool_length: 25, zone: "GA2", materials: [], target_ms: 156000, missed_reps: [7, 8], plan_key: "0.0", note: null,
        times_ms: [152100, 152600, 152300, 153000, 152800, 153400, null, null] },
    ],
    health_events: [
      { id: "h1", swimmer_id: "w1", kind: "verletzung", title: "Schulter rechts", body_region: "Schulter", availability: "eingeschraenkt", restriction: "kein Delfin, Rücken nur locker", start_date: ago(3, now), end_date: null, clearance: "offen", note: "Physio Do", visible_to_athlete: true },
    ],
    befinden_entries: [0, 1, 2].map((d) => ({ id: "b" + d, athlete_id: ATH, entry_date: ago(d + 1, now), sleep_quality: 4, energy: 4, muscle_feeling: 4, stress: 5, mood: 5, sleep_hours: 6.5, has_pain: true, pain_area: "Schulter", comment: null })),
    pain_reports: [{ id: "p1", athlete_id: ATH, created_at: now.toISOString(), pain_level: 6, spot_label: "Schulter rechts", body_region: "Schulter" }],
    swimmer_results: [
      { id: "r1", swimmer_id: "w1", kind: "einzel", result_date: ago(60, now), pool_length: 25, distance: 100, stroke: "backstroke", time_ms: 73000, is_split: false, location: "Bezirksmeisterschaft" },
      { id: "r2", swimmer_id: "w1", kind: "einzel", result_date: ago(2, now), pool_length: 25, distance: 100, stroke: "backstroke", time_ms: 71800, is_split: false, location: "Vereinsmeisterschaft" },
      { id: "r3", swimmer_id: "w1", kind: "einzel", result_date: ago(30, now), pool_length: 25, distance: 200, stroke: "freestyle", time_ms: 148900, is_split: false, location: "Herbstpokal" },
    ],
    athlete_goals: [{ id: "g1", swimmer_id: "w1", kind: "zeit", title: null, distance: 100, stroke: "backstroke", pool_length: 25, target_ms: 69500, due_date: null, achieved_at: null, visible_to_athlete: true, created_at: ago(5, now) }],
    athlete_notes: [{ id: "n1", body: "Wende Rücken üben", pinned: true, created_at: ago(1, now), swimmer_id: "w1" }],
    athlete_documents: [{ id: "d1", swimmer_id: "w1", doc_type: "sportattest", title: "Sportattest", valid_until: ago(-10, now), file_path: "w1/1-attest.pdf", created_at: ago(300, now) }],
    news_posts: [{ id: "np", title: "Alte wichtige Regel", created_at: ago(40, now) + "T10:00:00Z", pinned: true }],
    calendar_entries: [],
    calendar_tasks: [],
    fitness_tests: [],
    team_coaches: [],
  };
}

function matches(row: any, k: string, v: string, embedded?: any): boolean {
  if (k.includes(".") && embedded !== undefined) {
    const [table, col] = k.split(".");
    const inner = row[table];
    return inner ? matches(inner, col, v) : true;
  }
  if (!(k in row)) return true; // Spalte unbekannt -> nicht filtern
  const val = row[k];
  const [op, ...rest] = v.split(".");
  const arg = rest.join(".");
  const s = val === null || val === undefined ? null : String(val);
  switch (op) {
    case "eq": return s === arg;
    case "neq": return s !== arg;
    case "gte": return s !== null && s >= arg;
    case "gt": return s !== null && s > arg;
    case "lte": return s !== null && s <= arg;
    case "lt": return s !== null && s < arg;
    case "is": return arg === "null" ? s === null : String(val) === arg;
    case "in": return arg.replace(/^\(|\)$/g, "").split(",").map((x) => x.replace(/^"|"$/g, "")).includes(s as string);
    case "not": return !matches(row, k, arg);
    default: return true;
  }
}

function select(rows: any[], params: URLSearchParams) {
  let out = rows.slice();
  for (const [k, v] of params) {
    if (["select", "order", "limit", "offset", "on_conflict", "columns", "or"].includes(k)) continue;
    out = out.filter((row) => matches(row, k, v, true));
  }
  const order = params.get("order");
  if (order) {
    const parts = order.split(",").map((p) => p.split("."));
    out.sort((a, b) => {
      for (const [col, dir] of parts) {
        const x = a[col] ?? "", y = b[col] ?? "";
        if (x < y) return dir === "desc" ? 1 : -1;
        if (x > y) return dir === "desc" ? -1 : 1;
      }
      return 0;
    });
  }
  const limit = params.get("limit");
  if (limit) out = out.slice(0, Number(limit));
  return out;
}

export type Faults = {
  missing?: Set<string>;
  readError?: Set<string>;
  writeError?: Set<string>;
  zeroRows?: Set<string>;
  delay?: Record<string, number>;
  storageError?: Set<string>;
};

export type MockRequest = { method: string; url: string; headers: Record<string, string>; body: string | null };
export type MockResponse = { status: number; json: unknown };

export function createMockApi({ now = new Date(), faults = {}, db: initial }: { now?: Date; faults?: Faults; db?: Db } = {}) {
  const db: Db = initial ?? seed(now);
  const writes: string[] = [];
  const f = { missing: new Set<string>(), readError: new Set<string>(), writeError: new Set<string>(), zeroRows: new Set<string>(), delay: {} as Record<string, number>, storageError: new Set<string>(), ...faults };
  const files = new Set(["w1/1-attest.pdf"]);
  let seq = 1;
  const ok = (json: unknown, status = 200): MockResponse => ({ status, json });

  async function handle(req: MockRequest, uid: string): Promise<MockResponse> {
    const url = new URL(req.url);
    const method = req.method.toUpperCase();
    const single = (req.headers["accept"] || "").includes("vnd.pgrst.object");
    const path = url.pathname;

    if (path.includes("/auth/v1/")) {
      const user = { id: uid, aud: "authenticated", role: "authenticated", email: "demo@demo.verein" };
      if (path.includes("/token")) return ok({ access_token: "demo", refresh_token: "demo", token_type: "bearer", expires_in: 3600, expires_at: 4102444800, user });
      if (path.includes("/logout")) return ok({}, 204);
      return ok(user);
    }

    if (path.includes("/storage/v1/")) {
      const op = path.includes("/sign/") ? "sign" : method === "DELETE" ? "remove" : method === "POST" && path.includes("/object/athlete-documents/") ? "upload" : "other";
      writes.push(`STORAGE ${op} ${path}`);
      if (f.storageError.has(op)) return ok({ message: "storage down" }, 500);
      if (op === "upload") {
        files.add(decodeURIComponent(path.split("/object/athlete-documents/")[1]));
        return ok({ Key: "x" });
      }
      if (op === "remove") return ok([]);
      if (op === "sign") {
        const name = decodeURIComponent(path.split("/sign/athlete-documents/")[1] || "");
        if (!files.has(name)) return ok({ statusCode: "404", error: "not_found", message: "Object not found" }, 400);
        return ok({ signedURL: "/x" });
      }
      return ok({});
    }

    if (path.includes("/rest/v1/rpc/")) {
      const fn = path.split("/").pop() as string;
      const args = req.body ? JSON.parse(req.body) : {};
      if (fn === "save_training_content") return saveTrainingContent(args);
      if (fn === "team_coach_list") {
        return ok(db.team_coaches.filter((c) => c.team_id === args.p_team_id).map((c) => {
          const p = db.profiles.find((x) => x.id === c.coach_id);
          return { coach_id: c.coach_id, name: p ? `${p.first_name} ${p.last_name}` : "", added_at: c.added_at, revoked_at: c.revoked_at ?? null };
        }));
      }
      if (fn === "add_team_coach") {
        const p = db.profiles.find((x) => (x.email ?? "").toLowerCase() === String(args.p_email).trim().toLowerCase() && x.role === "coach");
        if (!p) return ok({ code: "P0002", message: "Kein Trainer-Konto mit dieser E-Mail gefunden." }, 400);
        const existing = db.team_coaches.find((c) => c.team_id === args.p_team_id && c.coach_id === p.id);
        if (existing) existing.revoked_at = null;
        else db.team_coaches.push({ id: `tc${seq++}`, team_id: args.p_team_id, coach_id: p.id, added_at: new Date().toISOString(), revoked_at: null });
        return ok(`${p.first_name} ${p.last_name}`);
      }
      const rpc: Record<string, () => unknown> = {
        my_results: () => db.swimmer_results.filter((r) => r.swimmer_id === "w1"),
        my_teams: () => (uid === ATH ? db.teams.filter((t) => t.id === "t1").map((t) => ({ id: t.id, name: t.name, is_coach: false })) : db.teams.map((t) => ({ id: t.id, name: t.name, is_coach: true }))),
        my_swimmer: () => db.swimmers[0],
      };
      return ok((rpc[fn] || (() => []))());
    }

    const table = path.split("/").pop() as string;
    if (f.delay[table]) await new Promise((r) => setTimeout(r, f.delay[table]));
    if (f.missing.has(table)) return ok({ code: "PGRST205", message: `Could not find the table 'public.${table}'` }, 404);

    if (method === "GET" || method === "HEAD") {
      if (f.readError.has(table)) return ok({ code: "XX000", message: "read failed" }, 500);
      const sel = url.searchParams.get("select") || "";
      let rows = (db[table] || []).map((r) => ({ ...r }));
      // eingebettete Abfragen wie bei PostgREST nachbilden
      if (sel.includes("swimmers(")) rows = rows.map((r) => ({ ...r, swimmers: db.swimmers.find((w) => w.id === r.swimmer_id) || null }));
      if (/training_sessions(!inner)?\(/.test(sel)) rows = rows.map((r) => ({ ...r, training_sessions: db.training_sessions.find((x) => x.id === r.training_session_id) || null }));
      rows = select(rows, url.searchParams);
      // wie RLS
      if (table === "profiles" && uid === ATH) rows = rows.filter((r) => r.id === ATH);
      if (table === "training_sessions" && uid === ATH) rows = rows.filter((r) => r.team_id === "t1");
      if (table === "training_set_times" && uid === ATH) rows = rows.filter((r) => r.swimmer_id === "w1");
      if (single) return rows.length ? ok(rows[0]) : ok({ code: "PGRST116", message: "0 rows" }, 406);
      return ok(rows);
    }

    const body = req.body ? JSON.parse(req.body) : null;
    writes.push(`${method} ${table} ${JSON.stringify(body)?.slice(0, 200) ?? ""}`);
    if (f.writeError.has(table)) return ok({ code: "XX000", message: "write failed" }, 500);
    db[table] = db[table] || [];
    let affected: any[] = [];
    if (method === "POST") {
      const list = Array.isArray(body) ? body : [body];
      const conflict = url.searchParams.get("on_conflict");
      for (const item of list) {
        const existing = conflict ? db[table].find((r) => conflict.split(",").every((c) => String(r[c]) === String(item[c]))) : null;
        if (existing) {
          Object.assign(existing, item);
          affected.push(existing);
        } else {
          const created = { id: `new${seq++}`, created_at: new Date().toISOString(), ...item };
          db[table].push(created);
          affected.push(created);
        }
      }
    } else {
      const targets = select(db[table], url.searchParams);
      if (!f.zeroRows.has(table)) {
        if (method === "PATCH") targets.forEach((r) => Object.assign(r, body));
        if (method === "DELETE") db[table] = db[table].filter((r) => !targets.includes(r));
        affected = targets;
      }
    }
    if (single) return affected[0] ? ok(affected[0], 201) : ok({ code: "PGRST116" }, 406);
    return ok(affected, 201);
  }

  /* wie supabase/training_speichern_serienzeiten.sql: Versionsvergleich, alles oder nichts */
  function saveTrainingContent(a: any): MockResponse {
    const session = db.training_sessions.find((s) => s.id === a.p_session_id);
    if (!session) return ok({ code: "P0002", message: "not_found" }, 400);
    if ((session.content_version ?? 0) !== (a.p_expected_version ?? 0)) return ok({ code: "40001", message: "version_conflict" }, 400);
    if (f.writeError.has("training_rows")) return ok({ code: "XX000", message: "write failed" }, 500);
    const keep = ["title", "team_id", "session_date", "start_time", "training_type", "duration_minutes", "total_meters", "pool_length", "focus", "planned_rpe", "core_goals", "notes"];
    for (const k of keep) if (k in a.p_session) session[k] = a.p_session[k];
    session.content_version = (session.content_version ?? 0) + 1;
    const oldSections = db.training_sections.filter((s) => s.training_session_id === session.id).map((s) => s.id);
    db.training_rows = db.training_rows.filter((r) => !oldSections.includes(r.section_id));
    db.training_sections = db.training_sections.filter((s) => s.training_session_id !== session.id);
    db.training_land_rows = db.training_land_rows.filter((r) => r.training_session_id !== session.id);
    db.training_warmup_land_rows = db.training_warmup_land_rows.filter((r) => r.training_session_id !== session.id);
    for (const s of a.p_sections ?? []) {
      const id = `sec${seq++}`;
      const { rows, ...rest } = s;
      db.training_sections.push({ ...rest, id, training_session_id: session.id });
      for (const r of rows ?? []) db.training_rows.push({ ...r, id: `row${seq++}`, section_id: id });
    }
    for (const r of a.p_land ?? []) db.training_land_rows.push({ ...r, id: `land${seq++}`, training_session_id: session.id });
    for (const r of a.p_warmup ?? []) db.training_warmup_land_rows.push({ ...r, id: `wu${seq++}`, training_session_id: session.id });
    writes.push(`RPC save_training_content ${session.id}`);
    return ok(session.content_version);
  }

  return { db, writes, faults: f, files, handle };
}
