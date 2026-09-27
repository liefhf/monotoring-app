"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function TestSupabasePage() {
  const [status, setStatus] = useState("Teste Verbindung...");

  useEffect(() => {
    async function testConnection() {
      const { error } = await supabase.auth.getSession();

      if (error) {
        setStatus(`Fehler: ${error.message}`);
        return;
      }

      setStatus("Supabase-Verbindung funktioniert ✅");
    }

    testConnection();
  }, []);

  return (
    <main className="min-h-screen bg-app-bg p-10 text-app-heading">
      <div className="mx-auto max-w-2xl rounded-2xl border border-app-border bg-app-surface p-6">
        <h1 className="text-2xl font-bold">
          Supabase Verbindungstest
        </h1>

        <p className="mt-4 text-app-text">
          {status}
        </p>
      </div>
    </main>
  );
}