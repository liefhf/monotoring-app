"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

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
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-6 text-white">
      <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-8">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold">
            Monitoring App
          </h1>

          <p className="mt-2 text-sm text-slate-400">
            Melde dich mit deinem Benutzerkonto an.
          </p>
        </div>

        <form
          onSubmit={handleLogin}
          className="space-y-5"
        >
          <div>
            <label className="mb-2 block text-sm text-slate-400">
              E-Mail
            </label>

            <input
              type="email"
              value={email}
              onChange={(event) =>
                setEmail(event.target.value)
              }
              required
              placeholder="name@beispiel.de"
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none focus:border-slate-500"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm text-slate-400">
              Passwort
            </label>

            <input
              type="password"
              value={password}
              onChange={(event) =>
                setPassword(event.target.value)
              }
              placeholder="Dein Passwort"
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none focus:border-slate-500"
            />
          </div>

          {errorMessage && (
            <div className="rounded-xl border border-red-900 bg-red-950 p-4 text-sm text-red-300">
              {errorMessage}
            </div>
          )}

          {successMessage && (
            <div className="rounded-xl border border-emerald-900 bg-emerald-950 p-4 text-sm text-emerald-300">
              {successMessage}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !password}
            className="w-full rounded-xl bg-white px-4 py-3 font-medium text-slate-950 transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading
              ? "Anmeldung läuft..."
              : "Mit Passwort anmelden"}
          </button>
        </form>

        <div className="my-6 flex items-center gap-3">
          <div className="h-px flex-1 bg-slate-800" />

          <span className="text-xs text-slate-500">
            oder
          </span>

          <div className="h-px flex-1 bg-slate-800" />
        </div>

        <button
          type="button"
          onClick={handleMagicLink}
          disabled={magicLinkLoading}
          className="w-full rounded-xl border border-slate-700 px-4 py-3 font-medium transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {magicLinkLoading
            ? "Magic Link wird gesendet..."
            : "Magic Link per E-Mail senden"}
        </button>

        <div className="mt-6 border-t border-slate-800 pt-5">
          <p className="text-center text-xs leading-5 text-slate-500">
            Nach der Anmeldung wirst du automatisch in deinen
            Coach- oder Athlete-Bereich weitergeleitet.
          </p>
        </div>
      </div>
    </main>
  );
}