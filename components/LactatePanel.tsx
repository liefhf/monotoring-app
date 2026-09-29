"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { CartesianGrid, Legend, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { supabase } from "@/lib/supabase";
import { STROKES, formatDate, formatTime, parseSwimTimeToMs } from "@/lib/swim";
import { LactateTest, analyzeLactateTest, formatPace, thresholdChange } from "@/lib/lactate";
import { Card, FormField, Notice, buttonPrimary, buttonSecondary, inputClass } from "@/components/ui";

/*
 * Laktat-Stufentests eines Athleten: erfassen, Schwellen (2/4 mmol/l,
 * individuell) berechnen, persoenliche Zonen als Tempo je 100 m.
 */

type StepDraft = { time: string; lactate: string; heartRate: string };
const emptySteps = (): StepDraft[] => Array.from({ length: 5 }, () => ({ time: "", lactate: "", heartRate: "" }));
const today = () => new Date().toISOString().slice(0, 10);
const num = (value: string) => (value.trim() ? Number(value.replace(",", ".")) : NaN);

export default function LactatePanel({ swimmerId }: { swimmerId: string }) {
  const [tests, setTests] = useState<LactateTest[]>([]);
  const [missingTable, setMissingTable] = useState(false);
  const [selectedId, setSelectedId] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [message, setMessage] = useState<{ tone: "good" | "bad"; text: string } | null>(null);
  const [date, setDate] = useState(today);
  const [stroke, setStroke] = useState("freestyle");
  const [pool, setPool] = useState(25);
  const [stepDistance, setStepDistance] = useState("200");
  const [restLactate, setRestLactate] = useState("");
  const [steps, setSteps] = useState<StepDraft[]>(emptySteps);
  const [note, setNote] = useState("");

  const load = useCallback(async () => {
    const { data, error } = await supabase.from("lactate_tests").select("*").eq("swimmer_id", swimmerId).order("test_date", { ascending: false });
    setMissingTable(Boolean(error));
    const loaded = (data ?? []) as LactateTest[];
    setTests(loaded);
    setSelectedId((current) => current || loaded[0]?.id || "");
  }, [swimmerId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Daten beim Oeffnen laden
    load();
  }, [load]);

  const selected = tests.find((test) => test.id === selectedId) ?? tests[0] ?? null;
  const previous = selected ? tests.find((test) => test.test_date < selected.test_date && test.stroke === selected.stroke) ?? null : null;
  const analysis = useMemo(() => (selected ? analyzeLactateTest(selected) : null), [selected]);
  const previousAnalysis = useMemo(() => (previous ? analyzeLactateTest(previous) : null), [previous]);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = steps
      .filter((step) => step.time.trim() || step.lactate.trim())
      .map((step) => ({ time_ms: parseSwimTimeToMs(step.time) ?? 0, lactate: num(step.lactate), heart_rate: step.heartRate.trim() ? Math.round(num(step.heartRate)) : null }));
    if (parsed.length < 3 || parsed.some((step) => !step.time_ms || !Number.isFinite(step.lactate))) {
      setMessage({ tone: "bad", text: "Bitte mindestens 3 Stufen mit Zeit (z. B. 2:45,3) und Laktat (z. B. 2,4) eintragen." });
      return;
    }
    const { error } = await supabase.from("lactate_tests").insert({
      swimmer_id: swimmerId,
      test_date: date,
      stroke,
      pool_length: pool,
      step_distance: Number(stepDistance) || 200,
      rest_lactate: restLactate.trim() ? num(restLactate) : null,
      steps: parsed,
      note: note.trim() || null,
    });
    if (error) {
      setMessage({ tone: "bad", text: `Test konnte nicht gespeichert werden: ${error.message}` });
      return;
    }
    setMessage({ tone: "good", text: "Test gespeichert ✅" });
    setShowForm(false);
    setSteps(emptySteps());
    setNote("");
    setSelectedId("");
    await load();
  }

  async function remove(test: LactateTest) {
    if (!window.confirm(`Laktattest vom ${formatDate(test.test_date)} wirklich löschen?`)) return;
    const { error } = await supabase.from("lactate_tests").delete().eq("id", test.id);
    if (error) {
      setMessage({ tone: "bad", text: `Konnte nicht gelöscht werden: ${error.message}` });
      return;
    }
    setSelectedId("");
    await load();
  }

  const change = (key: "v2" | "v4") => {
    const value = analysis && previousAnalysis ? thresholdChange(analysis[key], previousAnalysis[key]) : null;
    return value === null ? null : `${value > 0 ? "+" : ""}${value.toFixed(1).replace(".", ",")} % zum ${formatDate(previous!.test_date)}`;
  };

  if (missingTable) {
    return (
      <div className="mt-6">
        <Notice tone="warn">Bitte zuerst <b>laktattests.sql</b> im Supabase SQL-Editor ausführen und die Seite neu laden.</Notice>
      </div>
    );
  }

  return (
    <div className="mt-6 space-y-6">
      {message && <Notice tone={message.tone}>{message.text}</Notice>}

      <Card
        title="Laktat-Stufentest"
        description="Schwellen nach Mader (2 / 4 mmol/l, linear interpoliert) und individuell (Laktatbett + 1 mmol/l). Nur Tests mit gleichem Protokoll vergleichen."
        action={
          <button type="button" onClick={() => setShowForm(!showForm)} className={buttonPrimary}>
            {showForm ? "Schließen" : "+ Test eintragen"}
          </button>
        }
      >
        {showForm && (
          <form onSubmit={save} className="space-y-4 border-b border-app-border p-5">
            <div className="grid gap-3 sm:grid-cols-5">
              <FormField label="Datum">
                <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputClass} />
              </FormField>
              <FormField label="Lage">
                <select value={stroke} onChange={(e) => setStroke(e.target.value)} className={inputClass}>
                  {STROKES.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </FormField>
              <FormField label="Bahn">
                <select value={pool} onChange={(e) => setPool(Number(e.target.value))} className={inputClass}>
                  <option value={25}>25 m</option>
                  <option value={50}>50 m</option>
                </select>
              </FormField>
              <FormField label="Strecke je Stufe (m)">
                <input value={stepDistance} onChange={(e) => setStepDistance(e.target.value)} inputMode="numeric" className={inputClass} />
              </FormField>
              <FormField label="Ruhelaktat">
                <input value={restLactate} onChange={(e) => setRestLactate(e.target.value)} inputMode="decimal" placeholder="1,0" className={inputClass} />
              </FormField>
            </div>

            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-app-muted">
                  <th className="py-1 pr-2 font-medium">Stufe</th>
                  <th className="py-1 pr-2 font-medium">Zeit</th>
                  <th className="py-1 pr-2 font-medium">Laktat (mmol/l)</th>
                  <th className="py-1 font-medium">Herzfrequenz</th>
                </tr>
              </thead>
              <tbody>
                {steps.map((step, index) => (
                  <tr key={index}>
                    <td className="py-1 pr-2 font-semibold">{index + 1}</td>
                    {(["time", "lactate", "heartRate"] as const).map((key) => (
                      <td key={key} className="py-1 pr-2">
                        <input
                          value={step[key]}
                          inputMode="decimal"
                          placeholder={key === "time" ? "2:45,3" : key === "lactate" ? "2,4" : "160"}
                          onChange={(e) => setSteps((current) => current.map((item, i) => (i === index ? { ...item, [key]: e.target.value } : item)))}
                          className={`${inputClass} py-1.5`}
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => setSteps((current) => [...current, { time: "", lactate: "", heartRate: "" }])} className={buttonSecondary}>
                + Stufe
              </button>
              <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Notiz (Protokoll, Pausen, Befinden …)" className={`${inputClass} flex-1`} />
              <button type="submit" className={buttonPrimary}>
                Speichern
              </button>
            </div>
          </form>
        )}

        {tests.length === 0 ? (
          <p className="p-5 text-sm text-app-muted">Noch kein Test eingetragen. Typisch im Schwimmen: 5 × 200 m ansteigend, Laktat nach jeder Stufe.</p>
        ) : (
          <div className="flex flex-wrap gap-2 p-4">
            {tests.map((test) => (
              <button
                key={test.id}
                type="button"
                onClick={() => setSelectedId(test.id)}
                className={`rounded-lg px-3 py-1.5 text-sm ${selected?.id === test.id ? "bg-app-accent text-app-accent-ink" : "border border-app-border"}`}
              >
                {formatDate(test.test_date)} · {test.steps.length}×{test.step_distance} {STROKES.find((s) => s.value === test.stroke)?.short}
              </button>
            ))}
          </div>
        )}
      </Card>

      {selected && analysis && (
        <>
          {analysis.warnings.map((warning) => (
            <Notice key={warning} tone="warn">
              {warning}
            </Notice>
          ))}

          <div className="grid gap-3 sm:grid-cols-3">
            {[
              { title: "Aerobe Schwelle (2 mmol/l)", value: analysis.v2, change: change("v2") },
              { title: "Anaerobe Schwelle (4 mmol/l)", value: analysis.v4, change: change("v4") },
              { title: `Individuell (Laktatbett + 1)`, value: analysis.individual, change: null },
            ].map((item) => (
              <div key={item.title} className="rounded-3xl border border-app-border bg-app-surface shadow-app p-4">
                <p className="text-xs text-app-muted">{item.title}</p>
                <p className="text-2xl font-bold text-app-heading">{item.value ? `${formatPace(item.value.pace100Ms)} /100 m` : "–"}</p>
                <p className="text-xs text-app-muted">
                  {item.value ? `${item.value.speed.toFixed(2).replace(".", ",")} m/s${item.value.heartRate ? ` · HF ${item.value.heartRate}` : ""}` : "nicht bestimmbar"}
                </p>
                {item.change && <p className={`text-xs font-semibold ${item.change.startsWith("+") ? "text-app-good" : "text-app-bad"}`}>{item.change}</p>}
              </div>
            ))}
          </div>

          <Card title={`Laktatkurve · ${formatDate(selected.test_date)}`} description={selected.note ?? undefined}>
            <div className="h-72 p-4">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={analysis.points.map((point) => ({ ...point, paceLabel: formatPace(point.pace100Ms) }))}>
                  <CartesianGrid stroke="var(--app-border)" strokeDasharray="3 3" />
                  <XAxis dataKey="paceLabel" stroke="var(--app-muted)" tick={{ fill: "var(--app-muted)", fontSize: 12 }} />
                  <YAxis yAxisId="la" stroke="var(--app-muted)" tick={{ fill: "var(--app-muted)", fontSize: 12 }} />
                  <YAxis yAxisId="hf" orientation="right" stroke="var(--app-muted)" tick={{ fill: "var(--app-muted)", fontSize: 12 }} />
                  <Tooltip contentStyle={{ backgroundColor: "var(--app-surface)", border: "1px solid var(--app-border)", borderRadius: 12 }} />
                  <Legend />
                  <ReferenceLine yAxisId="la" y={2} stroke="var(--app-good)" strokeDasharray="4 4" />
                  <ReferenceLine yAxisId="la" y={4} stroke="var(--app-bad)" strokeDasharray="4 4" />
                  <Line yAxisId="la" type="monotone" dataKey="lactate" name="Laktat (mmol/l)" stroke="var(--chart-50)" strokeWidth={3} />
                  <Line yAxisId="hf" type="monotone" dataKey="heartRate" name="Herzfrequenz" stroke="var(--chart-25)" strokeWidth={2} connectNulls />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card title="Persönliche Belastungszonen" description="Tempo je 100 m aus diesem Test – als Richtwert für die Serien im Trainingsplan.">
            {analysis.zones.length === 0 ? (
              <p className="p-5 text-sm text-app-muted">Für die Zonen werden beide Schwellen (2 und 4 mmol/l) gebraucht.</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-app-muted">
                    <th className="px-5 py-2 font-medium">Zone</th>
                    <th className="px-3 py-2 font-medium">Bedeutung</th>
                    <th className="px-3 py-2 font-medium">Laktat</th>
                    <th className="px-5 py-2 text-right font-medium">Tempo /100 m</th>
                  </tr>
                </thead>
                <tbody>
                  {analysis.zones.map((zone) => (
                    <tr key={zone.code} className="border-t border-app-border">
                      <td className="px-5 py-2 font-semibold">{zone.code}</td>
                      <td className="px-3 py-2 text-app-muted">{zone.label}</td>
                      <td className="px-3 py-2 text-app-muted">{zone.lactate}</td>
                      <td className="px-5 py-2 text-right font-semibold tabular-nums">
                        {zone.fromPace && zone.toPace
                          ? `${formatPace(zone.fromPace)} – ${formatPace(zone.toPace)}`
                          : zone.toPace
                            ? `langsamer als ${formatPace(zone.toPace)}`
                            : `schneller als ${formatPace(zone.fromPace!)}`}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            <div className="flex justify-between border-t border-app-border px-5 py-2 text-xs text-app-faint">
              <span>
                Stufen: {selected.steps.map((step) => `${formatTime(step.time_ms)} (${String(step.lactate).replace(".", ",")})`).join(" · ")}
              </span>
              <button type="button" onClick={() => remove(selected)} className="text-app-muted hover:text-app-bad">
                Test löschen
              </button>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
