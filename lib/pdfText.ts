/*
 * Text aus einer PDF lesen (nur auf dem Server, in API-Routen).
 * Gemeinsam genutzt vom Ausschreibungs- und vom Protokoll-Import.
 *
 * pdf-parse wird erst hier geladen. Dadurch gibt es auch bei
 * einem Problem mit dem Paket eine verstaendliche Fehlermeldung.
 * Unterstuetzt die neue (Klasse PDFParse) und die alte API.
 */
export async function extractPdfText(data: ArrayBuffer): Promise<string> {
  const pdfParseModule = await import("pdf-parse");

  const moduleAny = pdfParseModule as unknown as {
    PDFParse?: new (options: { data: Uint8Array }) => {
      getText: () => Promise<{ text: string }>;
      destroy?: () => Promise<void>;
    };
    default?: (data: Buffer) => Promise<{ text: string }>;
  };

  if (typeof moduleAny.PDFParse === "function") {
    const parser = new moduleAny.PDFParse({ data: new Uint8Array(data) });

    try {
      const result = await parser.getText();
      return result.text ?? "";
    } finally {
      await parser.destroy?.();
    }
  }

  if (typeof moduleAny.default === "function") {
    const result = await moduleAny.default(Buffer.from(data));
    return result.text ?? "";
  }

  throw new Error("Die installierte pdf-parse-Version stellt keine unterstützte PDF-Funktion bereit.");
}
