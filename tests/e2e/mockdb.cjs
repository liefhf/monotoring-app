/*
 * Nachgebaute Supabase-Schnittstelle fuer Browser-Tests (KEINE echte DB).
 * - Daten liegen im Speicher; Schreibvorgaenge veraendern sie wirklich,
 *   damit "nach dem Neuladen noch da" pruefbar ist.
 * - Fehler gezielt ausloesen: fehlende Tabelle, Abfragefehler,
 *   Schreibfehler, 0 betroffene Zeilen (wie RLS), verzoegerte Antworten.
 * Filter: eq, neq, in, gte, gt, lte, lt, is, not.is, or (grob), order, limit, range.
 */
const DAY = 864e5;
const pad = (n) => String(n).padStart(2, "0");
const key = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const ago = (n, now = new Date()) => key(new Date(now.getTime() - n * DAY));

const COACH = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
const ATH = "cccccccc-cccc-cccc-cccc-cccccccccccc";

function seed(now = new Date()) {
  const today = key(now);
  const long = "Maximiliane-Charlotte von Hohenstein-Waldburg";
  return {
    profiles: [
      { id: COACH, role: "coach", first_name: "Sabine", last_name: "K" },
      { id: ATH, role: "athlete", first_name: "Mia", last_name: "Schulz" },
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
    swimmers: [
      { id: "w1", first_name: "Mia", last_name: "Schulz", birth_year: 2013, gender: "female", profile_id: ATH, coach_id: COACH },
      { id: "w2", first_name: "Ben", last_name: "Thiel", birth_year: 2012, gender: "male", profile_id: null, coach_id: COACH },
      { id: "w3", first_name: long.split(" ")[0], last_name: long.split(" ").slice(1).join(" "), birth_year: 2012, gender: "female", profile_id: "dddddddd-0000-0000-0000-000000000000", coach_id: COACH },
      { id: "w4", first_name: "Olaf", last_name: "Master", birth_year: 1970, gender: "male", profile_id: null, coach_id: COACH },
    ],
    training_sessions: [
      { id: "s0", title: "Frühtraining", session_date: today, start_time: "06:00:00", total_meters: 2500, duration_minutes: 60, team_id: "t1", coach_id: COACH, training_type: "water", planned_rpe: 4 },
      { id: "s1", title: "GA1 Kraul", session_date: today, start_time: "23:00:00", total_meters: 4200, duration_minutes: 90, team_id: "t1", coach_id: COACH, training_type: "water", planned_rpe: 5 },
      { id: "s2", title: "Technik Rücken", session_date: ago(-2, now), start_time: "16:30:00", total_meters: 3000, duration_minutes: 90, team_id: "t1", coach_id: COACH, training_type: "water", planned_rpe: 4 },
      { id: "s3", title: "Gestern Ausdauer", session_date: ago(1, now), start_time: "17:00:00", total_meters: 3800, duration_minutes: 90, team_id: "t1", coach_id: COACH, training_type: "water", planned_rpe: 6 },
      { id: "s4", title: "Masters Abend", session_date: today, start_time: "20:00:00", total_meters: 2000, duration_minutes: 60, team_id: "t2", coach_id: COACH, training_type: "water", planned_rpe: 4 },
    ],
    training_sections: [{ id: "sec1", training_session_id: "s1", section_key: "a", section_name: "Hauptteil", practice_mode: "einzeln", sort_order: 0 }],
    training_rows: [{ id: "row1", section_id: "sec1", repetitions: 8, distance: 200, exercise: null, style: "Kraul", materials: [], zone: "GA1", interval_type: "@", interval_time: "3:00", sort_order: 0 }],
    training_land_rows: [],
    training_warmup_land_rows: [],
    training_attendance: [{ id: "att1", training_session_id: "s3", swimmer_id: "w1", status: "anwesend", note: null }],
    training_feedback: [],
    health_events: [
      { id: "h1", swimmer_id: "w1", kind: "verletzung", title: "Schulter rechts", body_region: "Schulter", availability: "pause", restriction: null, start_date: ago(3, now), end_date: null, clearance: "offen", note: "Physio Do", visible_to_athlete: true },
    ],
    befinden_entries: [0, 1, 2].map((d) => ({ id: "b" + d, athlete_id: ATH, entry_date: ago(d + 1, now), sleep_quality: 4, energy: 4, muscle_feeling: 4, stress: 5, mood: 5, sleep_hours: 6.5, has_pain: true, pain_area: "Schulter", comment: null })),
    pain_reports: [{ id: "p1", athlete_id: ATH, created_at: now.toISOString(), pain_level: 6, spot_label: "Schulter rechts", body_region: "Schulter" }],
    swimmer_results: [
      { id: "r1", swimmer_id: "w1", kind: "einzel", result_date: ago(60, now), pool_length: 25, distance: 100, stroke: "backstroke", time_ms: 73000, is_split: false },
      { id: "r2", swimmer_id: "w1", kind: "einzel", result_date: ago(2, now), pool_length: 25, distance: 100, stroke: "backstroke", time_ms: 71800, is_split: false },
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

function matches(row, k, v) {
  if (!(k in row) && !k.startsWith("or")) return true; // Spalte unbekannt -> nicht filtern
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
    case "in": return arg.replace(/^\(|\)$/g, "").split(",").map((x) => x.replace(/^"|"$/g, "")).includes(s);
    case "not": return !matches(row, k, arg);
    default: return true;
  }
}

function select(rows, params) {
  let out = rows.slice();
  for (const [k, v] of params) {
    if (["select", "order", "limit", "offset", "on_conflict", "columns"].includes(k)) continue;
    if (k === "or") continue; // grob: or-Filter ignorieren
    out = out.filter((row) => matches(row, k, v));
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

/*
 * faults: { missing: Set<table>, readError: Set<table>, writeError: Set<table>,
 *           zeroRows: Set<table>, delay: {table: ms}, storageError: Set<'upload'|'remove'|'sign'> }
 */
function createMock({ now = new Date(), faults = {} } = {}) {
  const db = seed(now);
  const writes = [];
  const f = { missing: new Set(), readError: new Set(), writeError: new Set(), zeroRows: new Set(), delay: {}, storageError: new Set(), ...faults };
  const files = new Set(["w1/1-attest.pdf"]);
  let seq = 1;

  async function handle(route, uid) {
    const req = route.request();
    const url = new URL(req.url());
    const method = req.method();
    const single = (req.headers()["accept"] || "").includes("vnd.pgrst.object");
    const path = url.pathname;

    if (path.includes("/auth/v1/user")) return route.fulfill({ json: { id: uid, aud: "authenticated", role: "authenticated", email: "t@t.de" } });

    if (path.includes("/storage/v1/")) {
      const op = path.includes("/sign/") ? "sign" : method === "DELETE" ? "remove" : method === "POST" && path.includes("/object/athlete-documents/") ? "upload" : "other";
      writes.push(`STORAGE ${op} ${path}`);
      if (f.storageError.has(op)) return route.fulfill({ status: 500, json: { message: "storage down" } });
      if (op === "upload") { files.add(decodeURIComponent(path.split("/object/athlete-documents/")[1])); return route.fulfill({ json: { Key: "x" } }); }
      if (op === "remove") return route.fulfill({ json: [] });
      if (op === "sign") {
        const name = decodeURIComponent(path.split("/sign/athlete-documents/")[1] || "");
        if (!files.has(name)) return route.fulfill({ status: 400, json: { statusCode: "404", error: "not_found", message: "Object not found" } });
        return route.fulfill({ json: { signedURL: "/x" } });
      }
      return route.fulfill({ json: {} });
    }

    if (path.includes("/rest/v1/rpc/")) {
      const fn = path.split("/").pop();
      const rpc = { my_results: () => db.swimmer_results.filter((r) => r.swimmer_id === "w1"), my_teams: () => db.teams.map((t) => ({ id: t.id, name: t.name, is_coach: true })), my_swimmer: () => db.swimmers[0] };
      return route.fulfill({ json: (rpc[fn] || (() => []))() });
    }

    const table = path.split("/").pop();
    if (f.delay[table]) await new Promise((r) => setTimeout(r, f.delay[table]));
    if (f.missing.has(table)) return route.fulfill({ status: 404, json: { code: "PGRST205", message: `Could not find the table 'public.${table}'` } });

    if (method === "GET" || method === "HEAD") {
      if (f.readError.has(table)) return route.fulfill({ status: 500, json: { code: "XX000", message: "read failed" } });
      let rows = select(db[table] || [], url.searchParams);
      if (table === "profiles" && uid === ATH) rows = rows.filter((r) => r.id === ATH);
      // wie RLS: Athletin sieht nur Einheiten ihres Teams
      if (table === "training_sessions" && uid === ATH) rows = rows.filter((r) => r.team_id === "t1");
      if (single) return rows.length ? route.fulfill({ json: rows[0] }) : route.fulfill({ status: 406, json: { code: "PGRST116", message: "0 rows" } });
      return route.fulfill({ json: rows });
    }

    const body = req.postData() ? JSON.parse(req.postData()) : null;
    writes.push(`${method} ${table} ${JSON.stringify(body)?.slice(0, 200) ?? ""}`);
    if (f.writeError.has(table)) return route.fulfill({ status: 500, json: { code: "XX000", message: "write failed" } });
    db[table] = db[table] || [];
    let affected = [];
    if (method === "POST") {
      const list = Array.isArray(body) ? body : [body];
      const conflict = url.searchParams.get("on_conflict");
      for (const item of list) {
        const existing = conflict ? db[table].find((r) => conflict.split(",").every((c) => String(r[c]) === String(item[c]))) : null;
        if (existing) { Object.assign(existing, item); affected.push(existing); }
        else { const row = { id: `new${seq++}`, created_at: new Date().toISOString(), ...item }; db[table].push(row); affected.push(row); }
      }
    } else {
      const targets = select(db[table], url.searchParams);
      if (!f.zeroRows.has(table)) {
        if (method === "PATCH") targets.forEach((r) => Object.assign(r, body));
        if (method === "DELETE") db[table] = db[table].filter((r) => !targets.includes(r));
        affected = targets;
      }
    }
    if (single) return affected[0] ? route.fulfill({ status: 201, json: affected[0] }) : route.fulfill({ status: 406, json: { code: "PGRST116" } });
    return route.fulfill({ status: 201, json: affected });
  }

  return { db, writes, faults: f, files, handle };
}

module.exports = { createMock, COACH, ATH, ago, key };
