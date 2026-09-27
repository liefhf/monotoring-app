import Link from "next/link";

const infoPages = [
  {
    title: "Diagnostik und Trainingswissenschaften",
    href: "/coach/infoboard/diagnostik-trainingswissenschaften",
  },
  {
    title: "Leistungssteuerung",
    href: "/coach/infoboard/leistungssteuerung",
  },
  {
    title: "Sportmedizinische Grundlagen",
    href: "/coach/infoboard/sportmedizinische-grundlagen",
  },
  {
    title: "Sportpädagogik und Gesundheitspsychologie",
    href: "/coach/infoboard/sportpaedagogik-gesundheitspsychologie",
  },
  {
    title: "Training und Diagnostik Ausdauer",
    href: "/coach/infoboard/training-diagnostik-ausdauer",
  },
  {
    title: "Verbands- und Vereinsmanagement",
    href: "/coach/infoboard/verbands-vereinsmanagement",
  },
  {
    title: "Angewandte Sportpsychologie",
    href: "/coach/infoboard/angewandte-sportpsychologie",
  },
  {
    title: "Sporternährung",
    href: "/coach/infoboard/sporternaehrung",
  },
  {
    title: "Training und Diagnostik Kraft",
    href: "/coach/infoboard/training-diagnostik-kraft",
  },
  {
    title: "Biomechanik",
    href: "/coach/infoboard/biomechanik",
  },
  {
    title: "Training und Diagnostik Schnelligkeit",
    href: "/coach/infoboard/training-diagnostik-schnelligkeit",
  },
  {
    title: "Wissenschaftliches Arbeiten",
    href: "/coach/infoboard/wissenschaftliches-arbeiten",
  },
  {
    title: "Management und Coaching",
    href: "/coach/infoboard/management-coaching",
  },
  {
    title: "Monitoring, Datenmanagement und Regeneration",
    href: "/coach/infoboard/monitoring-datenmanagement-regeneration",
  },
  {
    title: "Rechtliche und gesellschaftliche Rahmenbedingungen im Sport",
    href: "/coach/infoboard/rechtliche-gesellschaftliche-rahmenbedingungen",
  },
  {
    title: "Talententwicklung",
    href: "/coach/infoboard/talententwicklung",
  },
  {
    title: "Evidenzbasierte Praxis im Sport",
    href: "/coach/infoboard/evidenzbasierte-praxis",
  },
  {
    title: "Training und Diagnostik - Technik und Koordination",
    href: "/coach/infoboard/training-diagnostik-technik-koordination",
  },
  {
    title: "Wettkampfanalyse und Wettkampfsteuerung",
    href: "/coach/infoboard/wettkampfanalyse-wettkampfsteuerung",
  },
];

export default function InfoboardPage() {
  return (
    <main>
      <div className="mx-auto max-w-7xl">
        <div>
          <p className="text-sm text-app-muted">
            Coach Bereich
          </p>

          <h1 className="mt-1 text-3xl font-bold">
            Infoboard
          </h1>

          <p className="mt-2 text-app-muted">
            Informationen und Nachschlagewerk für den Trainer.
          </p>
        </div>

        <section className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {infoPages.map((page) => (
            <Link
              key={page.href}
              href={page.href}
              className="rounded-2xl border border-app-border bg-app-surface p-5 transition hover:border-app-border hover:bg-app-elevated"
            >
              <h2 className="text-lg font-semibold leading-6">
                {page.title}
              </h2>

              <p className="mt-3 text-sm font-medium text-app-heading">
                Öffnen →
              </p>
            </Link>
          ))}
        </section>

        <div className="mt-8">
          <Link
            href="/coach"
            className="inline-block rounded-xl border border-app-border px-4 py-3 text-sm hover:bg-app-elevated"
          >
            ← Zurück zum Coach-Bereich
          </Link>
        </div>
      </div>
    </main>
  );
}