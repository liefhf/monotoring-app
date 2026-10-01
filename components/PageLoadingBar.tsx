"use client";

import { useEffect, useState } from "react";

/*
 * Ladebalken oben am Bildschirmrand auf allen Seiten: sichtbar, solange
 * Daten geladen werden (offene fetch-Anfragen, z. B. an Supabase).
 * Erst nach kurzer Verzoegerung, damit schnelle Klicks nicht flackern.
 * Realtime-/Websocket-Verbindungen zaehlen nicht mit.
 */
export default function PageLoadingBar() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const original = window.fetch;
    let pending = 0;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const update = () => {
      if (pending > 0 && !timer) timer = setTimeout(() => setVisible(true), 150);
      if (pending === 0) {
        if (timer) clearTimeout(timer);
        timer = null;
        setVisible(false);
      }
    };

    window.fetch = async (...args) => {
      pending++;
      update();
      try {
        return await original.apply(window, args);
      } finally {
        pending--;
        update();
      }
    };

    return () => {
      window.fetch = original;
      if (timer) clearTimeout(timer);
    };
  }, []);

  if (!visible) return null;
  return (
    <div role="status" aria-label="Wird geladen" className="pointer-events-none fixed inset-x-0 top-0 z-[100] h-1 overflow-hidden bg-app-accent/15 print:hidden">
      <div
        className="absolute inset-y-0 left-0 w-2/5 rounded-full animate-[app-loader_1.2s_ease-in-out_infinite]"
        style={{ background: "linear-gradient(90deg, var(--app-accent-2), var(--app-accent))" }}
      />
    </div>
  );
}
