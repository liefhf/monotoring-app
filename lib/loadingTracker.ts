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

export const trackedFetch: typeof fetch = async (...args) => {
  pending++;
  emit();
  try {
    return await fetch(...args);
  } finally {
    pending--;
    emit();
  }
};
