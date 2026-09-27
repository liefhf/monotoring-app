export type ParsedCompetitionEvent = {
    eventNumber: number;
    distanceM: number;
    relayCount: number | null;
    stroke: string;
    gender: "female" | "male" | "mixed";
    roundType:
      | "standard"
      | "heat"
      | "junior_final"
      | "final";
    ageGroupText: string | null;
  };
  
  export type ParsedCompetitionSection = {
    sectionNumber: number;
    sectionDate: string | null;
    title: string;
    admissionTime: string | null;
    officialsMeetingTime: string | null;
    startTime: string | null;
    notes: string | null;
    events: ParsedCompetitionEvent[];
  };
  
  export type ParsedCompetition = {
    sections: ParsedCompetitionSection[];
    eventCount: number;
  };
  
  function convertGermanDate(value: string) {
    /*
     * Zuerst das reine Zahlenformat "14.03.2026". Vorher
     * passte es auf die erste Regel unten, scheiterte dann
     * aber am fehlenden Monatsnamen - Ergebnis war null.
     */
    const numericFirst = value.match(
      /^\s*(\d{1,2})\.(\d{1,2})\.(\d{4})/
    );

    if (numericFirst) {
      return `${numericFirst[3]}-${numericFirst[2].padStart(2, "0")}-${numericFirst[1].padStart(2, "0")}`;
    }

    const match = value.match(
      /(\d{1,2})\.\s*(?:Januar|Februar|März|Maerz|April|Mai|Juni|Juli|August|September|Oktober|November|Dezember|\d{1,2}\.)\s*(\d{4})/i
    );
  
    if (!match) {
      const numeric = value.match(
        /(\d{1,2})\.(\d{1,2})\.(\d{4})/
      );
  
      if (!numeric) {
        return null;
      }
  
      const day = numeric[1].padStart(2, "0");
      const month = numeric[2].padStart(2, "0");
      const year = numeric[3];
  
      return `${year}-${month}-${day}`;
    }
  
    const monthNames: Record<string, string> = {
      januar: "01",
      februar: "02",
      märz: "03",
      maerz: "03",
      april: "04",
      mai: "05",
      juni: "06",
      juli: "07",
      august: "08",
      september: "09",
      oktober: "10",
      november: "11",
      dezember: "12",
    };
  
    const dayMatch = value.match(
      /(\d{1,2})\.\s*([A-Za-zÄÖÜäöü]+)\s*(\d{4})/
    );
  
    if (!dayMatch) {
      return null;
    }
  
    const day = dayMatch[1].padStart(2, "0");
    const month =
      monthNames[dayMatch[2].toLowerCase()];
  
    if (!month) {
      return null;
    }
  
    const year = dayMatch[3];
  
    return `${year}-${month}-${day}`;
  }
  
  function normaliseTime(
    value: string | undefined | null
  ) {
    if (!value) {
      return null;
    }
  
    const match = value.match(
      /(\d{1,2})[:.](\d{2})/
    );
  
    if (!match) {
      return null;
    }
  
    return `${match[1].padStart(
      2,
      "0"
    )}:${match[2]}`;
  }
  
  function getRoundType(
    text: string
  ): ParsedCompetitionEvent["roundType"] {
    const lower = text.toLowerCase();
  
    if (
      lower.includes("juniorenfinale") ||
      lower.includes("junioren finale")
    ) {
      return "junior_final";
    }
  
    if (lower.includes("vorlauf")) {
      return "heat";
    }
  
    if (
      lower.includes("finale") ||
      lower.includes("final")
    ) {
      return "final";
    }
  
    return "standard";
  }
  
  function cleanStroke(value: string) {
    return value
      .replace(/\([^)]*\)/g, " ")
      .replace(/Juniorenfinale/gi, " ")
      .replace(/Junioren Finale/gi, " ")
      .replace(/Finale offen/gi, " ")
      .replace(/offenes Finale/gi, " ")
      .replace(/Finale/gi, " ")
      .replace(/\s+/g, " ")
      .trim();
  }
  
  function cleanAgeGroup(value: string) {
    let result = value
      .replace(
        /[-–—]*\s*\d+\s+of\s+\d+\s*[-–—]*/gi,
        " "
      )
      .replace(
        /[-–—]*\s*Seite\s+\d+\s*(?:von\s+\d+)?\s*[-–—]*/gi,
        " "
      )
      .replace(
        /^[,;:\-–—\s]+/,
        ""
      )
      .replace(
        /[,;:\-–—\s]+$/,
        ""
      )
      .replace(/\s+/g, " ")
      .trim();
  
    const stopWords = [
      "Veranstaltungsabschnitt",
      "Abschnitt",
      "Einlass",
      "Einschwimmen",
      "Kampfrichtersitzung",
      "Beginn",
      "Allgemeine Wettkampfbestimmungen",
      "Allgemeine Bestimmungen",
      "Wettkampfbestimmungen",
      "Meldeschluss",
      "Meldegeld",
      "Datenschutz",
      "Laufeinteilung",
      "Wertungen und Auszeichnungen",
      "Kampfrichter",
      "Haftung",
    ];
  
    let end = result.length;
  
    for (const word of stopWords) {
      const index = result
        .toLowerCase()
        .indexOf(word.toLowerCase());
  
      if (
        index >= 0 &&
        index < end
      ) {
        end = index;
      }
    }
  
    result = result
      .slice(0, end)
      .trim();
  
    return result || null;
  }
  
  function extractSectionMeta(text: string) {
    const admission = text.match(
      /(?:Einlass(?:\s+und\s+Einschwimmen)?|Einschwimmen)\s*[:.]?\s*(\d{1,2}[:.]\d{2})/i
    );
  
    const officials = text.match(
      /Kampfrichtersitzung\s*[:.]?\s*(\d{1,2}[:.]\d{2})/i
    );
  
    const start = text.match(
      /Beginn\s*[:.]?\s*(\d{1,2}[:.]\d{2})/i
    );
  
    let notes: string | null = null;
  
    const relativeStart = text.match(
      /(Beginn[^.]{0,140}(?:Minuten|Min\.?|nach Ende)[^.]{0,140})/i
    );
  
    if (relativeStart) {
      notes = relativeStart[1]
        .replace(/\s+/g, " ")
        .trim();
    }
  
    return {
      admissionTime: normaliseTime(
        admission?.[1]
      ),
  
      officialsMeetingTime:
        normaliseTime(
          officials?.[1]
        ),
  
      startTime: normaliseTime(
        start?.[1]
      ),
  
      notes,
    };
  }
  
  function extractSectionDate(text: string) {
    const numeric = text.match(
      /(\d{1,2}\.\d{1,2}\.\d{4})/
    );
  
    if (numeric) {
      return convertGermanDate(
        numeric[1]
      );
    }
  
    const written = text.match(
      /(\d{1,2}\.\s*(?:Januar|Februar|März|Maerz|April|Mai|Juni|Juli|August|September|Oktober|November|Dezember)\s*\d{4})/i
    );
  
    if (written) {
      return convertGermanDate(
        written[1]
      );
    }
  
    return null;
  }
  
  function parseEvents(sectionText: string) {
    const events: ParsedCompetitionEvent[] =
      [];
  
    const starts = [
      ...sectionText.matchAll(
        /\bWK\s*0*(\d{1,4})\b/gi
      ),
    ];
  
    for (
      let index = 0;
      index < starts.length;
      index++
    ) {
      const current = starts[index];
      const next = starts[index + 1];
  
      const startIndex =
        current.index ?? 0;
  
      const endIndex =
        next?.index ??
        sectionText.length;
  
      const block = sectionText
        .slice(
          startIndex,
          endIndex
        )
        .replace(/\s+/g, " ")
        .trim();
  
      const eventNumber =
        Number(current[1]);
  
      const relayMatch =
        block.match(
          /\bWK\s*0*\d{1,4}\s+(\d+)\s*[xX×]\s*(\d+)\s*m\b/i
        );
  
      let distanceM: number;
      let relayCount:
        | number
        | null = null;
  
      let disciplineStart = 0;
  
      if (relayMatch) {
        relayCount = Number(
          relayMatch[1]
        );
  
        distanceM = Number(
          relayMatch[2]
        );
  
        disciplineStart =
          (relayMatch.index ?? 0) +
          relayMatch[0].length;
      } else {
        const distanceMatch =
          block.match(
            /\bWK\s*0*\d{1,4}\s+(\d{1,4})\s*m\b/i
          );
  
        if (!distanceMatch) {
          continue;
        }
  
        distanceM =
          Number(
            distanceMatch[1]
          );
  
        disciplineStart =
          (distanceMatch.index ?? 0) +
          distanceMatch[0].length;
      }
  
      const afterDistance =
        block
          .slice(
            disciplineStart
          )
          .trim();
  
      const genderMatch =
        afterDistance.match(
          /\b(weiblich|männlich|maennlich|mixed|gemischt)\b/i
        );
  
      if (!genderMatch) {
        continue;
      }
  
      const genderIndex =
        genderMatch.index ?? 0;
  
      const disciplinePart =
        afterDistance
          .slice(
            0,
            genderIndex
          )
          .trim();
  
      const afterGender =
        afterDistance
          .slice(
            genderIndex +
              genderMatch[0].length
          )
          .trim();
  
      const genderText =
        genderMatch[1]
          .toLowerCase();
  
      let gender:
        | "female"
        | "male"
        | "mixed";
  
      if (
        genderText === "weiblich"
      ) {
        gender = "female";
      } else if (
        genderText === "männlich" ||
        genderText === "maennlich"
      ) {
        gender = "male";
      } else {
        gender = "mixed";
      }
  
      const stroke = cleanStroke(
        disciplinePart
      );
  
      if (!stroke) {
        continue;
      }
  
      events.push({
        eventNumber,
        distanceM,
        relayCount,
        stroke,
        gender,
  
        /*
         * "Vorlauf"/"Finale" steht mal vor, mal hinter
         * dem Geschlecht - darum den ganzen Block pruefen.
         */
        roundType: getRoundType(
          `${disciplinePart} ${afterGender}`
        ),
  
        ageGroupText:
          cleanAgeGroup(
            afterGender
          ),
      });
    }
  
    return events;
  }
  
  type SectionStart = {
    sectionNumber: number;
    index: number;
    rawTitle: string;
  };
  
  function findSections(
    text: string
  ): SectionStart[] {
    const found: SectionStart[] =
      [];
  
    const patterns = [
      /(\d+)\.\s*Veranstaltungsabschnitt\b/gi,
      /(\d+)\.\s*Abschnitt\b/gi,
      /\bAbschnitt\s*(\d+)\b/gi,
    ];
  
    for (const pattern of patterns) {
      for (
        const match of text.matchAll(
          pattern
        )
      ) {
        found.push({
          sectionNumber:
            Number(match[1]),
  
          index:
            match.index ?? 0,
  
          rawTitle:
            match[0],
        });
      }
    }
  
    /*
     * Nach Position sortieren
     * und doppelte Treffer entfernen.
     */
    found.sort(
      (a, b) =>
        a.index - b.index
    );
  
    const unique:
      SectionStart[] = [];
  
    for (const item of found) {
      const duplicate =
        unique.some(
          (existing) =>
            Math.abs(
              existing.index -
                item.index
            ) < 5
        );
  
      if (!duplicate) {
        unique.push(item);
      }
    }
  
    return unique;
  }
  
  export function parseCompetitionText(
    rawText: string
  ): ParsedCompetition {
    const normalisedText =
      rawText
        .replace(/\r/g, "\n")
        .replace(/\t/g, " ")
        .replace(/\u00a0/g, " ")
        .replace(/[ ]+/g, " ");
  
    const flatText =
      normalisedText
        .replace(/\n+/g, " ")
        .replace(/\s+/g, " ")
        .trim();
  
    const sections:
      ParsedCompetitionSection[] =
        [];
  
    const sectionStarts =
      findSections(flatText);
  
    /*
     * Falls echte Abschnitte gefunden
     * wurden, teilen wir den Text
     * exakt danach auf.
     */
    if (
      sectionStarts.length >
      0
    ) {
      for (
        let index = 0;
        index <
        sectionStarts.length;
        index++
      ) {
        const current =
          sectionStarts[index];
  
        const next =
          sectionStarts[
            index + 1
          ];
  
        const start =
          current.index;
  
        const end =
          next?.index ??
          flatText.length;
  
        const sectionText =
          flatText.slice(
            start,
            end
          );
  
        const events =
          parseEvents(
            sectionText
          );
  
        if (
          events.length === 0
        ) {
          continue;
        }
  
        const meta =
          extractSectionMeta(
            sectionText
          );
  
        sections.push({
          sectionNumber:
            current.sectionNumber,
  
          sectionDate:
            extractSectionDate(
              sectionText
            ),
  
          title:
            `${current.sectionNumber}. Abschnitt`,
  
          admissionTime:
            meta.admissionTime,
  
          officialsMeetingTime:
            meta.officialsMeetingTime,
  
          startTime:
            meta.startTime,
  
          notes:
            meta.notes,
  
          events,
        });
      }
    } else {
      /*
       * Fallback:
       * keine Abschnittsüberschrift
       * vorhanden.
       */
      const events =
        parseEvents(flatText);
  
      if (
        events.length > 0
      ) {
        const meta =
          extractSectionMeta(
            flatText
          );
  
        sections.push({
          sectionNumber: 1,
  
          sectionDate:
            extractSectionDate(
              flatText
            ),
  
          title:
            "1. Abschnitt",
  
          admissionTime:
            meta.admissionTime,
  
          officialsMeetingTime:
            meta.officialsMeetingTime,
  
          startTime:
            meta.startTime,
  
          notes:
            meta.notes,
  
          events,
        });
      }
    }
  
    const eventCount =
      sections.reduce(
        (
          total,
          section
        ) =>
          total +
          section.events.length,
        0
      );
  
    return {
      sections,
      eventCount,
    };
  }