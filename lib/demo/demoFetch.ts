/*
 * Demo-Modus (NEXT_PUBLIC_DEMO=1): alle Supabase-Anfragen werden im Browser
 * mit Testdaten beantwortet (lib/demo/mockApi.ts). Keine echte Datenbank,
 * keine echten Daten. Aenderungen bleiben im Browser (localStorage) erhalten,
 * bis "Testdaten zuruecksetzen" gewaehlt wird.
 */
import { ATH, COACH, createMockApi, seed } from "@/lib/demo/mockApi";

export const DEMO = process.env.NEXT_PUBLIC_DEMO === "1";
export const DEMO_URL = "https://demo.invalid";
const DB_KEY = "monitoring-demo-db";
const ROLE_KEY = "monitoring-demo-role";
export const DEMO_AUTH_KEY = "sb-demo-auth-token";

export type DemoRole = "coach" | "athlete";

function read<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

let api: ReturnType<typeof createMockApi> | null = null;
function getApi() {
  if (!api) api = createMockApi({ db: read(DB_KEY) ?? seed(new Date()) });
  return api;
}

export function demoRole(): DemoRole | null {
  return read<DemoRole>(ROLE_KEY);
}

/* Rolle waehlen = "anmelden" in der Demo */
export function startDemo(role: DemoRole) {
  const user = { id: role === "coach" ? COACH : ATH, aud: "authenticated", role: "authenticated", email: "demo@demo.verein" };
  try {
    localStorage.setItem(ROLE_KEY, JSON.stringify(role));
    localStorage.setItem(DEMO_AUTH_KEY, JSON.stringify({ access_token: "demo", refresh_token: "demo", token_type: "bearer", expires_in: 3600, expires_at: 4102444800, user }));
  } catch {
    /* ohne Browser-Speicher laeuft die Demo nicht */
  }
}

export function resetDemo() {
  try {
    localStorage.removeItem(DB_KEY);
  } catch {
    /* egal */
  }
  api = null;
}

export async function demoFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const request = new Request(input, init);
  const role = demoRole();
  const uid = role === "athlete" ? ATH : COACH;
  const headers: Record<string, string> = {};
  request.headers.forEach((value, key) => (headers[key] = value));
  const body = request.method === "GET" || request.method === "HEAD" ? null : await request.text();
  const res = await getApi().handle({ method: request.method, url: request.url, headers, body: body || null }, uid);
  if (request.method !== "GET") {
    try {
      localStorage.setItem(DB_KEY, JSON.stringify(getApi().db));
    } catch {
      /* Aenderungen nur bis zum Neuladen */
    }
  }
  return new Response(res.status === 204 ? null : JSON.stringify(res.json), { status: res.status, headers: { "content-type": "application/json" } });
}
