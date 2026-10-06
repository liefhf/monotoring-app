import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { extractPdfText } from "@/lib/pdfText";

/*
 * Ergebnisprotokoll (PDF) auslesen.
 * Nimmt die hochgeladene Datei entgegen, prueft Anmeldung und
 * Zugriff auf den Wettkampf und gibt nur den Text zurueck.
 * Die PDF wird nicht gespeichert. Das Auswerten des Textes
 * passiert im Browser (lib/resultProtocolParser.ts), damit der
 * Coach vor dem Speichern alles pruefen kann.
 */

export const runtime = "nodejs";

const MAX_BYTES = 15 * 1024 * 1024;

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const authorization = request.headers.get("authorization");

  if (!authorization?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  }

  const token = authorization.slice("Bearer ".length);
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.json({ error: "Supabase-Konfiguration fehlt." }, { status: 500 });
  }

  const supabase = createClient(supabaseUrl, supabaseKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: userData, error: userError } = await supabase.auth.getUser(token);

  if (userError || !userData.user) {
    return NextResponse.json({ error: "Sitzung ist ungültig." }, { status: 401 });
  }

  /* RLS: nur der eigene Wettkampf ist lesbar */
  const { data: competition } = await supabase.from("competitions").select("id").eq("id", id).maybeSingle();

  if (!competition) {
    return NextResponse.json({ error: "Wettkampf wurde nicht gefunden oder du hast keinen Zugriff." }, { status: 403 });
  }

  let file: File | null = null;

  try {
    const form = await request.formData();
    const value = form.get("file");
    file = value instanceof File ? value : null;
  } catch {
    return NextResponse.json({ error: "Die Datei konnte nicht empfangen werden." }, { status: 400 });
  }

  if (!file) {
    return NextResponse.json({ error: "Bitte wähle eine PDF-Datei aus." }, { status: 400 });
  }

  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "Die PDF ist größer als 15 MB." }, { status: 413 });
  }

  if (file.type && file.type !== "application/pdf") {
    return NextResponse.json({ error: "Bitte eine PDF-Datei hochladen." }, { status: 415 });
  }

  try {
    const text = await extractPdfText(await file.arrayBuffer());

    if (!text.trim()) {
      return NextResponse.json(
        { error: "Die PDF enthält keinen auslesbaren Text – vermutlich ist sie eingescannt." },
        { status: 422 }
      );
    }

    return NextResponse.json({ text });
  } catch (error) {
    console.error("Protokoll PDF error:", error);

    return NextResponse.json(
      { error: `PDF konnte nicht gelesen werden: ${error instanceof Error ? error.message : "Unbekannter Fehler"}` },
      { status: 500 }
    );
  }
}
