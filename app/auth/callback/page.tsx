"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function AuthCallbackPage() {
  const router = useRouter();

  const [errorMessage, setErrorMessage] =
    useState("");

  useEffect(() => {
    async function finishLogin() {
      const query =
        new URLSearchParams(
          window.location.search
        );

      const hash =
        new URLSearchParams(
          window.location.hash.replace(
            /^#/,
            ""
          )
        );

      /*
       * Supabase haengt Fehler entweder an die
       * Adresse (?error=...) oder hinter die
       * Raute (#error=...). Beides pruefen.
       */
      const linkError =
        query.get("error_description") ??
        hash.get("error_description") ??
        query.get("error") ??
        hash.get("error");

      if (linkError) {
        setErrorMessage(linkError);
        return;
      }

      /*
       * Variante 1: Supabase schickt einen Code
       * in der Adresse. Der wird hier gegen eine
       * Sitzung getauscht.
       */
      const code = query.get("code");

      if (code) {
        const { error } =
          await supabase.auth.exchangeCodeForSession(
            code
          );

        if (error) {
          setErrorMessage(error.message);
          return;
        }
      }

      /*
       * Variante 2: Supabase schickt die Sitzung
       * direkt hinter der Raute. Der Supabase-Client
       * liest sie beim Laden selbst aus. Das dauert
       * einen kurzen Moment, deshalb wird hier
       * mehrfach nachgesehen.
       */
      let userId: string | null = null;

      for (
        let attempt = 0;
        attempt < 15;
        attempt++
      ) {
        const { data } =
          await supabase.auth.getSession();

        if (data.session?.user) {
          userId = data.session.user.id;
          break;
        }

        await new Promise((resolve) =>
          setTimeout(resolve, 200)
        );
      }

      if (!userId) {
        setErrorMessage(
          "Der Anmeldelink ist abgelaufen oder wurde bereits verwendet."
        );
        return;
      }

      const {
        data: profile,
        error: profileError,
      } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", userId)
        .single();

      if (profileError || !profile) {
        setErrorMessage(
          "Benutzerprofil konnte nicht geladen werden."
        );
        return;
      }

      if (profile.role === "coach") {
        router.replace("/coach");
        return;
      }

      if (profile.role === "athlete") {
        router.replace("/athlete");
        return;
      }

      setErrorMessage(
        "Unbekannte Benutzerrolle."
      );
    }

    finishLogin();
  }, [router]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-app-bg px-6 text-app-text">
      <div className="w-full max-w-md rounded-3xl border border-app-border bg-app-surface shadow-app p-8 text-center">
        <h1 className="text-2xl font-bold">
          Monitoring App
        </h1>

        {errorMessage ? (
          <>
            <div className="mt-6 rounded-xl border border-app-bad/40 bg-app-bad/10 p-4 text-sm text-app-bad">
              {errorMessage}
            </div>

            <Link
              href="/login"
              className="mt-6 inline-block rounded-xl bg-app-accent px-5 py-3 font-medium text-app-accent-ink transition hover:brightness-110"
            >
              Zurück zur Anmeldung
            </Link>
          </>
        ) : (
          <p className="mt-4 text-sm text-app-muted">
            Anmeldung wird abgeschlossen...
          </p>
        )}
      </div>
    </main>
  );
}
