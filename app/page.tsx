import Link from "next/link";

export default function Home() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-app-bg text-app-heading">
      <div className="text-center">
        <h1 className="text-4xl font-bold">
          Monitoring App
        </h1>

        <p className="mt-4 text-app-muted">
          Sport Performance Dashboard
        </p>

        <Link
          href="/login"
          className="mt-8 inline-block rounded-xl bg-app-accent px-5 py-3 font-semibold text-app-accent-ink transition hover:brightness-110"
        >
          Anmelden
        </Link>
      </div>
    </main>
  );
}