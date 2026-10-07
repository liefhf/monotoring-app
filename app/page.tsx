"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { DEMO } from "@/lib/demo/demoFetch";
import { LogoMark } from "@/components/Logo";
import ThemeToggle from "@/components/ThemeToggle";

/*
 * Startseite. Wer schon angemeldet ist, kommt direkt in seinen
 * Bereich (die RoleGuard im Coach-Bereich leitet Athleten weiter).
 */
export default function Home() {
  const router = useRouter();

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) router.replace("/coach");
    });
  }, [router]);

  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-app-bg px-6 text-center">
      <div className="absolute right-4 top-4">
        <ThemeToggle />
      </div>

      <LogoMark className="h-16 w-16" />
      <h1 className="mt-6 text-4xl font-bold sm:text-5xl">Monitoring App</h1>
      <p className="mt-3 max-w-md text-app-muted">
        Trainingsplanung, Leistungsentwicklung und Teamkommunikation für Schwimmvereine.
      </p>

      <Link
        href={DEMO ? "/demo" : "/login"}
        className="mt-8 inline-flex items-center rounded-xl bg-app-accent px-6 py-3 font-semibold text-app-accent-ink shadow-app transition hover:brightness-110"
      >
        Anmelden
      </Link>

      <svg
        viewBox="0 0 600 200"
        preserveAspectRatio="none"
        className="pointer-events-none absolute inset-x-0 bottom-0 h-40 w-full text-app-accent opacity-10"
        aria-hidden="true"
      >
        <path d="M0 80 Q 75 40 150 80 T 300 80 T 450 80 T 600 80 V200 H0Z" fill="currentColor" />
        <path d="M0 120 Q 75 90 150 120 T 300 120 T 450 120 T 600 120 V200 H0Z" fill="currentColor" opacity="0.6" />
      </svg>
    </main>
  );
}
