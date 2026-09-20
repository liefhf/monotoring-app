import {
    NextRequest,
    NextResponse,
  } from "next/server";
  
  import {
    createClient,
  } from "@supabase/supabase-js";
  
  import {
    parseCompetitionText,
  } from "@/lib/competitionPdfParser";
  
  export const runtime = "nodejs";
  
  export async function POST(
    request: NextRequest,
    context: {
      params: Promise<{
        id: string;
      }>;
    }
  ) {
    try {
      const { id } =
        await context.params;
  
      const authorization =
        request.headers.get(
          "authorization"
        );
  
      if (
        !authorization?.startsWith(
          "Bearer "
        )
      ) {
        return NextResponse.json(
          {
            error:
              "Nicht angemeldet.",
          },
          {
            status: 401,
          }
        );
      }
  
      const token =
        authorization.replace(
          "Bearer ",
          ""
        );
  
      const supabaseUrl =
        process.env
          .NEXT_PUBLIC_SUPABASE_URL;
  
      const supabaseKey =
        process.env
          .NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
      if (
        !supabaseUrl ||
        !supabaseKey
      ) {
        return NextResponse.json(
          {
            error:
              "Supabase-Konfiguration fehlt.",
          },
          {
            status: 500,
          }
        );
      }
  
      const supabase =
        createClient(
          supabaseUrl,
          supabaseKey,
          {
            global: {
              headers: {
                Authorization:
                  `Bearer ${token}`,
              },
            },
  
            auth: {
              persistSession:
                false,
  
              autoRefreshToken:
                false,
            },
          }
        );
  
      const {
        data: userData,
        error: userError,
      } =
        await supabase.auth.getUser(
          token
        );
  
      if (
        userError ||
        !userData.user
      ) {
        return NextResponse.json(
          {
            error:
              "Sitzung ist ungültig.",
          },
          {
            status: 401,
          }
        );
      }
  
      /*
       * Wettkampf laden.
       * Durch RLS kann nur der
       * eingeloggte Coach seinen
       * eigenen Wettkampf lesen.
       */
      const {
        data: competition,
        error:
          competitionError,
      } =
        await supabase
          .from(
            "competitions"
          )
          .select(
            `
              id,
              coach_id
            `
          )
          .eq(
            "id",
            id
          )
          .single();
  
      if (
        competitionError ||
        !competition
      ) {
        return NextResponse.json(
          {
            error:
              "Wettkampf wurde nicht gefunden oder du hast keinen Zugriff.",
          },
          {
            status: 403,
          }
        );
      }
  
      /*
       * Zugehörige PDF suchen.
       */
      const {
        data: document,
        error:
          documentError,
      } =
        await supabase
          .from(
            "competition_documents"
          )
          .select(
            `
              id,
              storage_path,
              file_name
            `
          )
          .eq(
            "competition_id",
            id
          )
          .single();
  
      if (
        documentError ||
        !document
      ) {
        return NextResponse.json(
          {
            error:
              "Für diesen Wettkampf wurde noch keine Ausschreibung hochgeladen.",
          },
          {
            status: 404,
          }
        );
      }
  
      /*
       * PDF aus dem privaten
       * Storage laden.
       */
      const {
        data: pdfBlob,
        error:
          downloadError,
      } =
        await supabase.storage
          .from(
            "competition-pdfs"
          )
          .download(
            document.storage_path
          );
  
      if (
        downloadError ||
        !pdfBlob
      ) {
        return NextResponse.json(
          {
            error:
              `PDF konnte nicht geladen werden: ${
                downloadError?.message ??
                "Unbekannter Fehler"
              }`,
          },
          {
            status: 500,
          }
        );
      }
  
      const arrayBuffer =
        await pdfBlob.arrayBuffer();
  
      /*
       * pdf-parse wird bewusst erst
       * hier geladen. Dadurch bekommen
       * wir auch bei einem Problem mit
       * dem Paket eine verständliche
       * Fehlermeldung zurück.
       */
      let rawText = "";
  
      try {
        const pdfParseModule =
          await import(
            "pdf-parse"
          );
  
        const moduleAny =
          pdfParseModule as unknown as {
            PDFParse?: new (
              options: {
                data: Uint8Array;
              }
            ) => {
              getText: () => Promise<{
                text: string;
              }>;
  
              destroy?: () =>
                Promise<void>;
            };
  
            default?: (
              data: Buffer
            ) => Promise<{
              text: string;
            }>;
          };
  
        /*
         * Neuere pdf-parse-Versionen
         */
        if (
          typeof moduleAny.PDFParse ===
          "function"
        ) {
          const Parser =
            moduleAny.PDFParse;
  
          const parser =
            new Parser({
              data:
                new Uint8Array(
                  arrayBuffer
                ),
            });
  
          try {
            const result =
              await parser.getText();
  
            rawText =
              result.text ?? "";
          } finally {
            if (
              parser.destroy
            ) {
              await parser.destroy();
            }
          }
        }
  
        /*
         * Ältere pdf-parse-Versionen
         */
        else if (
          typeof moduleAny.default ===
          "function"
        ) {
          const buffer =
            Buffer.from(
              arrayBuffer
            );
  
          const result =
            await moduleAny.default(
              buffer
            );
  
          rawText =
            result.text ?? "";
        } else {
          throw new Error(
            "Die installierte pdf-parse-Version stellt keine unterstützte PDF-Funktion bereit."
          );
        }
      } catch (pdfError) {
        console.error(
          "PDF parsing error:",
          pdfError
        );
  
        const message =
          pdfError instanceof
          Error
            ? pdfError.message
            : "Unbekannter PDF-Fehler";
  
        return NextResponse.json(
          {
            error:
              `PDF konnte nicht gelesen werden: ${message}`,
          },
          {
            status: 500,
          }
        );
      }
  
      if (!rawText.trim()) {
        return NextResponse.json(
          {
            error:
              "Die PDF wurde geöffnet, enthält aber keinen auslesbaren Text. Möglicherweise besteht sie nur aus eingescannten Bildern.",
          },
          {
            status: 422,
          }
        );
      }
  
      /*
       * Text nach Abschnitten
       * und WKs untersuchen.
       */
      const parsed =
        parseCompetitionText(
          rawText
        );
  
      if (
        parsed.eventCount === 0
      ) {
        return NextResponse.json(
          {
            error:
              "Die PDF wurde erfolgreich gelesen, aber es konnten noch keine WKs erkannt werden.",
          },
          {
            status: 422,
          }
        );
      }
  
      /*
       * Ergebnis zunächst nur
       * als Entwurf speichern.
       */
      const {
        error: draftError,
      } =
        await supabase
          .from(
            "competition_import_drafts"
          )
          .upsert(
            {
              competition_id:
                id,
  
              source_document_id:
                document.id,
  
              raw_text:
                rawText,
  
              parsed_data:
                parsed,
  
              status:
                "draft",
  
              updated_at:
                new Date().toISOString(),
            },
            {
              onConflict:
                "competition_id",
            }
          );
  
      if (draftError) {
        return NextResponse.json(
          {
            error:
              `Auswertung wurde erstellt, konnte aber nicht gespeichert werden: ${draftError.message}`,
          },
          {
            status: 500,
          }
        );
      }
  
      return NextResponse.json({
        success: true,
  
        fileName:
          document.file_name,
  
        parsed,
      });
    } catch (error) {
      console.error(
        "Competition parse route error:",
        error
      );
  
      const message =
        error instanceof Error
          ? error.message
          : "Unbekannter Fehler";
  
      return NextResponse.json(
        {
          error:
            `Ausschreibung konnte nicht ausgewertet werden: ${message}`,
        },
        {
          status: 500,
        }
      );
    }
  }