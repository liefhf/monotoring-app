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

      <div className="mt-2 leading-7 text-app-text">
        {children}
      </div>
    </div>
  );
}

function FigurePlaceholder({
  title,
}: {
  title: string;
}) {
  return (
    <div className="mt-6 rounded-xl border border-dashed border-app-border bg-app-surface/50 p-5">
      <p className="text-sm font-medium text-app-text">
        Abbildung folgt
      </p>

      <p className="mt-1 text-xs text-app-faint">
        {title}
      </p>
    </div>
  );
}

export default function SportdidaktikPage() {
  return (
    <main>
      <div className="mx-auto max-w-5xl">
        {/* KOPF */}

        <header>
          <p className="text-sm text-app-muted">
            Sportpädagogik und Gesundheitspsychologie
          </p>

          <h1 className="mt-1 text-3xl font-bold">
            2. Allgemeine Sportdidaktik
          </h1>
        </header>

        {/* LERNORIENTIERUNG */}

        <section className="mt-8 rounded-[20px] border border-app-border bg-app-surface shadow-app p-5">
          <h2 className="text-lg font-semibold">
            Lernorientierung
          </h2>

          <p className="mt-3 text-sm leading-7 text-app-text">
            Nach Bearbeitung dieses Kapitels solltest du:
          </p>

          <ul className="mt-3 list-disc space-y-2 pl-6 text-sm leading-6 text-app-text">
            <li>
              den Stellenwert von{" "}
              <strong className="text-app-heading">
                Methodik und Didaktik
              </strong>{" "}
              in der Sportpädagogik wiedergeben können,
            </li>

            <li>
              Grundlagen einer{" "}
              <strong className="text-app-heading">
                zielorientierten Stundenplanung
              </strong>{" "}
              kennen,
            </li>

            <li>
              methodische Vorgehensweisen und{" "}
              <strong className="text-app-heading">
                Trainingsprinzipien
              </strong>{" "}
              für eine effektive Stundengestaltung erläutern können,
            </li>

            <li>
              verschiedene{" "}
              <strong className="text-app-heading">
                Unterrichtsformen
              </strong>{" "}
              voneinander abgrenzen können,
            </li>

            <li>
              Vor- und Nachteile verschiedener{" "}
              <strong className="text-app-heading">
                Sozialformen
              </strong>{" "}
              erklären können.
            </li>
          </ul>
        </section>

        {/* INHALT */}

        <nav className="mt-5 rounded-[20px] border border-app-border bg-app-surface shadow-app p-5">
          <p className="text-sm font-semibold text-app-text">
            Inhalt
          </p>

          <div className="mt-3 space-y-1 text-sm">
            <a
              href="#sportpaedagogik"
              className="block rounded-lg px-3 py-2 text-app-text hover:bg-app-elevated hover:text-app-heading"
            >
              Sportpädagogik
            </a>

            <a
              href="#didaktik-methodik"
              className="block rounded-lg px-3 py-2 text-app-text hover:bg-app-elevated hover:text-app-heading"
            >
              2.1 Didaktik, Methodik, Pädagogik und Sozialformen
            </a>

            <a
              href="#unterrichtsformen"
              className="block rounded-lg px-3 py-2 text-app-text hover:bg-app-elevated hover:text-app-heading"
            >
              2.2 Unterrichtsformen
            </a>

            <a
              href="#stundenplanung"
              className="block rounded-lg px-3 py-2 text-app-text hover:bg-app-elevated hover:text-app-heading"
            >
              2.3 Stundenverlaufsplanung
            </a>

            <a
              href="#uebungsreihen"
              className="block rounded-lg px-3 py-2 text-app-text hover:bg-app-elevated hover:text-app-heading"
            >
              2.4 Methodische Übungsreihen und Vermittlungsmethoden
            </a>

            <a
              href="#trainingsprinzipien"
              className="block rounded-lg px-3 py-2 text-app-text hover:bg-app-elevated hover:text-app-heading"
            >
              2.5 Trainingsprinzipien
            </a>
          </div>
        </nav>

        {/* ===================================================== */}
        {/* SPORTPÄDAGOGIK */}
        {/* ===================================================== */}

        <section
          id="sportpaedagogik"
          className="mt-12 scroll-mt-8"
        >
          <h2 className="border-b border-app-border pb-3 text-2xl font-bold">
            Sportpädagogik
          </h2>

          <div className="mt-8 space-y-8 text-app-text">
            <div>
              <p className="leading-7">
                Bei der Planung, Durchführung und Auswertung von Trainings-,
                Übungs- oder Therapiestunden entstehen immer
                sportpädagogische Fragestellungen.
              </p>

              <p className="mt-4 font-medium text-app-heading">
                Dazu gehören beispielsweise:
              </p>

              <ul className="mt-3 list-disc space-y-2 pl-6">
                <li>Was ist das Ziel der Stunde?</li>
                <li>Welche Inhalte sollen vermittelt werden?</li>
                <li>Welche Methoden eignen sich?</li>
                <li>Wurde das geplante Ziel erreicht?</li>
                <li>
                  Was sollte bei zukünftigen Einheiten verändert werden?
                </li>
              </ul>
            </div>

            <div>
              <p className="leading-7">
                <strong className="text-app-heading">
                  Pädagogik
                </strong>{" "}
                wird als Lehre von Erziehung und Unterricht bzw. als
                Wissenschaft von Erziehung und Bildung verstanden.
              </p>

              <p className="mt-4 leading-7">
                <strong className="text-app-heading">
                  Sportpädagogik
                </strong>{" "}
                ist eine wichtige Bezugswissenschaft für Planung,
                Durchführung und Auswertung bewegungsbezogener
                Interventionen.
              </p>

              <p className="mt-4 leading-7">
                Sie verbindet{" "}
                <strong className="text-app-heading">
                  Theorie und Praxis des Sports bzw. der Bewegungsvermittlung.
                </strong>
              </p>

              <p className="mt-5 font-medium text-app-heading">
                Sportpädagogik:
              </p>

              <ul className="mt-3 list-disc space-y-2 pl-6">
                <li>bezeichnet sowohl eine Praxis als auch eine Theorie</li>
                <li>besitzt ein breites Methodenspektrum</li>
                <li>bezieht sich auf unterschiedliche Handlungsfelder</li>
                <li>bezieht sich auf unterschiedliche Zielgruppen</li>
                <li>betrifft unterschiedliche Berufsgruppen</li>
              </ul>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-xl border border-app-border bg-app-surface p-5">
                <h3 className="font-semibold text-app-heading">
                  Handlungsfelder
                </h3>

                <ul className="mt-3 list-disc space-y-2 pl-6">
                  <li>Freizeitsport</li>
                  <li>Gesundheitssport</li>
                  <li>Rehabilitationssport</li>
                  <li>Schulsport</li>
                </ul>
              </div>

              <div className="rounded-xl border border-app-border bg-app-surface p-5">
                <h3 className="font-semibold text-app-heading">
                  Berufsgruppen
                </h3>

                <ul className="mt-3 list-disc space-y-2 pl-6">
                  <li>Trainer:innen</li>
                  <li>Sportlehrkräfte</li>
                  <li>Erzieher:innen</li>
                  <li>Therapeut:innen</li>
                </ul>
              </div>
            </div>

            <InfoBox title="Merksatz">
              Sportpädagogik beschäftigt sich mit der Frage, wie sportliches
              und spielerisches Bewegen zielgruppen- und situationsgerecht
              vermittelt werden kann.
            </InfoBox>

            <FigurePlaceholder title="Grundriss der Sportpädagogik und Verbindung von Theorie und Praxis" />

            <div>
              <h3 className="text-xl font-semibold text-app-heading">
                Vermittlungsformen
              </h3>

              <p className="mt-3 leading-7">
                Im Zentrum der praktischen Sportpädagogik steht die{" "}
                <strong className="text-app-heading">
                  zielgruppenspezifische Vermittlung
                </strong>{" "}
                von Bewegung.
              </p>

              <p className="mt-4 leading-7">
                Trainer:innen und Lehrende müssen ihr Vorgehen
                situationsabhängig anpassen.
              </p>

              <p className="mt-5 font-medium text-app-heading">
                Einflussfaktoren sind insbesondere:
              </p>

              <ul className="mt-3 list-disc space-y-2 pl-6">
                <li>Zielgruppe</li>
                <li>Anbieter:innen bzw. Lehrende</li>
                <li>konkrete Rahmenbedingungen</li>
              </ul>

              <p className="mt-5 leading-7">
                Die Vermittlung kann zwischen sehr offenen und sehr stark
                angeleiteten Formen liegen.
              </p>

              <p className="mt-5 font-medium text-app-heading">
                Beispiele:
              </p>

              <ul className="mt-3 list-disc space-y-2 pl-6">
                <li>spielerisch-offene Angebote</li>
                <li>animierende Angebote</li>
                <li>stark instruierende Lernformen</li>
                <li>drillorientierte Lernformen</li>
              </ul>
            </div>
          </div>
        </section>

        {/* ===================================================== */}
        {/* 2.1 */}
        {/* ===================================================== */}

        <section
          id="didaktik-methodik"
          className="mt-16 scroll-mt-8"
        >
          <h2 className="border-b border-app-border pb-3 text-2xl font-bold">
            2.1 Didaktik, Methodik, Pädagogik und Sozialformen
          </h2>

          <div className="mt-8 space-y-12 text-app-text">
            {/* DIDAKTIK */}

            <div>
              <h3 className="text-xl font-semibold text-app-heading">
                Didaktik
              </h3>

              <p className="mt-3 leading-7">
                <strong className="text-app-heading">
                  Didaktik
                </strong>{" "}
                ist eine zentrale Disziplin der Pädagogik.
              </p>

              <div className="mt-5">
                <InfoBox title="Definition">
                  Didaktik bezeichnet die Praxis und Wissenschaft des
                  organisierten Lehrens und Lernens.
                </InfoBox>
              </div>

              <p className="mt-5 leading-7">
                Sie beschäftigt sich mit der Planung und Gestaltung von
                Unterricht, Training und Therapie.
              </p>

              <h4 className="mt-7 text-lg font-semibold text-app-heading">
                Die vier Fragen der praktischen Sportdidaktik
              </h4>

              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <div className="rounded-xl border border-app-border bg-app-surface p-5">
                  <p className="text-2xl font-bold text-app-heading">
                    WOZU?
                  </p>

                  <p className="mt-2 text-sm">
                    Frage nach den{" "}
                    <strong className="text-app-heading">
                      Lernzielen
                    </strong>
                    .
                  </p>
                </div>

                <div className="rounded-xl border border-app-border bg-app-surface p-5">
                  <p className="text-2xl font-bold text-app-heading">
                    WAS?
                  </p>

                  <p className="mt-2 text-sm">
                    Frage nach den{" "}
                    <strong className="text-app-heading">
                      Lerninhalten
                    </strong>
                    .
                  </p>
                </div>

                <div className="rounded-xl border border-app-border bg-app-surface p-5">
                  <p className="text-2xl font-bold text-app-heading">
                    WIE?
                  </p>

                  <p className="mt-2 text-sm">
                    Frage nach dem{" "}
                    <strong className="text-app-heading">
                      Vorgehen und den Methoden
                    </strong>
                    .
                  </p>
                </div>

                <div className="rounded-xl border border-app-border bg-app-surface p-5">
                  <p className="text-2xl font-bold text-app-heading">
                    WOMIT?
                  </p>

                  <p className="mt-2 text-sm">
                    Frage nach den{" "}
                    <strong className="text-app-heading">
                      Hilfsmitteln
                    </strong>
                    .
                  </p>
                </div>
              </div>

              <div className="mt-5">
                <InfoBox title="Merksatz">
                  WOZU = Ziel · WAS = Inhalt · WIE = Methode · WOMIT =
                  Hilfsmittel
                </InfoBox>
              </div>

              <FigurePlaceholder title="Zentrale Theoriebereiche der Didaktik" />
            </div>

            {/* GÜTEKRITERIEN */}

            <div>
              <h3 className="text-xl font-semibold text-app-heading">
                Gütekriterien guten Unterrichts
              </h3>

              <p className="mt-3 leading-7">
                Aus didaktischer Sicht werden acht Gütekriterien genannt:
              </p>

              <ol className="mt-5 space-y-3">
                {[
                  "Klare Strukturierung des Stundenablaufs",
                  "Fachliche Korrektheit der ausgewählten Inhalte",
                  "Methodenvielfalt",
                  "Klar formulierte und kontrollierte Lernziele",
                  "Hoher Anteil praktischer Übungszeit",
                  "Erfolgreiche Steuerung der Aufmerksamkeit der Teilnehmenden",
                  "Freundliche Atmosphäre",
                  "Regelmäßiges Feedback",
                ].map((item, index) => (
                  <li
                    key={item}
                    className="flex gap-3 rounded-xl border border-app-border bg-app-surface p-4"
                  >
                    <span className="font-bold text-app-heading">
                      {index + 1}.
                    </span>

                    <span>
                      {item}
                    </span>
                  </li>
                ))}
              </ol>

              <div className="mt-5">
                <InfoBox title="Merksatz">
                  Guter Unterricht ist strukturiert, fachlich korrekt,
                  methodisch abwechslungsreich, zielorientiert,
                  praxisreich, aufmerksamkeitssteuernd, freundlich und
                  feedbackorientiert.
                </InfoBox>
              </div>
            </div>

            {/* METHODIK */}

            <div>
              <h3 className="text-xl font-semibold text-app-heading">
                Methodik
              </h3>

              <p className="mt-3 leading-7">
                Das Wort{" "}
                <strong className="text-app-heading">
                  Methodik
                </strong>{" "}
                stammt aus dem Griechischen und bezeichnet die{" "}
                <strong className="text-app-heading">
                  Kunst des planmäßigen Vorgehens.
                </strong>
              </p>

              <ul className="mt-5 list-disc space-y-2 pl-6">
                <li>Methodik ist eine Dimension der Didaktik.</li>

                <li>
                  Sie beschreibt die vor einer Übungs-, Therapie- oder
                  Trainingseinheit festgelegte Art des Vorgehens.
                </li>

                <li>
                  Sie betrifft die Vermittlung von Wissen, Übungen und
                  Lernzielen.
                </li>

                <li>
                  Methodisches Handeln benötigt immer eine didaktische
                  Grundlage.
                </li>
              </ul>

              <div className="mt-5">
                <InfoBox title="Definition">
                  Methodik beschreibt das planmäßige Vorgehen bei der
                  Wissens- und Übungsvermittlung.
                </InfoBox>
              </div>

              <FigurePlaceholder title="Zusammenhang zwischen Didaktik und Methodik" />
            </div>

            {/* PLANUNGSPROZESS */}

            <div>
              <h3 className="text-xl font-semibold text-app-heading">
                Didaktik und Methodik im Planungsprozess
              </h3>

              <div className="mt-5 grid gap-4 md:grid-cols-3">
                <div className="rounded-xl border border-app-border bg-app-surface p-5">
                  <p className="text-sm text-app-faint">
                    1
                  </p>

                  <h4 className="mt-1 font-semibold text-app-heading">
                    Konzeption
                  </h4>

                  <ul className="mt-3 list-disc space-y-1 pl-5 text-sm">
                    <li>Didaktik</li>
                    <li>Methodik</li>
                  </ul>
                </div>

                <div className="rounded-xl border border-app-border bg-app-surface p-5">
                  <p className="text-sm text-app-faint">
                    2
                  </p>

                  <h4 className="mt-1 font-semibold text-app-heading">
                    Realisation
                  </h4>

                  <p className="mt-3 text-sm">
                    praktische Durchführung
                  </p>
                </div>

                <div className="rounded-xl border border-app-border bg-app-surface p-5">
                  <p className="text-sm text-app-faint">
                    3
                  </p>

                  <h4 className="mt-1 font-semibold text-app-heading">
                    Evaluation
                  </h4>

                  <p className="mt-3 text-sm">
                    Lernzielkontrolle
                  </p>
                </div>
              </div>

              <FigurePlaceholder title="Didaktik und Methodik im Gesamtkontext von Konzeption, Realisation und Evaluation" />
            </div>

            {/* VORÜBERLEGUNGEN */}

            <div>
              <h3 className="text-xl font-semibold text-app-heading">
                Methodisch-didaktische Vorüberlegungen
              </h3>

              <p className="mt-3 leading-7">
                Für die Stundenplanung müssen mindestens drei Fragen
                geklärt werden:
              </p>

              <div className="mt-5 space-y-3">
                <div className="rounded-xl border border-app-border bg-app-surface p-4">
                  <strong className="text-app-heading">
                    WOZU?
                  </strong>{" "}
                  Welches Vermittlungsziel soll erreicht werden?
                </div>

                <div className="rounded-xl border border-app-border bg-app-surface p-4">
                  <strong className="text-app-heading">
                    WAS?
                  </strong>{" "}
                  Welche Inhalte eignen sich zur Zielerreichung?
                </div>

                <div className="rounded-xl border border-app-border bg-app-surface p-4">
                  <strong className="text-app-heading">
                    WIE?
                  </strong>{" "}
                  Welche Methode und welche Hilfsmittel eignen sich für die
                  Vermittlung?
                </div>
              </div>

              <p className="mt-5 leading-7">
                Darauf aufbauend erfolgt die Auswahl von:
              </p>

              <ul className="mt-3 grid list-disc gap-2 pl-6 sm:grid-cols-2">
                <li>Lehrmethode</li>
                <li>Organisationsform</li>
                <li>Lernhilfen</li>
                <li>Lernschrittgrößen</li>
                <li>Führungsstil</li>
              </ul>
            </div>

            {/* GRUNDLAGEN METHODISCH-DIDAKTISCH */}

            <div>
              <h3 className="text-xl font-semibold text-app-heading">
                Grundlagen methodisch-didaktischen Handelns
              </h3>

              <div className="mt-5 grid gap-4 md:grid-cols-2">
                {[
                  {
                    title: "Sachgemäßheit",
                    text:
                      "Genaue Kenntnisse von Zielen und Inhalten, sachgemäße Lehrwege und geeignete Methoden.",
                  },
                  {
                    title: "Entwicklungsgemäßheit",
                    text:
                      "Lernziele und Inhalte an die Voraussetzungen der Zielgruppe anpassen und alters- bzw. zielgruppengemäße Lernverfahren einsetzen.",
                  },
                  {
                    title: "Anschaulichkeit",
                    text:
                      "Bewegungsabläufe verdeutlichen, verständliche Informationen geben und Übungen anschaulich vermitteln.",
                  },
                  {
                    title: "Lebensnähe",
                    text:
                      "Alltagsbezug herstellen und Möglichkeiten zum selbstständigen Üben und Trainieren vermitteln.",
                  },
                  {
                    title: "Kreativität und Spontaneität",
                    text:
                      "Bewegungsaufgaben einsetzen, eigenständige Lösungswege ermöglichen und Improvisation fördern.",
                  },
                  {
                    title: "Effektivität",
                    text:
                      "Verfügbare Zeit sinnvoll nutzen, Stunden sorgfältig planen und unnötige Wartezeiten reduzieren.",
                  },
                  {
                    title: "Partner- und Gemeinschaftsbezogenheit",
                    text:
                      "Eigenkompetenz fördern, soziale Erfahrungen ermöglichen, Rücksichtnahme und gegenseitige Anerkennung unterstützen.",
                  },
                  {
                    title: "Kontrollierbarkeit",
                    text:
                      "Das Erreichen individueller oder gruppenbezogener Ziele muss überprüfbar sein.",
                  },
                ].map((item) => (
                  <div
                    key={item.title}
                    className="rounded-xl border border-app-border bg-app-surface p-5"
                  >
                    <h4 className="font-semibold text-app-heading">
                      {item.title}
                    </h4>

                    <p className="mt-2 text-sm leading-6">
                      {item.text}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* SOZIALFORMEN */}

            <div>
              <h3 className="text-xl font-semibold text-app-heading">
                Sozial- und Organisationsformen
              </h3>

              <p className="mt-3 leading-7">
                <strong className="text-app-heading">
                  Sozialformen
                </strong>{" "}
                beschreiben die Anordnung bzw. Verteilung der Teilnehmenden
                während einer Unterrichts-, Übungs- oder Trainingseinheit.
              </p>

              <p className="mt-5 leading-7">
                Die gewählte Sozialform beeinflusst:
              </p>

              <ul className="mt-3 grid list-disc gap-2 pl-6 sm:grid-cols-2">
                <li>Kommunikation</li>
                <li>Interaktion</li>
                <li>Aktivierung der Teilnehmenden</li>
                <li>
                  Beziehung zwischen Teilnehmenden und Kursleitung
                </li>
              </ul>

              <div className="mt-8 space-y-8">
                <div>
                  <h4 className="text-lg font-semibold text-app-heading">
                    Frontalunterricht
                  </h4>

                  <ul className="mt-3 list-disc space-y-2 pl-6">
                    <li>Kursleitung steht vor der Gruppe.</li>
                    <li>
                      Teilnehmende sind auf die Kursleitung ausgerichtet.
                    </li>
                    <li>
                      Mögliche Anordnungen: geordnete Reihen oder wilder
                      Verband.
                    </li>
                  </ul>

                  <div className="mt-5 grid gap-4 md:grid-cols-2">
                    <div className="rounded-xl border border-app-border bg-app-surface p-5">
                      <h5 className="font-semibold text-app-heading">
                        Vorteile
                      </h5>

                      <ul className="mt-3 list-disc space-y-2 pl-6">
                        <li>gute Sicht auf Demonstrationen</li>
                        <li>leichte Anleitung großer Gruppen</li>
                        <li>klare Steuerung</li>
                      </ul>
                    </div>

                    <div className="rounded-xl border border-app-border bg-app-surface p-5">
                      <h5 className="font-semibold text-app-heading">
                        Nachteile
                      </h5>

                      <ul className="mt-3 list-disc space-y-2 pl-6">
                        <li>
                          geringe Interaktion zwischen Teilnehmenden
                        </li>
                        <li>
                          starke Zentrierung auf die Kursleitung
                        </li>
                      </ul>
                    </div>
                  </div>

                  <FigurePlaceholder title="Geordneter Frontalunterricht und Frontalunterricht im wilden Verband" />
                </div>

                <div>
                  <h4 className="text-lg font-semibold text-app-heading">
                    Parlamentarische Sozialform
                  </h4>

                  <p className="mt-3 leading-7">
                    Teilnehmende sind so angeordnet, dass Austausch und
                    Kommunikation erleichtert werden.
                  </p>
                </div>

                <div>
                  <h4 className="text-lg font-semibold text-app-heading">
                    Halbkreis oder Kreis
                  </h4>

                  <ul className="mt-3 list-disc space-y-2 pl-6">
                    <li>guter Blickkontakt</li>
                    <li>bessere Kommunikation innerhalb der Gruppe</li>
                    <li>geeignet für Demonstrationen</li>
                    <li>geeignet für Gespräche</li>
                    <li>geeignet für Reflexionsphasen</li>
                  </ul>

                  <FigurePlaceholder title="Parlamentarische Sozialform und Halbkreis" />
                </div>

                <div>
                  <h4 className="text-lg font-semibold text-app-heading">
                    Paar-, Dreier- und Kleingruppenarbeit
                  </h4>

                  <ul className="mt-3 list-disc space-y-2 pl-6">
                    <li>
                      fördert die Interaktion zwischen Teilnehmenden
                    </li>

                    <li>
                      erhöht die aktive Beteiligung
                    </li>

                    <li>
                      erschwert passives Zurückziehen einzelner Personen
                    </li>

                    <li>
                      ermöglicht gegenseitiges Feedback
                    </li>

                    <li>
                      fördert den Austausch
                    </li>
                  </ul>

                  <p className="mt-5 leading-7">
                    Besonders Kleingruppen ermöglichen intensive
                    Kommunikation, hohes Teilnehmer:innenfeedback und
                    selbstständiges Arbeiten.
                  </p>

                  <FigurePlaceholder title="Zweier- und Dreiergruppen sowie Kleingruppenarbeit" />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ===================================================== */}
        {/* 2.2 */}
        {/* ===================================================== */}

        <section
          id="unterrichtsformen"
          className="mt-16 scroll-mt-8"
        >
          <h2 className="border-b border-app-border pb-3 text-2xl font-bold">
            2.2 Unterrichtsformen
          </h2>

          <div className="mt-8 space-y-10 text-app-text">
            <div>
              <h3 className="text-xl font-semibold text-app-heading">
                Drei Hauptarten des Unterrichts
              </h3>

              <div className="mt-5 grid gap-4 md:grid-cols-3">
                <div className="rounded-xl border border-app-border bg-app-surface p-5">
                  <p className="text-sm text-app-faint">
                    1
                  </p>

                  <p className="mt-1 font-semibold text-app-heading">
                    Geführter Unterricht
                  </p>
                </div>

                <div className="rounded-xl border border-app-border bg-app-surface p-5">
                  <p className="text-sm text-app-faint">
                    2
                  </p>

                  <p className="mt-1 font-semibold text-app-heading">
                    Offener Unterricht
                  </p>
                </div>

                <div className="rounded-xl border border-app-border bg-app-surface p-5">
                  <p className="text-sm text-app-faint">
                    3
                  </p>

                  <p className="mt-1 font-semibold text-app-heading">
                    Interaktiver Unterricht
                  </p>
                </div>
              </div>

              <FigurePlaceholder title="Drei Arten von Unterricht – geführt, offen und interaktiv" />
            </div>

            <div>
              <h3 className="text-xl font-semibold text-app-heading">
                Geführter Unterricht
              </h3>

              <ul className="mt-4 list-disc space-y-2 pl-6">
                <li>entspricht einem stark angeleiteten Lernen</li>
                <li>besitzt überwiegend deduktive Merkmale</li>
                <li>
                  die Kursleitung gibt Inhalte, Übungen und Lösungswege
                  weitgehend vor
                </li>
              </ul>

              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <div className="rounded-xl border border-app-border bg-app-surface p-5">
                  <h4 className="font-semibold text-app-heading">
                    Vorteile
                  </h4>

                  <ul className="mt-3 list-disc space-y-2 pl-6">
                    <li>hohe Steuerbarkeit</li>
                    <li>klare Vorgaben</li>
                    <li>effiziente Vermittlung</li>
                    <li>geeignet für unerfahrene Teilnehmende</li>
                    <li>
                      geeignet bei sicherheitsrelevanten Inhalten
                    </li>
                  </ul>
                </div>

                <div className="rounded-xl border border-app-border bg-app-surface p-5">
                  <h4 className="font-semibold text-app-heading">
                    Nachteile
                  </h4>

                  <ul className="mt-3 list-disc space-y-2 pl-6">
                    <li>geringer Entscheidungsspielraum</li>
                    <li>weniger Eigenständigkeit</li>
                    <li>
                      geringere Einbindung der Teilnehmenden
                    </li>
                  </ul>
                </div>
              </div>

              <p className="mt-5 leading-7">
                Im{" "}
                <strong className="text-app-heading">
                  Leistungssport
                </strong>{" "}
                treten geführte Unterrichtsformen häufig auf. Gründe sind
                insbesondere die klare Rollenverteilung und die
                Verantwortung der Trainer:innen für die
                Leistungsoptimierung.
              </p>
            </div>

            <div>
              <h3 className="text-xl font-semibold text-app-heading">
                Offener Unterricht
              </h3>

              <ul className="mt-4 list-disc space-y-2 pl-6">
                <li>entspricht stärker selbstgesteuertem Lernen</li>
                <li>besitzt überwiegend induktive Merkmale</li>
                <li>
                  Teilnehmende erhalten größere Entscheidungs- und
                  Handlungsspielräume
                </li>
              </ul>

              <p className="mt-5 font-medium text-app-heading">
                Mögliche Formen:
              </p>

              <ul className="mt-3 list-disc space-y-2 pl-6">
                <li>Bewegungsaufgaben</li>
                <li>offene Aufgabenstellungen</li>
                <li>Bewegungsprojekte</li>
              </ul>

              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <div className="rounded-xl border border-app-border bg-app-surface p-5">
                  <h4 className="font-semibold text-app-heading">
                    Vorteile
                  </h4>

                  <ul className="mt-3 list-disc space-y-2 pl-6">
                    <li>fördert Selbstständigkeit</li>
                    <li>fördert Eigenaktivität</li>
                    <li>
                      ermöglicht eigene Bewegungserfahrungen
                    </li>
                  </ul>
                </div>

                <div className="rounded-xl border border-app-border bg-app-surface p-5">
                  <h4 className="font-semibold text-app-heading">
                    Nachteile
                  </h4>

                  <ul className="mt-3 list-disc space-y-2 pl-6">
                    <li>Lernfokus kann verloren gehen</li>
                    <li>
                      ungeeignet bei fehlender Vorerfahrung
                    </li>
                    <li>
                      erhöhtes Risiko für Fehlbewegungen oder Verletzungen
                      bei ungeeigneten Inhalten
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-xl font-semibold text-app-heading">
                Interaktiver Unterricht
              </h3>

              <p className="mt-3 leading-7">
                Interaktiver Unterricht basiert auf{" "}
                <strong className="text-app-heading">
                  kooperativem und dialogischem Lernen und Lehren.
                </strong>
              </p>

              <p className="mt-4 leading-7">
                Teilnehmende werden aktiv in den Lehr- und Lernprozess
                eingebunden.
              </p>

              <ul className="mt-4 list-disc space-y-2 pl-6">
                <li>Inhalte auswählen</li>
                <li>Übungen vorstellen</li>
                <li>Übungen anleiten</li>
                <li>Verantwortung übernehmen</li>
              </ul>

              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <div className="rounded-xl border border-app-border bg-app-surface p-5">
                  <h4 className="font-semibold text-app-heading">
                    Vorteile
                  </h4>

                  <ul className="mt-3 list-disc space-y-2 pl-6">
                    <li>fördert Selbstkompetenz</li>
                    <li>fördert Eigenverantwortung</li>
                    <li>fördert soziale Bindung</li>
                    <li>
                      verbessert Möglichkeiten des Transfers in den Alltag
                    </li>
                  </ul>
                </div>

                <div className="rounded-xl border border-app-border bg-app-surface p-5">
                  <h4 className="font-semibold text-app-heading">
                    Nachteile
                  </h4>

                  <ul className="mt-3 list-disc space-y-2 pl-6">
                    <li>
                      schwieriger bei neuen oder unerfahrenen
                      Teilnehmenden
                    </li>
                    <li>setzt Kooperationsfähigkeit voraus</li>
                    <li>nicht für jeden Inhalt geeignet</li>
                  </ul>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-xl font-semibold text-app-heading">
                Unterrichtsform und Zielgruppe
              </h3>

              <p className="mt-3 leading-7">
                Die Auswahl hängt insbesondere ab von:
              </p>

              <ul className="mt-4 grid list-disc gap-2 pl-6 sm:grid-cols-2">
                <li>Erfahrungsgrad</li>
                <li>sportlicher Vorerfahrung</li>
                <li>gesundheitlichen Begleitumständen</li>
                <li>fachlicher Kompetenz</li>
                <li>Verletzungsrisiko</li>
                <li>Zielsetzung</li>
              </ul>

              <p className="mt-5 leading-7">
                In Breitensport, Gesundheitssport und Rehabilitation ist
                ein{" "}
                <strong className="text-app-heading">
                  Wechsel verschiedener Unterrichtsformen
                </strong>{" "}
                sinnvoll.
              </p>
            </div>
          </div>
        </section>

        {/* ===================================================== */}
        {/* 2.3 */}
        {/* ===================================================== */}

        <section
          id="stundenplanung"
          className="mt-16 scroll-mt-8"
        >
          <h2 className="border-b border-app-border pb-3 text-2xl font-bold">
            2.3 Stundenverlaufsplanung: Aufbau einer Übungs-, Therapie- oder
            Trainingseinheit
          </h2>

          <div className="mt-8 space-y-10 text-app-text">
            <div>
              <h3 className="text-xl font-semibold text-app-heading">
                Bedeutung der Stundenplanung
              </h3>

              <p className="mt-3 leading-7">
                Eine qualifizierte Stundenplanung ist eine wesentliche
                Voraussetzung für eine gute Unterrichts-, Trainings- oder
                Therapiestunde.
              </p>

              <p className="mt-5 leading-7">
                Ein schriftlicher Stundenverlaufsplan:
              </p>

              <ul className="mt-3 list-disc space-y-2 pl-6">
                <li>konkretisiert das Stundenziel</li>
                <li>strukturiert die geplante Vermittlung</li>
                <li>
                  dient als gemeinsame Grundlage für Beteiligte
                </li>
                <li>unterstützt die Qualitätssicherung</li>
              </ul>

              <div className="mt-5">
                <InfoBox title="Merksatz">
                  Ein Stundenverlaufsplan ist eine Absichtserklärung. Er gibt
                  den geplanten Verlauf vor, muss aber in der Praxis
                  situationsgerecht angepasst werden können.
                </InfoBox>
              </div>

              <p className="mt-5 leading-7">
                Abweichungen vom Plan sind möglich, sollten jedoch
                begründbar sein.
              </p>
            </div>

            <div>
              <h3 className="text-xl font-semibold text-app-heading">
                Bedingungsfeldanalyse
              </h3>

              <p className="mt-3 leading-7">
                Die{" "}
                <strong className="text-app-heading">
                  Bedingungsfeldanalyse
                </strong>{" "}
                ist der erste Schritt der Stundenplanung.
              </p>

              <p className="mt-5 leading-7">
                Sie berücksichtigt:
              </p>

              <ul className="mt-3 list-disc space-y-2 pl-6">
                <li>
                  individuelle Voraussetzungen der Teilnehmenden
                </li>
                <li>Kompetenzen der Stundenleitung</li>
                <li>institutionelle Voraussetzungen</li>
                <li>mögliche curriculare Voraussetzungen</li>
                <li>organisatorische Rahmenbedingungen</li>
                <li>räumliche Rahmenbedingungen</li>
              </ul>

              <p className="mt-5 leading-7">
                Anschließend werden Stundenziele und Inhalte mit der
                konkreten Gruppe und Situation in Beziehung gesetzt.
              </p>
            </div>

            <div>
              <h3 className="text-xl font-semibold text-app-heading">
                Voraussetzungen der Teilnehmenden
              </h3>

              <p className="mt-3 leading-7">
                Zu Beginn der Arbeit mit einer Gruppe sollten unter anderem
                erhoben werden:
              </p>

              <ul className="mt-4 grid list-disc gap-2 pl-6 sm:grid-cols-2">
                <li>Alter</li>
                <li>sportliche Vorerfahrung</li>
                <li>persönliche Ziele</li>
                <li>gesundheitliche Beeinträchtigungen</li>
                <li>Leistungsstand</li>
              </ul>

              <p className="mt-5 leading-7">
                Gruppen sind häufig{" "}
                <strong className="text-app-heading">
                  heterogen.
                </strong>
              </p>

              <p className="mt-3 leading-7">
                Diese Unterschiede müssen bei der Planung berücksichtigt
                und möglichst sinnvoll genutzt werden.
              </p>
            </div>

            <div>
              <h3 className="text-xl font-semibold text-app-heading">
                Räumliche und organisatorische Rahmenbedingungen
              </h3>

              <ul className="mt-4 grid list-disc gap-2 pl-6 sm:grid-cols-2">
                <li>Raumgröße</li>
                <li>Raumform</li>
                <li>Bodenbeschaffenheit</li>
                <li>Belüftung</li>
                <li>vorhandene Geräte</li>
                <li>Materiallagerung</li>
                <li>mögliche Gefahrenstellen</li>
                <li>Umkleiden</li>
                <li>organisatorische Abläufe</li>
              </ul>
            </div>

            <div>
              <h3 className="text-xl font-semibold text-app-heading">
                Klassischer Aufbau einer Einheit
              </h3>

              <div className="mt-5 grid gap-4 md:grid-cols-3">
                <div className="rounded-xl border border-app-border bg-app-surface p-5">
                  <p className="text-sm text-app-faint">
                    1
                  </p>

                  <h4 className="mt-1 font-semibold text-app-heading">
                    Einleitung und Aufwärmen
                  </h4>

                  <ul className="mt-3 list-disc space-y-2 pl-5 text-sm">
                    <li>Organismus aufwärmen</li>
                    <li>
                      körperlich und psychisch vorbereiten
                    </li>
                    <li>auf die Stunde einstimmen</li>
                    <li>an Vorkenntnisse anknüpfen</li>
                  </ul>
                </div>

                <div className="rounded-xl border border-app-border bg-app-surface p-5">
                  <p className="text-sm text-app-faint">
                    2
                  </p>

                  <h4 className="mt-1 font-semibold text-app-heading">
                    Hauptteil
                  </h4>

                  <ul className="mt-3 list-disc space-y-2 pl-5 text-sm">
                    <li>motorische Fertigkeiten erlernen</li>
                    <li>motorische Fertigkeiten festigen</li>
                    <li>körperliche Fähigkeiten entwickeln</li>
                    <li>physische Stundenziele erreichen</li>
                    <li>
                      psychosoziale Stundenziele erreichen
                    </li>
                  </ul>
                </div>

                <div className="rounded-xl border border-app-border bg-app-surface p-5">
                  <p className="text-sm text-app-faint">
                    3
                  </p>

                  <h4 className="mt-1 font-semibold text-app-heading">
                    Ausklang
                  </h4>

                  <ul className="mt-3 list-disc space-y-2 pl-5 text-sm">
                    <li>Auswertung</li>
                    <li>Feedback</li>
                    <li>Relaxation</li>
                    <li>Auflockerung</li>
                  </ul>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-xl font-semibold text-app-heading">
                Inhalte des schriftlichen Stundenverlaufsplans
              </h3>

              <p className="mt-3 leading-7">
                Bei der Planung der einzelnen Stundenabschnitte werden
                berücksichtigt:
              </p>

              <div className="mt-5 grid gap-3 sm:grid-cols-2 md:grid-cols-5">
                {[
                  "Zeit",
                  "Ziele",
                  "Inhalte",
                  "Organisationsform",
                  "Didaktischer Kommentar",
                ].map((item) => (
                  <div
                    key={item}
                    className="rounded-xl border border-app-border bg-app-surface p-4 text-center text-sm font-medium text-app-heading"
                  >
                    {item}
                  </div>
                ))}
              </div>

              <p className="mt-5 leading-7">
                Zusätzlich können Phase, Materialien, Sozialform und
                methodische Hinweise enthalten sein.
              </p>

              <p className="mt-4 leading-7">
                Ein Stundenverlaufsplan ist in der Regel{" "}
                <strong className="text-app-heading">
                  tabellarisch aufgebaut.
                </strong>
              </p>

              <FigurePlaceholder title="Exemplarischer Aufbau eines Stundenverlaufsplans" />
            </div>

            <div>
              <h3 className="text-xl font-semibold text-app-heading">
                Vorteile eines Stundenverlaufsplans
              </h3>

              <ul className="mt-4 list-disc space-y-2 pl-6">
                <li>strukturiert die Durchführung</li>
                <li>
                  zwingt zur vorherigen Auseinandersetzung mit Zielen,
                  Inhalten, Methoden und Organisation
                </li>
                <li>dient der Qualitätssicherung</li>
                <li>ermöglicht eine spätere Evaluation</li>
                <li>erleichtert den Austausch mit Kolleg:innen</li>
                <li>
                  kann bei Akkreditierungs- oder
                  Qualitätssicherungsverfahren benötigt werden
                </li>
                <li>
                  ermöglicht leichter einen Ersatz der Kursleitung bei
                  kurzfristigem Ausfall
                </li>
              </ul>
            </div>
          </div>
        </section>

        {/* ===================================================== */}
        {/* 2.4 */}
        {/* ===================================================== */}

        <section
          id="uebungsreihen"
          className="mt-16 scroll-mt-8"
        >
          <h2 className="border-b border-app-border pb-3 text-2xl font-bold">
            2.4 Methodische Übungsreihen und Vermittlungsmethoden
          </h2>

          <div className="mt-8 space-y-12 text-app-text">
            <div>
              <h3 className="text-xl font-semibold text-app-heading">
                Induktive Methode
              </h3>

              <p className="mt-3 leading-7">
                Bei der{" "}
                <strong className="text-app-heading">
                  induktiven Methode
                </strong>{" "}
                steht das eigenständige Üben der Lernenden im Mittelpunkt.
              </p>

              <p className="mt-3 leading-7">
                Sie wird auch als{" "}
                <strong className="text-app-heading">
                  Bottom-up-Ansatz
                </strong>{" "}
                beschrieben.
              </p>

              <p className="mt-5 font-medium text-app-heading">
                Merkmale:
              </p>

              <ul className="mt-3 list-disc space-y-2 pl-6">
                <li>hoher Handlungsspielraum</li>
                <li>eigene Bewegungserfahrungen</li>
                <li>selbstständiges Erproben</li>
                <li>
                  individuelle Hilfen durch die Lehrperson
                </li>
                <li>spielerisches Lernen</li>
                <li>Selbsttätigkeit und Eigenständigkeit</li>
              </ul>

              <h4 className="mt-7 text-lg font-semibold text-app-heading">
                Freie Bewegungsaufgaben
              </h4>

              <ul className="mt-3 list-disc space-y-2 pl-6">
                <li>keine festen Lösungsvorgaben</li>
                <li>verschiedene Lösungen möglich</li>
                <li>freies Ausprobieren</li>
                <li>Sammeln eigener Bewegungserfahrungen</li>
              </ul>

              <h4 className="mt-7 text-lg font-semibold text-app-heading">
                Gebundene Bewegungsaufgaben
              </h4>

              <ul className="mt-3 list-disc space-y-2 pl-6">
                <li>eingeschränkter Freiraum</li>
                <li>präzisere Aufgabenstellung</li>
                <li>
                  systematisches Sammeln von Bewegungserfahrungen
                </li>
              </ul>

              <div className="mt-5">
                <InfoBox title="Möglicher Ablauf">
                  Erproben → Herausstellen → Lösung → Korrektur → Üben
                </InfoBox>
              </div>

              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <div className="rounded-xl border border-app-border bg-app-surface p-5">
                  <h4 className="font-semibold text-app-heading">
                    Vorteile
                  </h4>

                  <ul className="mt-3 list-disc space-y-2 pl-6">
                    <li>fördert Selbstständigkeit</li>
                    <li>fördert Eigenkompetenz</li>
                    <li>ermöglicht individuelle Lösungswege</li>
                  </ul>
                </div>

                <div className="rounded-xl border border-app-border bg-app-surface p-5">
                  <h4 className="font-semibold text-app-heading">
                    Nachteile
                  </h4>

                  <ul className="mt-3 list-disc space-y-2 pl-6">
                    <li>
                      Gefahr des Erlernens falscher Bewegungsmuster
                    </li>
                    <li>nicht für jede Bewegung geeignet</li>
                    <li>teilweise höherer Zeitbedarf</li>
                  </ul>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-xl font-semibold text-app-heading">
                Deduktive Methode
              </h3>

              <p className="mt-3 leading-7">
                Bei der{" "}
                <strong className="text-app-heading">
                  deduktiven Methode
                </strong>{" "}
                gibt die Lehrperson entscheidende Hilfen und Lösungswege vor.
              </p>

              <p className="mt-5 font-medium text-app-heading">
                Merkmale:
              </p>

              <ul className="mt-3 list-disc space-y-2 pl-6">
                <li>klare Bewegungsanweisungen</li>
                <li>Bewegungsvorschriften</li>
                <li>
                  schnelle Vermittlung einer Bewegungsvorstellung
                </li>
                <li>geringe Entscheidungsfreiheit</li>
                <li>starke Steuerung durch die Lehrperson</li>
              </ul>

              <p className="mt-5 font-medium text-app-heading">
                Typische Formen:
              </p>

              <ul className="mt-3 list-disc space-y-2 pl-6">
                <li>Vorzeigen und Nachmachen</li>
                <li>Beschreiben und Erklären</li>
                <li>Bewegungsanweisung</li>
                <li>Bewegungshilfen</li>
                <li>Bewegungskorrektur</li>
              </ul>

              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <div className="rounded-xl border border-app-border bg-app-surface p-5">
                  <h4 className="font-semibold text-app-heading">
                    Vorteile
                  </h4>

                  <ul className="mt-3 list-disc space-y-2 pl-6">
                    <li>schnelle Zielerreichung</li>
                    <li>hohe Kontrolle</li>
                    <li>
                      geeignet bei unverzichtbaren Fertigkeiten
                    </li>
                    <li>
                      geeignet in sportlichen Leistungsgruppen
                    </li>
                  </ul>
                </div>

                <div className="rounded-xl border border-app-border bg-app-surface p-5">
                  <h4 className="font-semibold text-app-heading">
                    Nachteile
                  </h4>

                  <ul className="mt-3 list-disc space-y-2 pl-6">
                    <li>geringer Freiraum</li>
                    <li>weniger Eigenständigkeit</li>
                    <li>kann in Reinform starr wirken</li>
                  </ul>
                </div>
              </div>

              <div className="mt-5">
                <InfoBox title="Merksatz">
                  Induktiv = Lernende suchen den Weg.
                  <br />
                  Deduktiv = Lehrende geben den Weg vor.
                </InfoBox>
              </div>
            </div>

            <div>
              <h3 className="text-xl font-semibold text-app-heading">
                Methodische Übungsreihen
              </h3>

              <p className="mt-3 leading-7">
                <strong className="text-app-heading">
                  Methodische Übungsreihen
                </strong>{" "}
                sind nach methodischen Grundsätzen geordnete Übungsfolgen.
              </p>

              <p className="mt-5 leading-7">
                Ziel ist:
              </p>

              <ul className="mt-3 list-disc space-y-2 pl-6">
                <li>
                  das Erlernen einer bestimmten motorischen Fertigkeit
                </li>
                <li>das Erreichen einer Zielübung</li>
                <li>
                  die Entwicklung eines bestimmten Ausprägungsgrades
                  motorischer Eigenschaften
                </li>
              </ul>

              <p className="mt-5 leading-7">
                Die Übungen werden durch die Lehrperson vorgegeben. Der
                Schwierigkeitsgrad steigt schrittweise an.
              </p>

              <p className="mt-4 leading-7">
                Die methodische Übungsreihe gehört zu den{" "}
                <strong className="text-app-heading">
                  deduktiven Vermittlungsformen.
                </strong>
              </p>

              <h4 className="mt-7 text-lg font-semibold text-app-heading">
                Grundprinzipien methodischer Übungsreihen
              </h4>

              <ol className="mt-5 space-y-3">
                {[
                  "Vom Leichten zum Schweren",
                  "Vom Bekannten zum Unbekannten",
                  "Vom Einfachen zum Komplexen",
                  "Von stabil zu instabil",
                  "Von geführt zu ungeführt bzw. frei",
                ].map((item, index) => (
                  <li
                    key={item}
                    className="flex gap-3 rounded-xl border border-app-border bg-app-surface p-4"
                  >
                    <span className="font-bold text-app-heading">
                      {index + 1}.
                    </span>

                    <span>
                      {item}
                    </span>
                  </li>
                ))}
              </ol>

              <div className="mt-5">
                <InfoBox title="Merksatz">
                  Schwierigkeitsgrad und Selbstständigkeit werden
                  schrittweise erhöht.
                </InfoBox>
              </div>
            </div>

            <div>
              <h3 className="text-xl font-semibold text-app-heading">
                Methodische Spielreihen
              </h3>

              <ul className="mt-4 list-disc space-y-2 pl-6">
                <li>
                  Methodische Spielreihen sind ebenfalls zielgerichtet
                  aufgebaut.
                </li>
                <li>
                  Im Gegensatz zur Übungsreihe werden jedoch Spielformen
                  eingesetzt.
                </li>
                <li>
                  Die Teilnehmenden werden schrittweise an anspruchsvollere
                  Spielregeln und Spielsituationen herangeführt.
                </li>
              </ul>
            </div>

            <div>
              <h3 className="text-xl font-semibold text-app-heading">
                Analytisch-synthetische Methode
              </h3>

              <p className="mt-3 leading-7">
                Bei der analytisch-synthetischen Methode wird eine
                Gesamtbewegung zunächst in einzelne Teile zerlegt.
              </p>

              <ol className="mt-5 space-y-3">
                <li className="rounded-xl border border-app-border bg-app-surface p-4">
                  1. Einzelteile isoliert üben.
                </li>

                <li className="rounded-xl border border-app-border bg-app-surface p-4">
                  2. Einzelteile beherrschen.
                </li>

                <li className="rounded-xl border border-app-border bg-app-surface p-4">
                  3. Einzelteile zur Gesamtbewegung zusammensetzen.
                </li>
              </ol>

              <p className="mt-5 leading-7">
                Geeignet für schwierige und komplexe Bewegungsabläufe.
              </p>

              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <div className="rounded-xl border border-app-border bg-app-surface p-5">
                  <h4 className="font-semibold text-app-heading">
                    Vorteile
                  </h4>

                  <ul className="mt-3 list-disc space-y-2 pl-6">
                    <li>
                      komplexe Bewegungen können schrittweise erlernt werden
                    </li>
                    <li>
                      einzelne Fehler können gezielt bearbeitet werden
                    </li>
                  </ul>
                </div>

                <div className="rounded-xl border border-app-border bg-app-surface p-5">
                  <h4 className="font-semibold text-app-heading">
                    Nachteil
                  </h4>

                  <p className="mt-3 leading-7">
                    Beim Zusammensetzen können zusätzliche bzw. ungewollte
                    Bewegungen entstehen.
                  </p>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-xl font-semibold text-app-heading">
                Ganzheitsmethode
              </h3>

              <p className="mt-3 leading-7">
                Bei der{" "}
                <strong className="text-app-heading">
                  Ganzheitsmethode
                </strong>{" "}
                wird die Gesamtbewegung von Beginn an vollständig geübt.
              </p>

              <p className="mt-5 font-medium text-app-heading">
                Geeignet für:
              </p>

              <ul className="mt-3 list-disc space-y-2 pl-6">
                <li>einfache Bewegungsabläufe</li>
                <li>
                  Bewegungen, die ohne Zerlegung erlernbar sind
                </li>
              </ul>

              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <div className="rounded-xl border border-app-border bg-app-surface p-5">
                  <h4 className="font-semibold text-app-heading">
                    Vorteil
                  </h4>

                  <p className="mt-3">
                    Lernziel wird direkt angesteuert.
                  </p>
                </div>

                <div className="rounded-xl border border-app-border bg-app-surface p-5">
                  <h4 className="font-semibold text-app-heading">
                    Nachteil
                  </h4>

                  <p className="mt-3">
                    Bei komplexen oder schwierigen Bewegungen häufig
                    ungeeignet.
                  </p>
                </div>
              </div>

              <div className="mt-5">
                <InfoBox title="Merksatz">
                  Analytisch-synthetisch = Teile lernen und anschließend
                  zusammensetzen.
                  <br />
                  Ganzheitsmethode = Gesamtbewegung von Beginn an üben.
                </InfoBox>
              </div>
            </div>
          </div>
        </section>

        {/* ===================================================== */}
        {/* 2.5 */}
        {/* ===================================================== */}

        <section
          id="trainingsprinzipien"
          className="mt-16 scroll-mt-8"
        >
          <h2 className="border-b border-app-border pb-3 text-2xl font-bold">
            2.5 Trainingsprinzipien
          </h2>

          <div className="mt-8 space-y-10 text-app-text">
            <div>
              <h3 className="text-xl font-semibold text-app-heading">
                Bedeutung für die Stundenplanung
              </h3>

              <p className="mt-3 leading-7">
                Trainingsprinzipien bestimmen, wie sportliche Inhalte
                gestaltet werden sollten.
              </p>

              <p className="mt-5 leading-7">
                Die Auswahl hängt unter anderem ab von:
              </p>

              <ul className="mt-3 grid list-disc gap-2 pl-6 sm:grid-cols-2">
                <li>Ziel der Kursreihe</li>
                <li>Ziel der Kursstunde</li>
                <li>Zielgruppe</li>
                <li>Alter</li>
                <li>Geschlecht</li>
                <li>Erfahrung</li>
                <li>gesundheitlichen Begleitumständen</li>
                <li>Art der Gruppe</li>
              </ul>

              <p className="mt-5 leading-7">
                Grundlegend können Trainingsprinzipien eingeteilt werden in
                Prinzipien, die:
              </p>

              <ol className="mt-4 list-decimal space-y-2 pl-6">
                <li>eine Anpassung auslösen</li>
                <li>Anpassungserscheinungen optimieren</li>
                <li>
                  Anpassungen in spezifische Richtungen lenken
                </li>
              </ol>
            </div>

            <div>
              <h3 className="text-xl font-semibold text-app-heading">
                Neun Trainingsprinzipien
              </h3>

              <ol className="mt-5 space-y-3">
                {[
                  "Prinzip des trainingswirksamen Belastungsreizes",
                  "Prinzip der progressiven Belastungssteigerung",
                  "Prinzip der Kontinuität",
                  "Prinzip der Variation der Trainingsbelastung",
                  "Prinzip der individuellen Belastung",
                  "Prinzip der richtigen Belastungsfolge",
                  "Prinzip der optimalen Gestaltung von Belastung und Erholung",
                  "Prinzip der Trainingsbelastung durch Periodisierung und Zyklisierung",
                  "Prinzip der systematischen Trainingssteuerung",
                ].map((item, index) => (
                  <li
                    key={item}
                    className="flex gap-3 rounded-xl border border-app-border bg-app-surface p-4"
                  >
                    <span className="font-bold text-app-heading">
                      {index + 1}.
                    </span>

                    <span>
                      {item}
                    </span>
                  </li>
                ))}
              </ol>
            </div>

            <div>
              <h3 className="text-xl font-semibold text-app-heading">
                Prinzip des trainingswirksamen Belastungsreizes
              </h3>

              <ul className="mt-4 list-disc space-y-2 pl-6">
                <li>
                  Ein Reiz muss ausreichend stark sein, um eine Anpassung
                  hervorzurufen.
                </li>
                <li>
                  Die erforderliche Reizstärke hängt von Ziel,
                  Leistungsstand und Trainingszustand ab.
                </li>
              </ul>

              <p className="mt-5 leading-7">
                Beispiel: Für Muskelhypertrophie sind andere Belastungen
                notwendig als für Kraftausdauer. Bei untrainierten Personen
                reichen bereits geringere Belastungen für Anpassungen aus.
              </p>
            </div>

            <div>
              <h3 className="text-xl font-semibold text-app-heading">
                Prinzip der progressiven Belastungssteigerung
              </h3>

              <ul className="mt-4 list-disc space-y-2 pl-6">
                <li>
                  Mit zunehmender Anpassung muss die Belastung schrittweise
                  gesteigert werden.
                </li>
                <li>
                  Andernfalls reicht der bisherige Reiz möglicherweise nicht
                  mehr aus.
                </li>
                <li>
                  Dokumentierte Stundenverlaufspläne helfen dabei,
                  Progressionen nachzuvollziehen.
                </li>
              </ul>
            </div>

            <div>
              <h3 className="text-xl font-semibold text-app-heading">
                Prinzip der Kontinuität
              </h3>

              <ul className="mt-4 list-disc space-y-2 pl-6">
                <li>
                  Trainingswirkungen entstehen durch regelmäßige
                  Wiederholung.
                </li>
                <li>
                  Einmalige Reize besitzen nur geringe bzw. kurzfristige
                  Wirkung.
                </li>
              </ul>

              <div className="mt-5">
                <InfoBox title="Merksatz">
                  Nicht jede Stunde muss komplett anders aussehen. Wirksame
                  Trainingsinhalte benötigen Kontinuität.
                </InfoBox>
              </div>
            </div>

            <div>
              <h3 className="text-xl font-semibold text-app-heading">
                Prinzip der Variation der Trainingsbelastung
              </h3>

              <ul className="mt-4 list-disc space-y-2 pl-6">
                <li>
                  Trainingsinhalte und Trainingsmittel sollten sinnvoll
                  variiert werden.
                </li>
                <li>
                  Variation kann unterschiedliche Reize setzen,
                  Selbstkompetenz fördern und die Alltagsübertragung
                  verbessern.
                </li>
                <li>
                  Zu starke Variation kann jedoch dem Prinzip der Kontinuität
                  widersprechen.
                </li>
              </ul>
            </div>

            <div>
              <h3 className="text-xl font-semibold text-app-heading">
                Prinzip der individuellen Belastung
              </h3>

              <p className="mt-3 leading-7">
                Die Belastung muss an die Voraussetzungen der Teilnehmenden
                angepasst werden.
              </p>

              <p className="mt-5 font-medium text-app-heading">
                Einflussfaktoren:
              </p>

              <ul className="mt-3 grid list-disc gap-2 pl-6 sm:grid-cols-2">
                <li>Alter</li>
                <li>Geschlecht</li>
                <li>Leistungsstand</li>
                <li>gesundheitliche Begleitumstände</li>
                <li>Trainingsziel</li>
                <li>Erfahrung</li>
              </ul>

              <div className="mt-5">
                <InfoBox title="Merksatz">
                  Gleiche Übungen und Belastungen sind nicht automatisch für
                  alle Teilnehmenden gleichermaßen geeignet.
                </InfoBox>
              </div>
            </div>

            <div>
              <h3 className="text-xl font-semibold text-app-heading">
                Prinzip der richtigen Belastungsfolge
              </h3>

              <p className="mt-3 leading-7">
                Sportmotorische Anforderungen müssen in einer sinnvollen
                Reihenfolge eingesetzt werden.
              </p>

              <p className="mt-5 font-medium text-app-heading">
                Orientierung:
              </p>

              <ol className="mt-4 space-y-3">
                {[
                  "Allgemeine Erwärmung",
                  "Spezielle Erwärmung",
                  "Mobilisation",
                  "Koordination",
                  "Hauptteil mit Kraft und Ausdauer",
                  "Cool-down",
                  "Beweglichkeit",
                ].map((item, index) => (
                  <li
                    key={item}
                    className="flex gap-3 rounded-xl border border-app-border bg-app-surface p-4"
                  >
                    <span className="font-bold text-app-heading">
                      {index + 1}.
                    </span>

                    <span>
                      {item}
                    </span>
                  </li>
                ))}
              </ol>

              <p className="mt-5 leading-7">
                Koordinative Fähigkeiten sollen vor konditionellen
                Fähigkeiten trainiert werden. Je koordinativ anspruchsvoller
                eine Übung ist, desto früher sollte sie in der Stunde
                stattfinden.
              </p>

              <div className="mt-5">
                <InfoBox title="Merksatz">
                  Anspruchsvolle koordinative Aufgaben gehören in einen
                  Zustand geringer Ermüdung und deshalb eher an den Anfang
                  der Einheit.
                </InfoBox>
              </div>
            </div>

            <div>
              <h3 className="text-xl font-semibold text-app-heading">
                Prinzip der optimalen Gestaltung von Belastung und Erholung
              </h3>

              <ul className="mt-4 list-disc space-y-2 pl-6">
                <li>
                  Belastung und Erholung müssen aufeinander abgestimmt werden.
                </li>

                <li>
                  Erholung ist Voraussetzung für Regeneration, Verarbeitung
                  von Trainingsreizen und langfristige Anpassung.
                </li>
              </ul>
            </div>

            <div>
              <h3 className="text-xl font-semibold text-app-heading">
                Periodisierung und Zyklisierung
              </h3>

              <ul className="mt-4 list-disc space-y-2 pl-6">
                <li>
                  Trainingsinhalte und Schwerpunkte können über längere
                  Zeiträume systematisch strukturiert werden.
                </li>

                <li>
                  Dadurch wird vermieden, dass der Organismus dauerhaft
                  denselben Trainingsreizen ausgesetzt ist.
                </li>

                <li>
                  In regelmäßigen Abständen können neue Trainingsreize gesetzt
                  werden.
                </li>
              </ul>

              <p className="mt-5 leading-7">
                Im Breitensport und Rehabilitationssport werden
                Periodisierung und Zyklisierung laut Studienheft seltener
                konsequent eingesetzt.
              </p>

              <p className="mt-5 font-medium text-app-heading">
                Mögliche Gründe:
              </p>

              <ul className="mt-3 list-disc space-y-2 pl-6">
                <li>weniger spezifische Zielstellungen</li>
                <li>zeitlich begrenzte Maßnahmen</li>
              </ul>

              <p className="mt-5 leading-7">
                Trotzdem kann eine systematische Periodisierung sinnvoll
                sein, um neue Anpassungen auszulösen.
              </p>
            </div>

            <div>
              <h3 className="text-xl font-semibold text-app-heading">
                Systematische Trainingssteuerung
              </h3>

              <p className="mt-3 leading-7">
                Training sollte geplant, dokumentiert und ausgewertet werden.
              </p>

              <p className="mt-5 leading-7">
                Dabei werden systematisch berücksichtigt:
              </p>

              <ul className="mt-3 grid list-disc gap-2 pl-6 sm:grid-cols-2">
                <li>Ziele</li>
                <li>Belastungen</li>
                <li>Trainingsinhalte</li>
                <li>Reaktionen</li>
                <li>Fortschritte</li>
              </ul>

              <div className="mt-5">
                <InfoBox title="Merksatz">
                  Trainingsplanung ist kein starres Schema. Zielgruppe,
                  Zielsetzung und tatsächliche Reaktion auf die Belastung
                  bestimmen die konkrete Gestaltung.
                </InfoBox>
              </div>
            </div>
          </div>
        </section>

        {/* NAVIGATION */}

        <div className="mt-16 flex flex-wrap gap-3 border-t border-app-border pt-8">
          <Link
            href="/coach/infoboard/sportpaedagogik-gesundheitspsychologie"
            className="rounded-xl border border-app-border px-4 py-3 text-sm hover:bg-app-elevated"
          >
            ← Zurück zur Themenübersicht
          </Link>

          <Link
            href="/coach/infoboard/sportpaedagogik-gesundheitspsychologie/einfuehrung"
            className="rounded-xl border border-app-border px-4 py-3 text-sm hover:bg-app-elevated"
          >
            ← Kapitel 1
          </Link>
        </div>
      </div>
    </main>
  );
}