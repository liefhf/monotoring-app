import Link from "next/link";

export default function Home() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
      <div className="text-center">
        <h1 className="text-4xl font-bold">
          Monitoring App
        </h1>

        <p className="mt-4 text-slate-400">
          Sport Performance Dashboard
        </p>

        <Link
          href="/login"
          className="mt-8 inline-block rounded-xl bg-white px-5 py-3 font-semibold text-slate-950 transition hover:bg-slate-200"
        >
          Anmelden
        </Link>
      </div>
    </main>
  );
}