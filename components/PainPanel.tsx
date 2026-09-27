"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { formatRelative } from "@/lib/community";
import {
  PAIN_COLUMNS,
  PAIN_ONSETS,
  PAIN_QUALITIES,
  PAIN_TRIGGERS,
  PainReport,
  TRAINING_IMPACTS,
  labelFor,
  painColor,
  painWord,
  strongestBySpot,
} from "@/lib/pain";
import BodyMap from "@/components/BodyMap";
import { Card, EmptyState, Notice } from "@/components/ui";

/*
 * Schmerzmeldungen eines Athleten fuer den Coach:
 * Koerperbild der letzten 14 Tage und Verlauf (8 Wochen).
 * Funktioniert nur, wenn der Athlet einen verknuepften Login hat
 * (Meldungen gehoeren zum Login).
 */
export default function PainPanel({ swimmerId }: { swimmerId: string }) {
  const [profileId, setProfileId] = useState<string | null | undefined>(undefined);
  const [reports, setReports] = useState<PainReport[] | null>(null);
  const [error, setError] = useState("");
  const [loadedAt, setLoadedAt] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const { data: swimmer } = await supabase.from("swimmers").select("profile_id").eq("id", swimmerId).maybeSingle();
      const linked = (swimmer?.profile_id as string | null) ?? null;

      if (cancelled) return;
      setProfileId(linked);

      if (!linked) return;

      const since = new Date(Date.now() - 56 * 86400000).toISOString();
      const { data, error: loadError } = await supabase
        .from("pain_reports")
        .select(PAIN_COLUMNS)
        .eq("athlete_id", linked)
        .gte("created_at", since)
        .order("created_at", { ascending: false });

      if (cancelled) return;

      if (loadError) {
        setError(
          loadError.message.includes("column")
            ? "Die Schmerzmeldung ist noch nicht eingerichtet. Bitte führe supabase/schmerzen.sql im Supabase SQL-Editor aus."
            : `Meldungen konnten nicht geladen werden: ${loadError.message}`
        );
        setReports([]);
        return;
      }

      setReports((data ?? []) as PainReport[]);
      setLoadedAt(Date.now());
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [swimmerId]);

  const recentLevels = useMemo(() => {
    const cutoff = loadedAt - 14 * 86400000;
    return strongestBySpot((reports ?? []).filter((report) => new Date(report.created_at).getTime() >= cutoff));
  }, [reports, loadedAt]);

  const groups = useMemo(() => {
    const map = new Map<string, PainReport[]>();

    for (const report of reports ?? []) {
      const key = report.report_group ?? report.id;
      map.set(key, [...(map.get(key) ?? []), report]);
    }

    return [...map.values()];
  }, [reports]);

  if (profileId === undefined) {
    return <p className="mt-6 text-sm text-app-muted">Wird geladen...</p>;
  }

  if (!profileId) {
    return (
      <div className="mt-6">
        <Card>
          <EmptyState icon="heart" title="Kein Login verknüpft">
            Schmerzen melden Athleten selbst in der App. Verknüpfe dafür im Tab „Infos“ den Login des Athleten.
          </EmptyState>
        </Card>
      </div>
    );
  }

  return (
    <div className="mt-6 space-y-6">
      {error && <Notice tone="bad">{error}</Notice>}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        <Card title="Letzte 14 Tage" description="Farbe = stärkste Meldung je Stelle" padded>
          <BodyMap levels={recentLevels} />
        </Card>

        <Card title="Verlauf" description="Die letzten 8 Wochen">
          {reports === null ? (
            <p className="p-5 text-sm text-app-muted">Wird geladen...</p>
          ) : groups.length === 0 ? (
            <EmptyState icon="heart" title="Keine Schmerzmeldungen" />
          ) : (
            <ul className="max-h-[640px] divide-y divide-app-border overflow-y-auto">
              {groups.map((group) => {
                const blocked = group.some((report) => report.training_impact === "none");

                return (
                  <li key={group[0].report_group ?? group[0].id} className="space-y-3 px-5 py-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-app-heading">
                        {new Date(group[0].created_at).toLocaleDateString("de-DE", { weekday: "short", day: "2-digit", month: "2-digit" })}
                        <span className="ml-2 font-normal text-app-faint">{formatRelative(group[0].created_at)}</span>
                      </p>
                      {blocked && (
                        <span className="rounded-full bg-app-bad/15 px-2 py-0.5 text-xs font-semibold text-app-bad">kann nicht trainieren</span>
                      )}
                    </div>

                    {group.map((report) => (
                      <div key={report.id} className="flex gap-3">
                        <span
                          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white"
                          style={{ background: painColor(report.pain_level) }}
                          title={painWord(report.pain_level)}
                        >
                          {report.pain_level}
                        </span>
                        <div className="min-w-0 text-sm">
                          <p className="font-medium text-app-heading">{report.spot_label ?? report.body_region ?? "Körper"}</p>
                          <p className="text-app-muted">
                            {[
                              ...(report.qualities ?? []).map((value) => labelFor(PAIN_QUALITIES, value)),
                              report.onset ? labelFor(PAIN_ONSETS, report.onset) : null,
                              ...(report.triggers ?? []).map((value) => labelFor(PAIN_TRIGGERS, value)),
                              report.training_impact && report.training_impact !== "none"
                                ? labelFor(TRAINING_IMPACTS, report.training_impact)
                                : null,
                            ]
                              .filter(Boolean)
                              .join(" · ") || painWord(report.pain_level)}
                          </p>
                        </div>
                      </div>
                    ))}

                    {group[0].note && <p className="rounded-xl bg-app-bg/60 px-3 py-2 text-sm text-app-text">„{group[0].note}“</p>}
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
