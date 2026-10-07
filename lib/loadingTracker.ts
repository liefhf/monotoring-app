/*
 * Zaehlt laufende Ladeanfragen (Supabase) fuer den Ladebalken oben.
 */
type Listener = (pending: number) => void;
let pending = 0;
const listeners = new Set<Listener>();

const emit = () => listeners.forEach((listener) => listener(pending));

export function subscribeLoading(listener: Listener) {
  listeners.add(listener);
  listener(pending);
  return () => {
    listeners.delete(listener);
  };
}

/* beliebige fetch-Funktion mit Ladebalken versehen (Demo nutzt eigene) */
export const tracked =
  (fetcher: typeof fetch): typeof fetch =>
  async (...args) => {
    pending++;
    emit();
    try {
      return await fetcher(...args);
    } finally {
      pending--;
      emit();
    }
  };

export const trackedFetch: typeof fetch = tracked((...args) => fetch(...args));
