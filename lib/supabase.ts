import { createClient } from "@supabase/supabase-js";
import { trackedFetch } from "@/lib/loadingTracker";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/* trackedFetch: Ladebalken oben laeuft, solange Daten geladen werden */
export const supabase = createClient(supabaseUrl, supabaseAnonKey, { global: { fetch: trackedFetch } });
