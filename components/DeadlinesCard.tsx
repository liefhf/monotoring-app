"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { toDateKey } from "@/lib/community";
import { DOC_TYPE_LABELS, DOC_WARN_DAYS, DocType, documentStatus } from "@/lib/health";

/*
 * Fristen auf dem Dashboard: Dokumente (z. B. Sportattest), die in den
 * naechsten 30 Tagen ablaufen oder schon abgelaufen sind. Erscheint nur,
 * wenn es etwas zu tun gibt - sonst keine leere Kachel.
 */

type Row = { id: string; swimmer_id: string; doc_type: DocType; title: string; valid_until: string; swimmers: { first_name: string; last_name: string | null } | null };

export default function DeadlinesCard() {
  const [rows, setRows] = useState<Row[]>([]);
  const [today] = useState(() => toDateKey(new Date()));

  useEffect(() => {
    const until = toDateKey(new Date(Date.parse(`${today}T12:00:00`) + DOC_WARN_DAYS * 86_400_000));
    supabase
      .from("athlete_documents")
      .select("id, swimmer_id, doc_type, title, valid_until, swimmers(first_name, last_name)")
      .not("valid_until", "is", null)
      .lte("valid_until", until)
      .order("valid_until")
      .limit(8)
      .then(({ data, error }) => {
        if (!error) setRows((data ?? []) as unknown as Row[]);
      });
  }, [today]);

  if (rows.length === 0) return null;

  return (
    <section aria-label="Fristen" className="rounded-[20px] border border-app-border/60 bg-app-surface p-4 shadow-app sm:p-[22px]">
      <h2 className="text-[15px] font-bold text-app-heading">Fristen</h2>
      <ul className="mt-2 divide-y divide-app-border/60">
        {rows.map((row) => {
          const { status, daysLeft } = documentStatus(row, today);
          const name = row.swimmers ? `${row.swimmers.first_name} ${row.swimmers.last_name ?? ""}`.trim() : "Athlet";
          return (
            <li key={row.id}>
              <Link href={`/coach/schwimmer/${row.swimmer_id}?tab=dokumente`} className="flex items-center gap-3 py-2.5 hover:text-app-accent-soft">
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold text-app-heading">{name}</span>
                  <span className="block truncate text-[13px] text-app-muted">{row.title || DOC_TYPE_LABELS[row.doc_type]}</span>
                </span>
                <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-extrabold ${status === "abgelaufen" ? "bg-app-bad/15 text-app-bad" : "bg-app-soon/15 text-app-soon"}`}>
                  {status === "abgelaufen" ? "abgelaufen" : `in ${daysLeft} Tagen`}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
