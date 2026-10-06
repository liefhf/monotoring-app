import Link from "next/link";

const sections = [
  {
    number: "1",
    title: "Einführung",
    href: "/coach/infoboard/sportpaedagogik-gesundheitspsychologie/einfuehrung",
  },
  {
    number: "2",
    title: "Allgemeine Sportdidaktik",
    href: "/coach/infoboard/sportpaedagogik-gesundheitspsychologie/sportdidaktik",
  },
  {
    number: "3",
    title: "Anwendungsorientiertes Arbeiten",
    href: "/coach/infoboard/sportpaedagogik-gesundheitspsychologie/anwendungsorientiertes-arbeiten",
  },
  {
    number: "4",
    title: "Einführung in die Psychologie",
    href: "/coach/infoboard/sportpaedagogik-gesundheitspsychologie/psychologie",
  },
  {
    number: "5",
    title: "Strukturen und Prozesse des psychischen Systems",
    href: "/coach/infoboard/sportpaedagogik-gesundheitspsychologie/psychisches-system",
  },
  {
    number: "6",
    title: "Modelle und Theorien der Gesundheitspsychologie",
    href: "/coach/infoboard/sportpaedagogik-gesundheitspsychologie/gesundheitspsychologie",
  },
  {
    number: "7",
    title: "Stress und Gesundheit",
    href: "/coach/infoboard/sportpaedagogik-gesundheitspsychologie/stress-gesundheit",
  },
];

export default function SportpaedagogikGesundheitspsychologiePage() {
  return (
    <main>
      <div className="mx-auto max-w-6xl">
        <header>
          <p className="text-sm text-app-muted">
            Infoboard
          </p>

          <h1 className="mt-1 text-3xl font-bold">
            Sportpädagogik und Gesundheitspsychologie
          </h1>
        </header>

        <section className="mt-8 grid gap-3 md:grid-cols-2">
          {sections.map((section) => (
            <Link
              key={section.number}
              href={section.href}
              className="group rounded-xl border border-app-border bg-app-surface p-4 transition hover:border-app-border hover:bg-app-elevated"
            >
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-app-border bg-app-bg text-sm font-bold text-app-text">
                  {section.number}
                </div>

                <div className="min-w-0 flex-1">
                  <h2 className="text-base font-semibold leading-6">
                    {section.title}
                  </h2>

                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-xs font-medium text-app-muted transition group-hover:text-app-heading">
                      Öffnen
                    </span>

                    <span className="text-sm text-app-faint transition group-hover:translate-x-1 group-hover:text-app-heading">
                      →
                    </span>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </section>

        <div className="mt-8">
          <Link
            href="/coach/infoboard"
            className="inline-block rounded-xl border border-app-border px-4 py-3 text-sm hover:bg-app-elevated"
          >
            ← Zurück zum Infoboard
          </Link>
        </div>
      </div>
    </main>
  );
}