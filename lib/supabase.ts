import { createClient } from "@supabase/supabase-js";
import { tracked, trackedFetch } from "@/lib/loadingTracker";
import { DEMO, DEMO_URL, demoFetch } from "@/lib/demo/demoFetch";

const supabaseUrl = DEMO ? DEMO_URL : process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = DEMO ? "demo" : process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/*
 * trackedFetch: Ladebalken oben laeuft, solange Daten geladen werden.
 * Demo-Modus: Antworten kommen aus Testdaten im Browser (lib/demo).
 */
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  global: { fetch: DEMO ? tracked(demoFetch) : trackedFetch },
});

export { isMissingTable } from "@/lib/supabase-codes";
