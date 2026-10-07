"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { LogoMark } from "@/components/Logo";
import ThemeToggle from "@/components/ThemeToggle";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const [loading, setLoading] = useState(false);
  const [magicLinkLoading, setMagicLinkLoading] = useState(false);

  async function redirectUser(userId: string) {
    const { data: profile, error: profileError } = await supabase
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
      router.push("/coach");
      router.refresh();
      return;
    }

    if (profile.role === "athlete") {
      router.push("/athlete");
      router.refresh();
      return;
    }

    setErrorMessage("Unbekannte Benutzerrolle.");
  }

  async function handleLogin(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setLoading(true);
    setErrorMessage("");
    setSuccessMessage("");

    const { data, error } =
      await supabase.auth.signInWithPassword({
        email,
        password,
      });

    if (error) {
      setErrorMessage(error.message);
      setLoading(false);
      return;
    }

    if (!data.user) {
      setErrorMessage(
        "Benutzer konnte nicht geladen werden."
      );
      setLoading(false);
      return;
    }

    await redirectUser(data.user.id);

    setLoading(false);
  }

  async function handleMagicLink() {
    setErrorMessage("");
    setSuccessMessage("");

    if (!email.trim()) {
      setErrorMessage(
        "Bitte gib zuerst deine E-Mail-Adresse ein."
      );
      return;
    }

    setMagicLinkLoading(true);

    const redirectUrl =
      `${window.location.origin}/auth/callback`;

    const { error } =
      await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: {
          emailRedirectTo: redirectUrl,
        },
      });

    if (error) {
      setErrorMessage(error.message);
      setMagicLinkLoading(false);
      return;
    }

    setSuccessMessage(
      "Magic Link wurde gesendet. Öffne jetzt deine E-Mail und klicke auf den Link."
    );

    setMagicLinkLoading(false);
  }

  return (
    <main className="grid min-h-screen bg-app-bg text-app-text lg:grid-cols-[1.1fr_1fr]">
      {/* Linke Seite: Marke und kurze Beschreibung (nur auf grossen Bildschirmen) */}
      <section className="relative hidden overflow-hidden bg-app-accent text-app-accent-ink lg:flex lg:flex-col lg:justify-between lg:p-12">
        <div className="flex items-center gap-3">
          <LogoMark className="h-11 w-11 bg-app-accent-ink/15 text-app-accent-ink" />
          <span className="text-lg font-bold">Monitoring App</span>
        </div>

        <div className="relative z-10 max-w-md">
          <h1 className="text-4xl font-bold leading-tight text-app-accent-ink">
            Training planen. Leistung verstehen. Team verbinden.
          </h1>
          <ul className="mt-8 space-y-3 text-base opacity-90">
            <li>✓ Trainingsplanung von der Saison bis zur Einheit</li>
            <li>✓ Bestzeiten, Pflichtzeiten und Entwicklung</li>
            <li>✓ Kalender, News und Gruppenräume fürs Team</li>
          </ul>
        </div>

        {/* Wellen als Hintergrund-Deko */}
        <svg
          viewBox="0 0 600 200"
          preserveAspectRatio="none"
          className="pointer-events-none absolute inset-x-0 bottom-0 h-48 w-full opacity-20"
          aria-hidden="true"
        >
          <path d="M0 80 Q 75 40 150 80 T 300 80 T 450 80 T 600 80 V200 H0Z" fill="currentColor" />
          <path d="M0 120 Q 75 90 150 120 T 300 120 T 450 120 T 600 120 V200 H0Z" fill="currentColor" opacity="0.6" />
        </svg>
      </section>

      {/* Rechte Seite: Anmeldung */}
      <section className="flex items-center justify-center px-4 py-10 sm:px-8">
        <div className="w-full max-w-md">
          <div className="mb-8 flex items-center justify-between lg:hidden">
            <div className="flex items-center gap-3">
              <LogoMark />
              <span className="text-lg font-bold text-app-heading">Monitoring App</span>
            </div>
            <ThemeToggle />
          </div>

          <div className="rounded-[20px] border border-app-border bg-app-surface p-6 shadow-app sm:p-8">
            <div className="mb-7 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold">Willkommen zurück</h2>
                <p className="mt-1 text-sm text-app-muted">Melde dich mit deinem Benutzerkonto an.</p>
              </div>
              <ThemeToggle className="hidden lg:flex" />
            </div>

            <form onSubmit={handleLogin} className="space-y-5">
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-app-text">E-Mail</span>
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                  autoComplete="email"
                  placeholder="name@beispiel.de"
                  className="w-full rounded-xl border border-app-border bg-app-bg px-4 py-3 outline-none transition focus:border-app-accent"
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-medium text-app-text">Passwort</span>
                <input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  autoComplete="current-password"
                  placeholder="Dein Passwort"
                  className="w-full rounded-xl border border-app-border bg-app-bg px-4 py-3 outline-none transition focus:border-app-accent"
                />
              </label>

              {errorMessage && (
                <div className="rounded-xl border border-app-bad/40 bg-app-bad/10 p-4 text-sm text-app-bad">
                  {errorMessage}
                </div>
              )}

              {successMessage && (
                <div className="rounded-xl border border-app-good/40 bg-app-good/10 p-4 text-sm text-app-good">
                  {successMessage}
                </div>
              )}

              <button
                type="submit"
                disabled={loading || !password}
                className="w-full rounded-xl bg-app-accent px-4 py-3 font-semibold text-app-accent-ink shadow-app transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? "Anmeldung läuft..." : "Mit Passwort anmelden"}
              </button>
            </form>

            <div className="my-6 flex items-center gap-3">
              <div className="h-px flex-1 bg-app-border" />
              <span className="text-xs text-app-faint">oder</span>
              <div className="h-px flex-1 bg-app-border" />
            </div>

            <button
              type="button"
              onClick={handleMagicLink}
              disabled={magicLinkLoading}
              className="w-full rounded-xl border border-app-border px-4 py-3 font-medium text-app-heading transition hover:bg-app-elevated disabled:cursor-not-allowed disabled:opacity-50"
            >
              {magicLinkLoading ? "Magic Link wird gesendet..." : "Magic Link per E-Mail senden"}
            </button>
          </div>

          <p className="mt-6 text-center text-xs leading-5 text-app-faint">
            Nach der Anmeldung wirst du automatisch in deinen Coach- oder Athletenbereich weitergeleitet.
          </p>
        </div>
      </section>
    </main>
  );
}
