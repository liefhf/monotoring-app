"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import Loader from "@/components/Loader";

/*
 * Frueher eine eigene Athletenseite fuer Athleten mit Login (Befinden,
 * Trainings-Rueckmeldungen, Belastung, Wachstum). Das steckt jetzt im
 * zentralen Athletenprofil unter "Befinden & Training".
 * Alte Links (Hinweise, Lesezeichen) mit der Login-ID werden hier auf
 * den verknuepften Athleten weitergeleitet.
 */
export default function LegacyAthleteRedirect() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    supabase
      .from("swimmers")
      .select("id")
      .eq("profile_id", params.id)
      .limit(1)
      .then(({ data }) => {
        const swimmer = (data ?? [])[0] as { id: string } | undefined;
        if (swimmer) router.replace(`/coach/schwimmer/${swimmer.id}?tab=befinden`);
        else setNotFound(true);
      });
  }, [params.id, router]);

  if (!notFound) return <Loader />;
  return (
    <main className="mx-auto max-w-xl py-10 text-center">
      <p className="font-semibold text-app-heading">Dieser Login ist mit keinem Athleten verknüpft.</p>
      <Link href="/coach/schwimmer" className="mt-3 inline-block text-app-accent-soft hover:underline">
        Zur Athletenliste
      </Link>
    </main>
  );
}
