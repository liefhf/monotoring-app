import Image from "next/image";
import Link from "next/link";

function InfoBox({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-app-border bg-app-surface p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-app-faint">
        {title}
      </p>

      <div className="mt-1.5 leading-6 text-app-text">
        {children}
      </div>
    </div>
  );
}

function Figure({
  src,
  alt,
  caption,
}: {
  src: string;
  alt: string;
  caption: string;
}) {
  return (
    <figure className="mt-4 overflow-hidden rounded-2xl border border-app-border bg-app-accent p-3">
      <Image
        src={src}
        alt={alt}
        width={1200}
        height={800}
        className="h-auto w-full rounded-lg object-contain"
      />

      <figcaption className="px-2 pb-1 pt-3 text-xs text-app-faint">
        {caption}
      </figcaption>
    </figure>
  );
}

export default function EinfuehrungPage() {
  return (
    <main>
      <div className="mx-auto max-w-5xl">
        {/* KOPF */}

        <header>
          <p className="text-sm text-app-muted">
            Sportpädagogik und Gesundheitspsychologie
          </p>

          <h1 className="mt-1 text-3xl font-bold">
            1. Einführung
          </h1>
        </header>

        {/* LERNORIENTIERUNG */}

        <section className="mt-6 rounded-2xl border border-app-border bg-app-surface p-4">
          <h2 className="text-lg font-semibold">
            Lernorientierung
          </h2>

          <p className="mt-3 text-sm leading-6 text-app-text">
            Nach Bearbeitung dieses Kapitels solltest du:
          </p>

          <ul className="mt-3 list-disc space-y-1.5 pl-6 text-sm leading-6 text-app-text">
            <li>
              grundlegende Begriffe für das bewegungsbezogene Arbeitsfeld in{" "}
              <strong className="text-app-heading">
                Prävention und Rehabilitation
              </strong>{" "}
              definieren können,
            </li>

            <li>
              den Forschungsstand zum Zusammenhang von{" "}
              <strong className="text-app-heading">
                körperlicher Aktivität und Gesundheit
              </strong>{" "}
              wiedergeben können,
            </li>

            <li>
              Konzepte zum Zusammenhang von{" "}
              <strong className="text-app-heading">
                körperlicher Aktivität, Wohlbefinden und Gesundheit
              </strong>{" "}
              erläutern können,
            </li>

            <li>
              konzeptionelle Unterschiede von Bewegungsangeboten in{" "}
              <strong className="text-app-heading">
                Prävention und Rehabilitation
              </strong>{" "}
              benennen können.
            </li>
          </ul>
        </section>

        {/* INHALTSÜBERSICHT */}

        <nav className="mt-4 rounded-2xl border border-app-border bg-app-surface p-4">
          <p className="text-sm font-semibold text-app-text">
            Inhalt
          </p>

          <div className="mt-3 space-y-1 text-sm">
            <a
              href="#grundbegriffe"
              className="block rounded-lg px-3 py-2 text-app-text hover:bg-app-elevated hover:text-app-heading"
            >
              1.1 Grundlegende Begrifflichkeiten
            </a>

            <a
              href="#gesundheitssport"
              className="block rounded-lg px-6 py-2 text-app-muted hover:bg-app-elevated hover:text-app-heading"
            >
              Gesundheitssport
            </a>

            <a
              href="#rehabilitationssport"
              className="block rounded-lg px-6 py-2 text-app-muted hover:bg-app-elevated hover:text-app-heading"
            >
              Rehabilitationssport
            </a>

            <a
              href="#bewegungstherapie"
              className="block rounded-lg px-6 py-2 text-app-muted hover:bg-app-elevated hover:text-app-heading"
            >
              Bewegungstherapie
            </a>

            <a
              href="#forschungsstand"
              className="block rounded-lg px-3 py-2 text-app-text hover:bg-app-elevated hover:text-app-heading"
            >
              1.2 Körperliche Aktivität, Sport und Gesundheit: Stand der Forschung
            </a>

            <a
              href="#praevention"
              className="block rounded-lg px-3 py-2 text-app-text hover:bg-app-elevated hover:text-app-heading"
            >
              1.3 Körperliche Aktivität und Sport als Mittel in Prävention,
              Rehabilitation und Gesundheitsförderung
            </a>
          </div>
        </nav>

        {/* ===================================================== */}
        {/* 1.1 */}
        {/* ===================================================== */}

        <section
          id="grundbegriffe"
          className="mt-8 scroll-mt-8"
        >
          <h2 className="border-b border-app-border pb-3 text-2xl font-bold">
            1.1 Grundlegende Begrifflichkeiten
          </h2>

          <p className="mt-5 leading-6 text-app-text">
            Für eine zielgruppen- und handlungsfeldspezifische Arbeit im
            Gesundheits- und Rehabilitationssport müssen die Begriffe{" "}
            <strong className="text-app-heading">
              Bewegung, körperliche Aktivität, Sport, Fitness, Training,
              Üben und Entwicklung
            </strong>{" "}
            klar voneinander abgegrenzt werden.
          </p>

          <div className="mt-6 space-y-8 text-app-text">
            {/* BEWEGUNG */}

            <div>
              <h3 className="text-xl font-semibold text-app-heading">
                Bewegung und Fortbewegung
              </h3>

              <p className="mt-3 leading-6">
                <strong className="text-app-heading">
                  Bewegung
                </strong>{" "}
                kann sowohl passiv als auch aktiv erfolgen.
              </p>

              <ul className="mt-3 list-disc space-y-1.5 pl-6 leading-6">
                <li>
                  Passive Bewegung: z. B. Transport mit Auto oder Bahn.
                </li>

                <li>
                  Aktive Bewegung: durch eigene körperliche Aktivität.
                </li>

                <li>
                  <strong className="text-app-heading">
                    Fortbewegung
                  </strong>{" "}
                  bezeichnet die aktive Bewegung eines Individuums von Ort
                  zu Ort.
                </li>
              </ul>

              <p className="mt-4 font-medium text-app-heading">
                Beispiele für Fortbewegung:
              </p>

              <ul className="mt-2 grid list-disc gap-x-6 gap-y-1 pl-6 sm:grid-cols-2">
                <li>Laufen</li>
                <li>Gehen</li>
                <li>Klettern</li>
                <li>Hangeln</li>
                <li>Kriechen</li>
                <li>Schwimmen</li>
              </ul>

              <div className="mt-4">
                <InfoBox title="Merksatz">
                  Nicht jede Bewegung ist körperliche Aktivität. Bewegung
                  kann auch passiv erfolgen.
                </InfoBox>
              </div>
            </div>

            {/* BELASTUNG */}

            <div>
              <h3 className="text-xl font-semibold text-app-heading">
                Belastung und Beanspruchung
              </h3>

              <p className="mt-3 leading-6">
                Die Begriffe{" "}
                <strong className="text-app-heading">
                  Belastung
                </strong>{" "}
                und{" "}
                <strong className="text-app-heading">
                  Beanspruchung
                </strong>{" "}
                dürfen nicht synonym verwendet werden.
              </p>

              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <div className="rounded-xl border border-app-border bg-app-surface p-4">
                  <h4 className="text-lg font-semibold text-app-heading">
                    Belastung
                  </h4>

                  <p className="mt-2 leading-6">
                    Belastung bezeichnet eine von außen gestellte
                    Anforderung.
                  </p>

                  <p className="mt-3 font-medium text-app-heading">
                    Beispiele:
                  </p>

                  <ul className="mt-2 list-disc space-y-1 pl-6 leading-6">
                    <li>
                      10 Minuten Fahrradergometer bei 100 Watt
                    </li>

                    <li>
                      Bankdrücken mit 100 kg
                    </li>
                  </ul>

                  <p className="mt-3 font-semibold text-app-heading">
                    Belastung = extrinsischer Faktor
                  </p>
                </div>

                <div className="rounded-xl border border-app-border bg-app-surface p-4">
                  <h4 className="text-lg font-semibold text-app-heading">
                    Beanspruchung
                  </h4>

                  <p className="mt-2 leading-6">
                    Beanspruchung bezeichnet die individuelle innere
                    Reaktion des Körpers auf diese Belastung.
                  </p>

                  <ul className="mt-3 list-disc space-y-1 pl-6 leading-6">
                    <li>Alter</li>
                    <li>Geschlecht</li>
                    <li>Körpergewicht</li>
                    <li>Trainingszustand</li>
                    <li>Begleiterkrankungen</li>
                  </ul>
                </div>
              </div>

              <p className="mt-4 leading-6">
                Bei zwei Personen kann die äußere Belastung gleich sein,
                die innere Beanspruchung jedoch deutlich unterschiedlich
                ausfallen.
              </p>

              <div className="mt-4">
                <InfoBox title="Merksatz">
                  <strong>Belastung = äußere Anforderung</strong>
                  <br />
                  <strong>
                    Beanspruchung = innere Reaktion auf diese Anforderung
                  </strong>
                </InfoBox>
              </div>
            </div>

            {/* KÖRPERLICHE AKTIVITÄT */}

            <div>
              <h3 className="text-xl font-semibold text-app-heading">
                Körperliche Aktivität
              </h3>

              <p className="mt-3 leading-6">
                <strong className="text-app-heading">
                  Körperliche Aktivität
                </strong>{" "}
                ist der konzeptionelle Oberbegriff für alle
                Körperbewegungen, die:
              </p>

              <ul className="mt-3 list-disc space-y-1.5 pl-6 leading-6">
                <li>
                  durch{" "}
                  <strong className="text-app-heading">
                    Kontraktionen der Skelettmuskulatur
                  </strong>{" "}
                  entstehen und
                </li>

                <li>
                  zu einem{" "}
                  <strong className="text-app-heading">
                    zusätzlichen Energieverbrauch über den Grundumsatz hinaus
                  </strong>{" "}
                  führen.
                </li>
              </ul>

              <p className="mt-4 leading-6">
                Der Kontext der Aktivität ist zunächst unerheblich.
              </p>

              <p className="mt-3 font-medium text-app-heading">
                Körperliche Aktivität kann stattfinden:
              </p>

              <ul className="mt-2 grid list-disc gap-x-6 gap-y-1 pl-6 sm:grid-cols-2">
                <li>in der Freizeit</li>
                <li>bei der Arbeit</li>
                <li>beim Transport</li>
                <li>im Alltag</li>
                <li>beim Sport</li>
              </ul>

              <div className="mt-4">
                <InfoBox title="Definition">
                  Körperliche Aktivität umfasst alle durch
                  Skelettmuskelkontraktionen hervorgerufenen
                  Körperbewegungen, die den Energieverbrauch über den
                  Grundumsatz hinaus erhöhen.
                </InfoBox>
              </div>
            </div>

            {/* GESUNDHEITSFÖRDERNDE AKTIVITÄT */}

            <div>
              <h3 className="text-xl font-semibold text-app-heading">
                Gesundheitsfördernde körperliche Aktivität
              </h3>

              <p className="mt-3 leading-6">
                Für gesundheitsfördernde Wirkungen werden im Studienheft
                folgende WHO-Empfehlungen genannt.
              </p>

              {/* MINDESTEMPFEHLUNG */}

              <div className="mt-4 overflow-hidden rounded-2xl border border-app-accent/70 bg-app-surface">
                <div className="border-b border-app-border px-5 py-4 sm:px-6">
                  <span className="inline-flex rounded-lg bg-app-accent px-3 py-1.5 text-sm font-bold text-app-accent-ink sm:text-base">
                    Mindestempfehlung
                  </span>
                </div>

                <div className="grid lg:grid-cols-[1fr_auto_1fr_auto_1fr]">
                  <div className="p-5 sm:p-6">
                    <p className="text-sm font-medium text-app-accent">
                      Moderate Aktivität
                    </p>

                    <p className="mt-2 text-4xl font-bold tracking-tight text-app-heading sm:text-5xl">
                      150 Min.
                    </p>

                    <p className="mt-1 text-base text-app-text">
                      pro Woche
                    </p>
                  </div>

                  <div className="flex items-center justify-center border-y border-app-border px-5 py-3 lg:border-x lg:border-y-0">
                    <span className="text-sm font-bold uppercase tracking-wide text-app-accent">
                      oder
                    </span>
                  </div>

                  <div className="p-5 sm:p-6">
                    <p className="text-sm font-medium text-app-accent">
                      Intensive Aktivität
                    </p>

                    <p className="mt-2 text-4xl font-bold tracking-tight text-app-heading sm:text-5xl">
                      75 Min.
                    </p>

                    <p className="mt-1 text-base text-app-text">
                      pro Woche
                    </p>
                  </div>

                  <div className="flex items-center justify-center border-y border-app-border px-5 py-3 lg:border-x lg:border-y-0">
                    <span className="text-2xl font-light text-app-accent">
                      +
                    </span>
                  </div>

                  <div className="p-5 sm:p-6">
                    <p className="text-sm font-medium text-app-accent">
                      Muskelkräftigung
                    </p>

                    <p className="mt-2 text-4xl font-bold tracking-tight text-app-heading sm:text-5xl">
                      2×
                    </p>

                    <p className="mt-1 text-base text-app-text">
                      pro Woche
                    </p>

                    <p className="mt-2 text-sm text-app-faint">
                      große Muskelgruppen
                    </p>
                  </div>
                </div>

                <div className="border-t border-app-border bg-app-bg/50 px-5 py-4 sm:px-6">
                  <p className="text-sm text-app-text">
                    Eine entsprechende Kombination aus moderater und
                    intensiver Aktivität ist möglich.
                  </p>
                </div>
              </div>

              {/* ZUSÄTZLICHE GESUNDHEITSEFFEKTE */}

              <div className="mt-4 overflow-hidden rounded-2xl border border-app-border bg-app-surface/80">
                <div className="border-b border-app-border px-5 py-4 sm:px-6">
                  <span className="inline-flex rounded-lg border border-app-accent/40 bg-app-accent/10 px-3 py-1.5 text-sm font-bold text-app-accent sm:text-base">
                    Für zusätzliche Gesundheitseffekte
                  </span>
                </div>

                <div className="grid lg:grid-cols-[1fr_auto_1fr]">
                  <div className="p-5 sm:p-6">
                    <p className="text-sm font-medium text-app-muted">
                      Moderate Aktivität
                    </p>

                    <p className="mt-2 text-3xl font-bold tracking-tight text-app-heading sm:text-4xl">
                      bis 300 Min.
                    </p>

                    <p className="mt-1 text-base text-app-text">
                      pro Woche
                    </p>
                  </div>

                  <div className="flex items-center justify-center border-y border-app-border px-5 py-3 lg:border-x lg:border-y-0">
                    <span className="text-sm font-bold uppercase tracking-wide text-app-muted">
                      oder
                    </span>
                  </div>

                  <div className="p-5 sm:p-6">
                    <p className="text-sm font-medium text-app-muted">
                      Intensive Aktivität
                    </p>

                    <p className="mt-2 text-3xl font-bold tracking-tight text-app-heading sm:text-4xl">
                      bis 150 Min.
                    </p>

                    <p className="mt-1 text-base text-app-text">
                      pro Woche
                    </p>
                  </div>
                </div>
              </div>

              {/* KOMPAKTE HINWEISE */}

              <div className="mt-4 rounded-2xl border border-app-border bg-app-surface px-5 py-4 sm:px-6">
                <div className="space-y-2 text-sm text-app-text sm:text-base">
                  <p>
                    Einzelne Aktivitätseinheit laut Studienheft:{" "}
                    <strong className="text-app-heading">
                      mindestens 10 Minuten
                    </strong>
                  </p>

                  <p>
                    Über{" "}
                    <strong className="text-app-heading">
                      300 Minuten pro Woche
                    </strong>
                    : im Studienheft keine Evidenz für zusätzliche
                    Gesundheitswirksamkeit.
                  </p>
                </div>
              </div>
            </div>

            {/* MODERATE AKTIVITÄT */}

            <div>
              <h3 className="text-xl font-semibold text-app-heading">
                Moderate körperliche Aktivität
              </h3>

              <p className="mt-3 leading-6">
                Moderate körperliche Aktivität ist dadurch gekennzeichnet,
                dass die Atmung stärker als normalerweise beansprucht wird.
              </p>

              <p className="mt-3 font-medium text-app-heading">
                Beispiele:
              </p>

              <ul className="mt-2 list-disc space-y-1 pl-6 leading-6">
                <li>Radfahren mit normaler Geschwindigkeit</li>
                <li>strammes Spazierengehen</li>
              </ul>

              <p className="mt-3 leading-6">
                Für ältere und bislang inaktive Erwachsene verbindet
                strammes Spazierengehen einen hohen gesundheitlichen Nutzen
                mit einem vergleichsweise geringen Verletzungsrisiko.
              </p>
            </div>

            {/* SPORT */}

            <div>
              <h3 className="text-xl font-semibold text-app-heading">
                Sport
              </h3>

              <p className="mt-3 leading-6">
                <strong className="text-app-heading">
                  Sport ist eine Unterkategorie der körperlichen Aktivität.
                </strong>
              </p>

              <p className="mt-3 font-medium text-app-heading">
                Mit Sport werden insbesondere verbunden:
              </p>

              <ul className="mt-2 grid list-disc gap-x-6 gap-y-1 pl-6 sm:grid-cols-2">
                <li>körperliche Leistung</li>
                <li>Wettkampf</li>
                <li>Bewegung</li>
                <li>Spaß an der Bewegung</li>
              </ul>

              <p className="mt-4 font-medium text-app-heading">
                Sport umfasst verschiedene:
              </p>

              <ul className="mt-2 list-disc space-y-1 pl-6">
                <li>Bewegungsformen</li>
                <li>Spielformen</li>
                <li>Wettkampfformen</li>
              </ul>

              <div className="mt-4">
                <InfoBox title="Merksatz">
                  Körperliche Aktivität ist der Oberbegriff. Sport ist eine
                  Untergruppe davon.
                </InfoBox>
              </div>
            </div>

            {/* BREITENSPORT */}

            <div>
              <h3 className="text-xl font-semibold text-app-heading">
                Breitensport
              </h3>

              <p className="mt-3 leading-6">
                <strong className="text-app-heading">
                  Breitensport bzw. Freizeitsport
                </strong>{" "}
                dient vor allem:
              </p>

              <ul className="mt-3 list-disc space-y-1 pl-6 leading-6">
                <li>dem Spaß am Sport</li>
                <li>der allgemeinen körperlichen Fitness</li>
                <li>dem Ausgleich von Bewegungsmangel im Alltag</li>
              </ul>
            </div>

            {/* LEISTUNGSSPORT */}

            <div>
              <h3 className="text-xl font-semibold text-app-heading">
                Leistungssport
              </h3>

              <p className="mt-3 leading-6">
                <strong className="text-app-heading">
                  Leistungssport
                </strong>{" "}
                ist gekennzeichnet durch:
              </p>

              <ul className="mt-3 list-disc space-y-1 pl-6 leading-6">
                <li>Wettkampforientierung</li>
                <li>hohen Trainingsumfang</li>
                <li>gezielte Leistungssteigerung</li>
                <li>Fokussierung auf sportlichen Erfolg</li>
              </ul>

              <p className="mt-3 leading-6">
                Er unterscheidet sich vom Breitensport insbesondere durch
                den wesentlich höheren Zeitaufwand und die stärkere
                Leistungsorientierung.
              </p>
            </div>

            {/* FITNESS */}

            <div>
              <h3 className="text-xl font-semibold text-app-heading">
                Fitness
              </h3>

              <p className="mt-3 leading-6">
                Der Begriff{" "}
                <strong className="text-app-heading">
                  Fitness
                </strong>{" "}
                ist ohne zusätzlichen Bezug nicht eindeutig.
              </p>

              <p className="mt-3 leading-6">
                Fitness beschreibt die{" "}
                <strong className="text-app-heading">
                  Tauglichkeit bzw. Leistungsbereitschaft für eine
                  spezifische Aufgabe.
                </strong>
              </p>

              <div className="mt-4">
                <InfoBox title="Definition">
                  Fitness ist ein Zustand guter psychischer und physischer
                  Leistungsbereitschaft für eine spezifische Aufgabe.
                </InfoBox>
              </div>

              <p className="mt-4 font-medium text-app-heading">
                Beispiele:
              </p>

              <ul className="mt-2 list-disc space-y-1 pl-6 leading-6">
                <li>
                  Ein Gewichtheber ist fit für Kraftleistungen.
                </li>

                <li>
                  Ein Marathonläufer ist fit für lang andauernde
                  Ausdauerleistungen.
                </li>
              </ul>

              <p className="mt-4 font-medium text-app-heading">
                Für den Fitnesssport werden verschiedene Zielperspektiven
                beschrieben:
              </p>

              <ul className="mt-2 list-disc space-y-1 pl-6">
                <li>Gesundheitliche Ausrichtung</li>
                <li>Körperliche Perspektive</li>
                <li>Funktionale Ziele</li>
              </ul>

              <p className="mt-4 font-medium text-app-heading">
                Mögliche funktionale Ziele:
              </p>

              <ul className="mt-2 list-disc space-y-1 pl-6">
                <li>höhere berufliche Leistungsfähigkeit</li>
                <li>Pflege sozialer Kontakte</li>
              </ul>
            </div>

            {/* TRAINING */}

            <div>
              <h3 className="text-xl font-semibold text-app-heading">
                Training
              </h3>

              <p className="mt-3 leading-6">
                <strong className="text-app-heading">
                  Körperliches Training
                </strong>{" "}
                ist eine Unterkategorie körperlicher Aktivität.
              </p>

              <p className="mt-3 font-medium text-app-heading">
                Training ist:
              </p>

              <div className="mt-2 grid grid-cols-2 gap-2 md:grid-cols-4">
                {[
                  "geplant",
                  "strukturiert",
                  "wiederholt",
                  "zielgerichtet",
                ].map((item) => (
                  <div
                    key={item}
                    className="rounded-xl border border-app-border bg-app-surface px-3 py-2.5 text-center text-sm"
                  >
                    {item}
                  </div>
                ))}
              </div>

              <p className="mt-4 leading-6">
                Es dient der Verbesserung oder Erhaltung einer oder mehrerer
                Komponenten der körperlichen Fitness.
              </p>

              <div className="mt-4">
                <InfoBox title="Definition">
                  Training umfasst die Maßnahmen, die zur planmäßigen
                  Steigerung der körperlichen Leistungsfähigkeit führen.
                </InfoBox>
              </div>

              <p className="mt-4 leading-6">
                Trainieren dient der Optimierung bzw. Stabilisierung von:
              </p>

              <ul className="mt-2 list-disc space-y-1 pl-6">
                <li>konditionellen Eigenschaften</li>
                <li>koordinativen Eigenschaften</li>
              </ul>
            </div>

            {/* TRAININGSPRINZIPIEN */}

            <div>
              <h3 className="text-xl font-semibold text-app-heading">
                Trainingsprinzipien
              </h3>

              <p className="mt-3 leading-6">
                <strong className="text-app-heading">
                  Trainingsprinzipien
                </strong>{" "}
                sind allgemeingültige Bedingungen für die Wirksamkeit von
                Trainingsreizen und die daraus entstehenden
                Anpassungserscheinungen.
              </p>

              <p className="mt-4 font-medium text-app-heading">
                Unterschieden werden:
              </p>

              <ul className="mt-2 list-disc space-y-1 pl-6 leading-6">
                <li>
                  Prinzipien, die{" "}
                  <strong className="text-app-heading">
                    Anpassungen auslösen
                  </strong>
                </li>

                <li>
                  Prinzipien, die{" "}
                  <strong className="text-app-heading">
                    Anpassungserscheinungen optimieren
                  </strong>
                </li>

                <li>
                  Prinzipien, die Anpassungen{" "}
                  <strong className="text-app-heading">
                    in spezifische Richtungen lenken
                  </strong>
                </li>
              </ul>

              <p className="mt-4 font-medium text-app-heading">
                Zusätzlich sollten didaktische Prinzipien berücksichtigt
                werden:
              </p>

              <ul className="mt-2 grid list-disc gap-x-6 gap-y-1 pl-6 sm:grid-cols-2">
                <li>Anschaulichkeit</li>
                <li>Bewusstheit</li>
                <li>Selbsttätigkeit</li>
                <li>Vielseitigkeit</li>
                <li>Planmäßigkeit</li>
                <li>Ganzheitlichkeit</li>
              </ul>
            </div>

            {/* LERNEN */}

            <div>
              <h3 className="text-xl font-semibold text-app-heading">
                Lernen
              </h3>

              <p className="mt-3 leading-6">
                <strong className="text-app-heading">
                  Lernen
                </strong>{" "}
                ist Teil menschlicher Entwicklung.
              </p>

              <p className="mt-3 leading-6">
                Es beschreibt eine dauerhafte bzw. relativ stabile
                Veränderung von:
              </p>

              <ul className="mt-3 grid list-disc gap-x-6 gap-y-1 pl-6 sm:grid-cols-2">
                <li>Wissen</li>
                <li>Können</li>
                <li>Verhaltensmöglichkeiten</li>
                <li>Einstellungen</li>
                <li>Gewohnheiten</li>
              </ul>

              <p className="mt-4 leading-6">
                Diese Veränderungen entstehen aufgrund von:
              </p>

              <ul className="mt-2 list-disc space-y-1 pl-6">
                <li>Erlebnissen</li>
                <li>Erfahrungen</li>
                <li>Einsicht</li>
              </ul>

              <p className="mt-3 leading-6">
                Lernen ist ein{" "}
                <strong className="text-app-heading">
                  aktiver Prozess
                </strong>{" "}
                und von genetisch weitgehend festgelegten Vorgängen wie{" "}
                <strong className="text-app-heading">
                  Reifung oder Altern
                </strong>{" "}
                abzugrenzen.
              </p>
            </div>

            {/* ÜBEN */}

            <div>
              <h3 className="text-xl font-semibold text-app-heading">
                Üben
              </h3>

              <p className="mt-3 leading-6">
                <strong className="text-app-heading">
                  Üben
                </strong>{" "}
                beschreibt die systematische Wiederholung gezielter
                Bewegungsabläufe mit dem Ziel einer Leistungssteigerung
                durch Verbesserung der Koordination.
              </p>

              <p className="mt-4 font-medium text-app-heading">
                Der Schwerpunkt liegt insbesondere auf:
              </p>

              <ul className="mt-2 list-disc space-y-1 pl-6">
                <li>zentralnervösen Prozessen</li>
                <li>Koordination</li>
                <li>Bewegungssteuerung</li>
              </ul>

              <h4 className="mt-5 text-lg font-semibold text-app-heading">
                Training und Üben im Vergleich
              </h4>

              <div className="mt-3 overflow-x-auto rounded-xl border border-app-border">
                <table className="w-full min-w-[700px] border-collapse text-left text-sm">
                  <thead className="bg-app-surface text-app-heading">
                    <tr>
                      <th className="border-b border-r border-app-border p-3">
                        Training
                      </th>

                      <th className="border-b border-app-border p-3">
                        Üben
                      </th>
                    </tr>
                  </thead>

                  <tbody className="text-app-text">
                    <tr>
                      <td className="border-b border-r border-app-border p-3">
                        geplant, strukturiert und zielgerichtet
                      </td>

                      <td className="border-b border-app-border p-3">
                        systematische Wiederholung gezielter
                        Bewegungsabläufe
                      </td>
                    </tr>

                    <tr>
                      <td className="border-b border-r border-app-border p-3">
                        dient der Leistungssteigerung auf ein konkretes Ziel
                      </td>

                      <td className="border-b border-app-border p-3">
                        dient besonders der Verbesserung der Koordination
                      </td>
                    </tr>

                    <tr>
                      <td className="border-b border-r border-app-border p-3">
                        kann morphologische und weitere körperliche
                        Anpassungen betreffen
                      </td>

                      <td className="border-b border-app-border p-3">
                        betrifft vor allem zentralnervöse Anpassungen
                      </td>
                    </tr>

                    <tr>
                      <td className="border-r border-app-border p-3">
                        schließt Üben mit ein
                      </td>

                      <td className="p-3">
                        Üben allein ist nicht gleichbedeutend mit Training
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="mt-4">
                <InfoBox title="Merksatz">
                  Training schließt Üben mit ein. Üben ist jedoch nicht
                  automatisch Training.
                </InfoBox>
              </div>
            </div>

            {/* ENTWICKLUNG */}

            <div>
              <h3 className="text-xl font-semibold text-app-heading">
                Entwicklung
              </h3>

              <p className="mt-3 leading-6">
                <strong className="text-app-heading">
                  Entwicklung
                </strong>{" "}
                ist ein menschlicher, lebenslanger und ganzheitlicher
                Veränderungsprozess.
              </p>

              <p className="mt-4 font-medium text-app-heading">
                Sie betrifft:
              </p>

              <ul className="mt-2 grid list-disc gap-x-6 gap-y-1 pl-6 sm:grid-cols-2">
                <li>motorische Merkmale</li>
                <li>kognitive Merkmale</li>
                <li>psychosoziale Merkmale</li>
              </ul>

              <p className="mt-4 leading-6">
                Entwicklung kann sowohl eine Zunahme als auch eine Abnahme
                dieser Merkmale bedeuten.
              </p>

              <p className="mt-4 font-medium text-app-heading">
                Die motorische Entwicklung steht besonders in Beziehung zu:
              </p>

              <ul className="mt-2 grid list-disc gap-x-6 gap-y-1 pl-6 sm:grid-cols-2">
                <li>Wachstum</li>
                <li>Reifung</li>
                <li>Lernen</li>
                <li>Sozialisation</li>
              </ul>

              <h4 className="mt-5 text-lg font-semibold text-app-heading">
                Akzeleration und Retardierung
              </h4>

              <div className="mt-3 grid gap-3 md:grid-cols-2">
                <div className="rounded-xl border border-app-border bg-app-surface p-4">
                  <h5 className="font-semibold text-app-heading">
                    Akzeleration
                  </h5>

                  <p className="mt-2 text-sm leading-6">
                    Bezeichnet eine{" "}
                    <strong className="text-app-heading">
                      beschleunigte Entwicklung.
                    </strong>
                  </p>
                </div>

                <div className="rounded-xl border border-app-border bg-app-surface p-4">
                  <h5 className="font-semibold text-app-heading">
                    Retardierung
                  </h5>

                  <p className="mt-2 text-sm leading-6">
                    Bezeichnet eine{" "}
                    <strong className="text-app-heading">
                      verzögerte Entwicklung.
                    </strong>
                  </p>
                </div>
              </div>

              <p className="mt-4 leading-6">
                Diese Unterschiede sind insbesondere bei Kindern und
                Jugendlichen für die Planung und Durchführung von Sport-
                und Bewegungsangeboten relevant.
              </p>
            </div>
          </div>
        </section>

        {/* ===================================================== */}
        {/* GESUNDHEITSSPORT */}
        {/* ===================================================== */}

        <section
          id="gesundheitssport"
          className="mt-10 scroll-mt-8"
        >
          <h2 className="border-b border-app-border pb-3 text-2xl font-bold">
            Gesundheitssport
          </h2>

          <div className="mt-5 space-y-7 text-app-text">
            <div>
              <p className="leading-6">
                <strong className="text-app-heading">
                  Gesundheitssport
                </strong>{" "}
                umfasst Angebote und Programme, die den Kernzielen und
                Qualitätsanforderungen einer Gesundheitsförderung entsprechen.
              </p>

              <div className="mt-4">
                <InfoBox title="Definition">
                  Gesundheitssport verfolgt mit den Mitteln des Sports das
                  Ziel, Menschen zu mehr Selbstbestimmung über ihre
                  Gesundheit zu befähigen und dadurch ihre Gesundheit zu
                  stärken.
                </InfoBox>
              </div>
            </div>

            <div>
              <h3 className="text-xl font-semibold text-app-heading">
                Zielgruppen
              </h3>

              <p className="mt-3 leading-6">
                Gesundheitssport richtet sich insbesondere an:
              </p>

              <ul className="mt-3 list-disc space-y-1 pl-6 leading-6">
                <li>
                  Erwachsene mit dem Risikofaktor Bewegungsmangel
                </li>
                <li>
                  Erwachsene bis ins hohe Senior:innenalter
                </li>
                <li>
                  Erwachsene mit spezifischen gesundheitlichen Problemen
                </li>
                <li>
                  gesundheitlich besonders gefährdete Kinder und Jugendliche
                </li>
              </ul>

              <p className="mt-4 font-medium text-app-heading">
                Beispiele für gesundheitliche Probleme:
              </p>

              <ul className="mt-2 list-disc space-y-1 pl-6">
                <li>Rückenschmerzen</li>
                <li>Adipositas</li>
              </ul>

              <p className="mt-4 leading-6">
                Gesundheitssport ist{" "}
                <strong className="text-app-heading">
                  hochstrukturiert
                </strong>{" "}
                und gezielt auf gesundheitsfördernde Wirkungen ausgerichtet.
              </p>

              <p className="mt-3 leading-6">
                Diese Wirkungen betreffen den{" "}
                <strong className="text-app-heading">
                  Gesundheitsstatus
                </strong>
                , das{" "}
                <strong className="text-app-heading">
                  Gesundheitsverhalten
                </strong>{" "}
                und die{" "}
                <strong className="text-app-heading">
                  Gesundheitsverhältnisse
                </strong>
                .
              </p>
            </div>

            {/* SECHS KERNZIELE */}

            <div>
              <h3 className="text-xl font-semibold text-app-heading">
                Sechs Kernziele des Gesundheitssports
              </h3>

              <div className="mt-4 grid items-start gap-3 lg:grid-cols-2">
                {/* 1 */}
                <div className="rounded-xl border border-app-border bg-app-surface p-4">
                  <h4 className="font-semibold leading-6 text-app-heading">
                    1. Stärkung physischer Gesundheitsressourcen
                  </h4>

                  <p className="mt-2 text-sm leading-6 text-app-text">
                    Ziel ist die Stärkung körperlicher Eigenschaften, die
                    zur Gesunderhaltung beitragen.
                  </p>

                  <ul className="mt-3 grid list-disc gap-x-6 gap-y-1 pl-5 text-sm leading-6 text-app-text sm:grid-cols-2">
                    <li>Ausdauerfähigkeit</li>
                    <li>Kraftfähigkeit</li>
                    <li>Dehnfähigkeit</li>
                    <li>Koordinationsfähigkeit</li>
                    <li>Entspannungsfähigkeit</li>
                  </ul>
                </div>

                {/* 2 */}
                <div className="rounded-xl border border-app-border bg-app-surface p-4">
                  <h4 className="font-semibold leading-6 text-app-heading">
                    2. Stärkung psychosozialer Gesundheitsressourcen
                  </h4>

                  <p className="mt-2 text-sm leading-6 text-app-text">
                    Sportliche Aktivität kann das Wohlbefinden und
                    psychosoziale Ressourcen verbessern.
                  </p>

                  <ul className="mt-3 grid list-disc gap-x-6 gap-y-1 pl-5 text-sm leading-6 text-app-text sm:grid-cols-2">
                    <li>Stimmung</li>
                    <li>Körperkonzept</li>
                    <li>Wissen</li>
                    <li>soziale Kompetenz</li>
                    <li>soziale Einbindung</li>
                    <li>Kompetenzerwartungen</li>
                  </ul>
                </div>

                {/* 3 */}
                <div className="rounded-xl border border-app-border bg-app-surface p-4">
                  <h4 className="font-semibold leading-6 text-app-heading">
                    3. Verminderung von Risikofaktoren
                  </h4>

                  <p className="mt-2 text-sm leading-6 text-app-text">
                    Gesundheitssportliche Maßnahmen können positiv wirken
                    auf:
                  </p>

                  <ul className="mt-3 grid list-disc gap-x-6 gap-y-1 pl-5 text-sm leading-6 text-app-text sm:grid-cols-2">
                    <li>Fettstoffwechsel</li>
                    <li>Blutzucker</li>
                    <li>Übergewicht</li>
                    <li>Immunsystem</li>
                    <li>muskuläre Dysbalancen</li>
                    <li>Herz-Kreislauf-Risikofaktoren</li>
                    <li>Diabetes</li>
                    <li>Osteoporose</li>
                  </ul>
                </div>

                {/* 4 */}
                <div className="rounded-xl border border-app-border bg-app-surface p-4">
                  <h4 className="font-semibold leading-6 text-app-heading">
                    4. Bewältigung von Beschwerden und Missbefinden
                  </h4>

                  <p className="mt-2 text-sm leading-6 text-app-text">
                    Gesundheitssport kann dabei helfen, bestehende
                    Beschwerden zu bewältigen.
                  </p>

                  <ul className="mt-3 grid list-disc gap-x-6 gap-y-1 pl-5 text-sm leading-6 text-app-text sm:grid-cols-2">
                    <li>Rückenschmerzen</li>
                    <li>Gliederschmerzen</li>
                    <li>depressive Stimmungslagen</li>
                    <li>Kopfschmerzen</li>
                    <li>Schlafstörungen</li>
                    <li>schnelle Ermüdung</li>
                    <li>psychosomatische Beschwerden</li>
                    <li>Stresswahrnehmung</li>
                  </ul>

                  <p className="mt-3 text-sm leading-6 text-app-text">
                    Eine Verbesserung der körperlichen Leistungsfähigkeit
                    und der Stimmung kann das subjektive Wohlbefinden positiv
                    beeinflussen.
                  </p>
                </div>

                {/* 5 */}
                <div className="rounded-xl border border-app-border bg-app-surface p-4">
                  <h4 className="font-semibold leading-6 text-app-heading">
                    5. Aufbau von und Bindung an gesundheitssportliche Aktivität
                  </h4>

                  <p className="mt-2 text-sm leading-6 text-app-text">
                    <strong className="text-app-heading">
                      Bindung
                    </strong>{" "}
                    bedeutet die regelmäßige und langfristige Teilnahme am
                    Gesundheitssport.
                  </p>

                  <p className="mt-2 text-sm leading-6 text-app-text">
                    Langfristiges Dabeibleiben ist ein zentrales Ziel.
                  </p>

                  <p className="mt-3 text-sm font-medium leading-6 text-app-heading">
                    Regelmäßige sportliche Aktivität kann außerdem weitere
                    Aspekte des Lebensstils beeinflussen:
                  </p>

                  <ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-6 text-app-text">
                    <li>Ernährung</li>
                    <li>Entspannung</li>
                    <li>Freizeitgestaltung</li>
                  </ul>
                </div>

                {/* 6 */}
                <div className="rounded-xl border border-app-border bg-app-surface p-4">
                  <h4 className="font-semibold leading-6 text-app-heading">
                    6. Verbesserung der Bewegungsverhältnisse
                  </h4>

                  <p className="mt-2 text-sm leading-6 text-app-text">
                    Gesundheitsförderung muss auch die Lebensbedingungen und
                    Bewegungsmöglichkeiten der Bevölkerung berücksichtigen.
                  </p>

                  <ul className="mt-3 grid list-disc gap-x-6 gap-y-1 pl-5 text-sm leading-6 text-app-text sm:grid-cols-2">
                    <li>qualitätsvolle Angebote</li>
                    <li>qualifizierte Übungsleiter:innen</li>
                    <li>geeignete Räumlichkeiten</li>
                    <li>Vernetzung und Kooperation</li>
                    <li>Qualitätssicherung</li>
                    <li>bewegungsfreundliche Lebensbedingungen</li>
                  </ul>
                </div>
              </div>

              <div className="mt-4">
                <InfoBox title="Lernhilfe">
                  Physische Ressourcen – psychosoziale Ressourcen –
                  Risikofaktoren – Beschwerden – Bindung –
                  Bewegungsverhältnisse
                </InfoBox>
              </div>

              <Figure
                src="/infoboard/sportpaedagogik/gesundheitssport-kernziele.png"
                alt="Kernziele des Gesundheitssports und ihre Wechselwirkungen"
                caption="Kernziele des Gesundheitssports und ihre Wechselwirkungen."
              />

              <Figure
                src="/infoboard/sportpaedagogik/gesundheitssport-dimensionen.png"
                alt="Dimensionen und Kernziele des Gesundheitssports"
                caption="Dimensionen und Kernziele des Gesundheitssports sowie Ansätze zur inhaltlichen Umsetzung."
              />
            </div>
          </div>
        </section>

        {/* ===================================================== */}
        {/* REHABILITATIONSSPORT */}
        {/* ===================================================== */}

        <section
          id="rehabilitationssport"
          className="mt-10 scroll-mt-8"
        >
          <h2 className="border-b border-app-border pb-3 text-2xl font-bold">
            Rehabilitationssport
          </h2>

          <div className="mt-5 space-y-7 text-app-text">
            <div>
              <p className="leading-6">
                <strong className="text-app-heading">
                  Rehabilitationssport
                </strong>{" "}
                richtet sich insbesondere an:
              </p>

              <ul className="mt-3 list-disc space-y-1 pl-6 leading-6">
                <li>Menschen mit Behinderung</li>
                <li>von Behinderung bedrohte Menschen</li>
                <li>chronisch kranke Menschen</li>
              </ul>

              <p className="mt-4 leading-6">
                Ziel ist eine möglichst dauerhafte Eingliederung in:
              </p>

              <ul className="mt-2 list-disc space-y-1 pl-6">
                <li>die Gesellschaft</li>
                <li>das Arbeitsleben</li>
              </ul>
            </div>

            <div>
              <h3 className="text-xl font-semibold text-app-heading">
                Ziele des Rehabilitationssports
              </h3>

              <p className="mt-3 leading-6">
                Rehabilitationssport soll:
              </p>

              <ul className="mt-3 grid list-disc gap-x-6 gap-y-1 pl-6 sm:grid-cols-2">
                <li>Ausdauer stärken</li>
                <li>Kraft stärken</li>
                <li>Koordination verbessern</li>
                <li>Flexibilität verbessern</li>
                <li>Selbstbewusstsein stärken</li>
                <li>Hilfe zur Selbsthilfe bieten</li>
              </ul>

              <p className="mt-4 font-medium text-app-heading">
                Übergeordnete Ziele:
              </p>

              <ul className="mt-2 list-disc space-y-1 pl-6 leading-6">
                <li>
                  Stärkung und Wiederherstellung physischer und
                  psychosozialer Ressourcen
                </li>

                <li>
                  Ermöglichung eines selbstbestimmten Lebens bei Behinderung
                  oder Schädigung
                </li>

                <li>
                  Reduktion damit verbundener gesundheitlicher Probleme
                </li>

                <li>
                  langfristig selbstständiges und eigenverantwortliches
                  Bewegungstraining
                </li>
              </ul>
            </div>

            <div>
              <h3 className="text-xl font-semibold text-app-heading">
                Rehabilitationssport als Gruppenangebot
              </h3>

              <p className="mt-3 leading-6">
                Rehabilitationssport wird in Gruppen durchgeführt.
              </p>

              <p className="mt-3 leading-6">
                Dadurch sollen:
              </p>

              <ul className="mt-2 list-disc space-y-1 pl-6">
                <li>gruppendynamische Effekte gefördert</li>
                <li>Erfahrungsaustausch ermöglicht</li>
                <li>gegenseitige Unterstützung gefördert werden</li>
              </ul>
            </div>

            <div>
              <h3 className="text-xl font-semibold text-app-heading">
                Typische Indikationsbereiche
              </h3>

              <ul className="mt-3 grid list-disc gap-x-6 gap-y-1 pl-6 sm:grid-cols-2">
                <li>Herzgruppen</li>
                <li>Schlaganfallgruppen</li>
                <li>Diabetesgruppen</li>
                <li>Krebsnachsorgegruppen</li>
                <li>Rückengruppen</li>
                <li>Osteoporose</li>
                <li>Atemwegserkrankungen</li>
                <li>Rheuma</li>
                <li>Suchterkrankungen</li>
                <li>Demenzerkrankungen</li>
              </ul>
            </div>

            <div>
              <h3 className="text-xl font-semibold text-app-heading">
                Prävention und Rehabilitation im Vergleich
              </h3>

              <div className="mt-3 overflow-x-auto rounded-xl border border-app-border">
                <table className="w-full min-w-[800px] border-collapse text-left text-sm">
                  <thead className="bg-app-surface text-app-heading">
                    <tr>
                      <th className="border-b border-r border-app-border p-3">
                        Merkmal
                      </th>

                      <th className="border-b border-r border-app-border p-3">
                        Prävention
                      </th>

                      <th className="border-b border-app-border p-3">
                        Rehabilitation
                      </th>
                    </tr>
                  </thead>

                  <tbody className="text-app-text">
                    <tr>
                      <td className="border-b border-r border-app-border p-3 font-medium text-app-heading">
                        Zielgruppe
                      </td>

                      <td className="border-b border-r border-app-border p-3">
                        Menschen mit Bewegungsmangel
                      </td>

                      <td className="border-b border-app-border p-3">
                        Menschen mit Behinderung, von Behinderung bedrohte
                        Menschen und chronisch Kranke
                      </td>
                    </tr>

                    <tr>
                      <td className="border-b border-r border-app-border p-3 font-medium text-app-heading">
                        Zielsetzung
                      </td>

                      <td className="border-b border-r border-app-border p-3">
                        Schwerpunkt auf Gestaltungsfähigkeit und
                        psychosozialen Ressourcen
                      </td>

                      <td className="border-b border-app-border p-3">
                        Schwerpunkt auf Krankheitsbewältigung,
                        Gestaltungsfähigkeit und psychosozialen Ressourcen
                      </td>
                    </tr>

                    <tr>
                      <td className="border-b border-r border-app-border p-3 font-medium text-app-heading">
                        Qualifikation
                      </td>

                      <td className="border-b border-r border-app-border p-3">
                        qualifizierte Übungsleiter:innen
                      </td>

                      <td className="border-b border-app-border p-3">
                        qualifizierte Übungsleiter:innen
                      </td>
                    </tr>

                    <tr>
                      <td className="border-b border-r border-app-border p-3 font-medium text-app-heading">
                        Ärztliche Verordnung
                      </td>

                      <td className="border-b border-r border-app-border p-3">
                        nicht als Grundstruktur genannt
                      </td>

                      <td className="border-b border-app-border p-3">
                        erforderlich
                      </td>
                    </tr>

                    <tr>
                      <td className="border-r border-app-border p-3 font-medium text-app-heading">
                        Einbindung
                      </td>

                      <td className="border-r border-app-border p-3">
                        Sportverein
                      </td>

                      <td className="p-3">
                        Sportverein
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <Figure
                src="/infoboard/sportpaedagogik/praevention-rehabilitation.png"
                alt="Zielgruppen und Strukturen von Prävention und Rehabilitation"
                caption="Zielgruppe, Zielsetzung und Struktur von Prävention und Rehabilitation."
              />
            </div>
          </div>
        </section>

        {/* ===================================================== */}
        {/* BEWEGUNGSTHERAPIE */}
        {/* ===================================================== */}

        <section
          id="bewegungstherapie"
          className="mt-10 scroll-mt-8"
        >
          <h2 className="border-b border-app-border pb-3 text-2xl font-bold">
            Bewegungstherapie
          </h2>

          <div className="mt-5 space-y-7 text-app-text">
            <div>
              <p className="leading-6">
                <strong className="text-app-heading">
                  Sport- und Bewegungstherapie
                </strong>{" "}
                wird als ärztlich indizierte und verordnete Bewegung mit
                verhaltensorientierten Komponenten verstanden.
              </p>

              <p className="mt-4 leading-6">
                Sie wird:
              </p>

              <ul className="mt-2 list-disc space-y-1 pl-6">
                <li>von Therapeut:innen geplant</li>
                <li>dosiert</li>
                <li>gemeinsam mit Ärzt:innen kontrolliert</li>
                <li>allein oder in Gruppen durchgeführt</li>
              </ul>
            </div>

            <div>
              <h3 className="text-xl font-semibold text-app-heading">
                Ziele der Bewegungstherapie
              </h3>

              <p className="mt-3 leading-6">
                Die Bewegungstherapie ist{" "}
                <strong className="text-app-heading">
                  mehrdimensional.
                </strong>
              </p>

              <p className="mt-3 leading-6">
                Sie soll Beeinträchtigungen verbessern auf:
              </p>

              <ul className="mt-2 list-disc space-y-1 pl-6">
                <li>physischer Ebene</li>
                <li>psychischer Ebene</li>
                <li>sozialer Ebene</li>
              </ul>

              <p className="mt-4 leading-6">
                Ein übergeordnetes Ziel ist die Hinführung zu einem{" "}
                <strong className="text-app-heading">
                  körperlich aktiven Lebensstil.
                </strong>
              </p>
            </div>

            <div>
              <h3 className="text-xl font-semibold text-app-heading">
                Dimensionen der Bewegungstherapie
              </h3>

              <ul className="mt-3 list-disc space-y-1 pl-6">
                <li>funktionelle Dimension</li>
                <li>pädagogische Dimension</li>
                <li>psychosoziale Dimension</li>
              </ul>

              <p className="mt-4 leading-6">
                Sie basiert auf Elementen aus:
              </p>

              <ul className="mt-2 grid list-disc gap-x-6 gap-y-1 pl-6 sm:grid-cols-2">
                <li>Medizin</li>
                <li>Trainingswissenschaft</li>
                <li>Bewegungswissenschaft</li>
                <li>Pädagogik</li>
                <li>Psychologie</li>
                <li>Soziotherapie</li>
              </ul>

              <p className="mt-4 leading-6">
                Die trainingswissenschaftlichen Aspekte dienen insbesondere
                der:
              </p>

              <ul className="mt-2 list-disc space-y-1 pl-6">
                <li>Auswahl körperlicher Aktivität</li>
                <li>Dosierung körperlicher Aktivität</li>
                <li>Erhaltung körperlicher Funktionen</li>
                <li>Förderung körperlicher Funktionen</li>
                <li>Wiederherstellung körperlicher Funktionen</li>
              </ul>

              <div className="mt-4 rounded-xl border border-dashed border-app-border bg-app-surface/50 p-4 text-sm text-app-muted">
                Abbildung zur Mehrdimensionalität der Bewegungs- und
                Sporttherapie können wir hier ergänzen, sobald du sie mir
                schickst.
              </div>
            </div>
          </div>
        </section>

        {/* ===================================================== */}
        {/* 1.2 */}
        {/* ===================================================== */}

        <section
          id="forschungsstand"
          className="mt-10 scroll-mt-8"
        >
          <h2 className="border-b border-app-border pb-3 text-2xl font-bold">
            1.2 Körperliche Aktivität, Sport und Gesundheit: Stand der Forschung
          </h2>

          <div className="mt-5 space-y-7 text-app-text">
            <div>
              <p className="leading-6">
                Die positiven Effekte körperlicher Aktivität sind auf
                physischer, psychischer und sozialer Ebene wissenschaftlich
                belegt.
              </p>

              <p className="mt-3 leading-6">
                Körperliche Inaktivität stellt einen bedeutenden
                Risikofaktor dar.
              </p>

              <p className="mt-4 font-medium text-app-heading">
                Im Studienheft werden Zusammenhänge mit folgenden
                Erkrankungen bzw. Gesundheitsproblemen beschrieben:
              </p>

              <ul className="mt-2 grid list-disc gap-x-6 gap-y-1 pl-6 sm:grid-cols-2">
                <li>Herz-Kreislauf-Erkrankungen</li>
                <li>Diabetes mellitus Typ 2</li>
                <li>Brustkrebs</li>
                <li>Darmkrebs</li>
                <li>Adipositas</li>
                <li>Bluthochdruck</li>
                <li>Depression</li>
              </ul>

              <p className="mt-4 leading-6">
                Es besteht außerdem ein{" "}
                <strong className="text-app-heading">
                  inverser Zusammenhang zwischen dem Umfang körperlicher
                  Aktivität und der Gesamtmortalität.
                </strong>
              </p>

              <div className="mt-4">
                <InfoBox title="Merksatz">
                  Mit zunehmender körperlicher Aktivität nimmt die
                  Gesamtmortalität tendenziell ab.
                </InfoBox>
              </div>
            </div>

            <div>
              <h3 className="text-xl font-semibold text-app-heading">
                Positive Auswirkungen körperlicher Aktivität
              </h3>

              <p className="mt-3 leading-6">
                Im Studienheft werden folgende Gesundheitsgrößen
                aufgeführt:
              </p>

              <ul className="mt-3 grid list-disc gap-x-6 gap-y-1 pl-6 md:grid-cols-2">
                <li>Lebenserwartung</li>
                <li>Risiko kardiovaskulärer Erkrankungen</li>
                <li>Blutdruck</li>
                <li>Risiko für Darmkrebs</li>
                <li>Risiko für Diabetes mellitus Typ 2</li>
                <li>Beschwerden durch Arthrose</li>
                <li>Knochendichte im Kindes- und Jugendalter</li>
                <li>Risiko altersbedingter Stürze</li>
                <li>Kompetenz zur Alltagsbewältigung im Alter</li>
                <li>Kontrolle des Körpergewichts</li>
                <li>Angst und Depressionen</li>
                <li>allgemeines Wohlbefinden</li>
              </ul>

              <Figure
                src="/infoboard/sportpaedagogik/gesundheitliche-auswirkungen.png"
                alt="Auswirkungen körperlicher Aktivität auf die Gesundheit"
                caption="Auswirkungen körperlicher Aktivität auf die Gesundheit."
              />
            </div>

            <div>
              <h3 className="text-xl font-semibold text-app-heading">
                Bewegungsmangel
              </h3>

              <p className="mt-3 leading-6">
                Im Studienheft wird Bewegungsmangel nach WHO definiert als:
              </p>

              <ul className="mt-3 list-disc space-y-1 pl-6 leading-6">
                <li>
                  weniger als{" "}
                  <strong className="text-app-heading">
                    150 Minuten moderate körperliche Aktivität pro Woche
                  </strong>
                </li>

                <li>
                  oder weniger als{" "}
                  <strong className="text-app-heading">
                    75 Minuten intensive körperliche Aktivität pro Woche
                  </strong>
                  .
                </li>
              </ul>

              <p className="mt-4 leading-6">
                Gesundheitswirksame körperliche Aktivität muss nicht
                ausschließlich als Sport oder Training stattfinden.
              </p>

              <p className="mt-3 leading-6">
                Sie kann auch erfolgen:
              </p>

              <ul className="mt-2 list-disc space-y-1 pl-6">
                <li>in der Freizeit</li>
                <li>bei der Arbeit</li>
                <li>beim Transport</li>
              </ul>
            </div>
          </div>
        </section>

        {/* ===================================================== */}
        {/* 1.3 */}
        {/* ===================================================== */}

        <section
          id="praevention"
          className="mt-10 scroll-mt-8"
        >
          <h2 className="border-b border-app-border pb-3 text-2xl font-bold">
            1.3 Körperliche Aktivität und Sport als Mittel in Prävention,
            Rehabilitation und Gesundheitsförderung
          </h2>

          <div className="mt-5 space-y-7 text-app-text">
            <div>
              <p className="leading-6">
                Körperlich-sportliche Aktivität kann Gesundheit sowohl{" "}
                <strong className="text-app-heading">
                  direkt als auch indirekt
                </strong>{" "}
                beeinflussen.
              </p>
            </div>

            {/* PARAMETER */}

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <h3 className="text-xl font-semibold text-app-heading">
                  Belastungsparameter körperlich-sportlicher Aktivität
                </h3>

                <ul className="mt-3 grid list-disc gap-x-6 gap-y-1 pl-6 sm:grid-cols-2">
                  <li>Häufigkeit</li>
                  <li>Dauer</li>
                  <li>Intensität</li>
                  <li>Richtung</li>
                </ul>
              </div>

              <div>
                <h3 className="text-xl font-semibold text-app-heading">
                  Psychosoziale Parameter
                </h3>

                <ul className="mt-3 grid list-disc gap-x-6 gap-y-1 pl-6 sm:grid-cols-2">
                  <li>Inhalte</li>
                  <li>Gruppe und soziale Einbindung</li>
                  <li>Emotionalisierung</li>
                  <li>Information</li>
                  <li>Wissen</li>
                  <li>Können</li>
                </ul>
              </div>
            </div>

            {/* RESSOURCEN + BELASTUNGSSYMPTOME */}

            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-xl border border-app-border bg-app-surface p-4">
                <h3 className="text-lg font-semibold text-app-heading">
                  Physische Gesundheitsressourcen
                </h3>

                <p className="mt-2 leading-6">
                  Körperlich-sportliche Aktivität kann physische
                  Gesundheitsressourcen stärken.
                </p>

                <ul className="mt-2 list-disc space-y-1 pl-6">
                  <li>Ausdauer</li>
                  <li>Kraft</li>
                  <li>weitere Fitnessfaktoren</li>
                </ul>
              </div>

              <div className="rounded-xl border border-app-border bg-app-surface p-4">
                <h3 className="text-lg font-semibold text-app-heading">
                  Psychosoziale Gesundheitsressourcen
                </h3>

                <p className="mt-2 leading-6">
                  Körperlich-sportliche Aktivität kann psychosoziale
                  Gesundheitsressourcen stärken.
                </p>

                <ul className="mt-2 list-disc space-y-1 pl-6">
                  <li>soziale Einbindung</li>
                  <li>Selbstwirksamkeit</li>
                </ul>
              </div>

              <div className="rounded-xl border border-app-border bg-app-surface p-4">
                <h3 className="text-lg font-semibold text-app-heading">
                  Physische Belastungssymptome
                </h3>

                <ul className="mt-2 list-disc space-y-1 pl-6">
                  <li>körperliche Schmerzen</li>
                  <li>Übergewicht</li>
                  <li>erhöhte Blutfette</li>
                  <li>weitere körperliche Risikofaktoren</li>
                </ul>
              </div>

              <div className="rounded-xl border border-app-border bg-app-surface p-4">
                <h3 className="text-lg font-semibold text-app-heading">
                  Psychosoziale Belastungssymptome
                </h3>

                <ul className="mt-2 list-disc space-y-1 pl-6">
                  <li>psychosomatische Beschwerden</li>
                  <li>Stress</li>
                  <li>Angst</li>
                  <li>Unsicherheit</li>
                  <li>Schmerzen</li>
                </ul>
              </div>
            </div>

            <div>
              <h3 className="text-xl font-semibold text-app-heading">
                Indirekte Wirkung körperlicher Aktivität
              </h3>

              <p className="mt-3 leading-6">
                Körperlich-sportliche Aktivität kann zunächst
                Gesundheitsressourcen stärken.
              </p>

              <p className="mt-3 leading-6">
                Diese Ressourcen können anschließend dazu beitragen:
              </p>

              <ul className="mt-2 list-disc space-y-1 pl-6">
                <li>Belastungssymptomen vorzubeugen</li>
                <li>Belastungssymptome besser zu bewältigen</li>
              </ul>

              <div className="mt-4">
                <InfoBox title="Wirkweg">
                  Körperlich-sportliche Aktivität → Stärkung von
                  Gesundheitsressourcen → Vorbeugung bzw. Bewältigung von
                  Belastungssymptomen
                </InfoBox>
              </div>
            </div>

            <div>
              <h3 className="text-xl font-semibold text-app-heading">
                Direkte Wirkung körperlicher Aktivität
              </h3>

              <p className="mt-3 leading-6">
                Körperlich-sportliche Aktivität kann Belastungssymptome auch
                unmittelbar beeinflussen.
              </p>

              <ul className="mt-3 list-disc space-y-1 pl-6">
                <li>Stress abpuffern</li>
                <li>Wahrnehmung von Beschwerden beeinflussen</li>
                <li>Schmerzwahrnehmung verändern</li>
              </ul>
            </div>

            <div>
              <h3 className="text-xl font-semibold text-app-heading">
                Externe Rahmenbedingungen
              </h3>

              <p className="mt-3 leading-6">
                Der Zusammenhang von körperlicher Aktivität und Gesundheit
                wird zusätzlich durch äußere Bedingungen beeinflusst.
              </p>

              <ul className="mt-3 grid list-disc gap-x-6 gap-y-1 pl-6 sm:grid-cols-2">
                <li>Sozialstatus</li>
                <li>Familie</li>
                <li>Freund:innen</li>
                <li>Beruf</li>
                <li>Wohnsituation</li>
                <li>Sportverein</li>
              </ul>

              <p className="mt-4 leading-6">
                Diese Faktoren können sowohl{" "}
                <strong className="text-app-heading">
                  Anforderungen
                </strong>{" "}
                als auch{" "}
                <strong className="text-app-heading">
                  Ressourcen
                </strong>{" "}
                darstellen.
              </p>

              <Figure
                src="/infoboard/sportpaedagogik/wirkungsannahmen-gesundheit.png"
                alt="Wirkungsannahmen körperlich-sportlicher Aktivität auf Gesundheit"
                caption="Wirkungsannahmen von körperlich-sportlicher Aktivität auf Gesundheit."
              />
            </div>

            <div>
              <h3 className="text-xl font-semibold text-app-heading">
                Anforderungen an gesundheitswirksame körperliche Aktivität
              </h3>

              <p className="mt-3 leading-6">
                Für den Erhalt und die Verbesserung der physischen Gesundheit
                sind sowohl Alltags- als auch Sportaktivitäten geeignet,
                wenn sie:
              </p>

              <ul className="mt-3 list-disc space-y-1 pl-6">
                <li>regelmäßig</li>
                <li>mindestens mit moderater Intensität</li>
              </ul>

              <p className="mt-4 font-medium text-app-heading">
                Kennzeichen moderater Intensität:
              </p>

              <ul className="mt-2 list-disc space-y-1 pl-6">
                <li>Veränderung der Atmung</li>
                <li>leichtes Schwitzen</li>
              </ul>

              <p className="mt-4 leading-6">
                Besonders effektiv sind systematisch ausgerichtete
                Aktivitäten zur Verbesserung von:
              </p>

              <ul className="mt-2 grid list-disc gap-x-6 gap-y-1 pl-6 sm:grid-cols-2">
                <li>Ausdauer</li>
                <li>Kraft</li>
                <li>Dehnfähigkeit bzw. Beweglichkeit</li>
                <li>Koordinationsfähigkeit</li>
                <li>Entspannungsfähigkeit</li>
              </ul>

              <p className="mt-4 leading-6">
                Auch psychosoziale Faktoren sollten systematisch einbezogen
                werden:
              </p>

              <ul className="mt-2 grid list-disc gap-x-6 gap-y-1 pl-6 sm:grid-cols-2">
                <li>soziale Unterstützung</li>
                <li>soziale Einbindung</li>
                <li>Wissensvermittlung</li>
                <li>Kompetenzerweiterung</li>
                <li>emotionales Erleben</li>
              </ul>

              <p className="mt-4 leading-6">
                Dadurch können gefördert werden:
              </p>

              <ul className="mt-2 list-disc space-y-1 pl-6">
                <li>Motivation</li>
                <li>Bindung an körperliche Aktivität</li>
                <li>Selbstkompetenz</li>
              </ul>

              <p className="mt-4 leading-6">
                Bei speziellen Zielgruppen müssen individuelle
                Voraussetzungen berücksichtigt werden.
              </p>

              <ul className="mt-2 grid list-disc gap-x-6 gap-y-1 pl-6 sm:grid-cols-2">
                <li>gesundheitliche Probleme</li>
                <li>Risikofaktoren</li>
                <li>Schädigungen</li>
                <li>Behinderungen</li>
              </ul>
            </div>
          </div>
        </section>

        {/* ZURÜCK */}

        <div className="mt-10 border-t border-app-border pt-6">
          <Link
            href="/coach/infoboard/sportpaedagogik-gesundheitspsychologie"
            className="inline-block rounded-xl border border-app-border px-4 py-3 text-sm hover:bg-app-elevated"
          >
            ← Zurück zur Themenübersicht
          </Link>
        </div>
      </div>
    </main>
  );
}