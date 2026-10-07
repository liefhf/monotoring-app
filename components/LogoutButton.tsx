"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { DEMO } from "@/lib/demo/demoFetch";

type LogoutButtonProps = {
  className?: string;
};

export default function LogoutButton({
  className = "",
}: LogoutButtonProps) {
  const router = useRouter();

  const [loading, setLoading] = useState(false);

  async function handleLogout() {
    setLoading(true);

    /*
     * signOut() meldet den Benutzer normalerweise
     * auch auf dem Supabase-Server ab. Wenn gerade
     * keine Verbindung besteht - am Beckenrand
     * durchaus moeglich - schlaegt das fehl und die
     * Sitzung bliebe im Browser bestehen.
     *
     * Deshalb wird in diesem Fall zusaetzlich lokal
     * abgemeldet. Die Sitzung im Browser ist damit
     * in jedem Fall geloescht.
     */
    const { error } = await supabase.auth.signOut();

    if (error) {
      await supabase.auth.signOut({
        scope: "local",
      });
    }

    router.replace(DEMO ? "/demo" : "/login");
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      disabled={loading}
      className={`inline-flex min-h-11 items-center justify-center whitespace-nowrap rounded-lg border border-app-border px-3 py-1.5 text-sm font-medium text-app-text transition hover:bg-app-elevated hover:text-app-heading disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
    >
      {loading ? "Wird abgemeldet..." : "Abmelden"}
    </button>
  );
}