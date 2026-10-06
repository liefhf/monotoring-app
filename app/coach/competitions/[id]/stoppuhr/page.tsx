"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { STROKES, Stroke, Swimmer, formatTime, getDistancesForStroke } from "@/lib/swim";
import {
  Lane,
  addSplit,
  elapsed,
  expectedSplits,
  finishLane,
  laps,
  resetLane,
  startLane,
  undoLane,
} from "@/lib/stopwatch";

/*
 * Live-Stoppuhr am Beckenrand: mehrere Bahnen nebeneinander,
 * grosse Knoepfe fuer Split und Ziel, Zeiten ueberstehen Neuladen
 * (Browser-Speicher) und werden per Klick als Start gespeichert.
 */

type Competition = { id: string; name: string; start_date: string };

const newLane = (index: number): Lane => ({
  id: `${Date.now()}-${index}`,
  swimmerId: "",
  distance: 100,
  stroke: "freestyle",
  startedAt: null,
  splits: [],
  finalMs: null,
  saved: false,
});

/* Laufende Zeit mit Zehnteln (ruhiger zu lesen), gestoppte mit Hundertsteln */
function formatLive(ms: number) {
  const tenths = Math.floor(ms / 100);
  const minutes = Math.floor(tenths / 600);
  const seconds = ((tenths % 600) / 10).toFixed(1).padStart(4, "0").replace(".", ",");
  return minutes ? `${minutes}:${seconds}` : seconds;
}

export default function StoppuhrPage() {
  const params = useParams();
  const competitionId = String(params.id);
  const storageKey = `stoppuhr:${competitionId}`;

  const [competition, setCompetition] = useState<Competition | null>(null);
  const [swimmers, setSwimmers] = useState<Swimmer[]>([]);
  const [pool, setPool] = useState<25 | 50>(25);
  const [lanes, setLanes] = useState<Lane[]>([newLane(0), newLane(1)]);
  const [now, setNow] = useState(() => Date.now());
  const [message, setMessage] = useState<{ tone: "good" | "bad"; text: string } | null>(null);
  const [restored, setRestored] = useState(false);
  const wakeLock = useRef<{ release: () => Promise<void> } | null>(null);

  /* Daten + gespeicherten Stand laden */
  useEffect(() => {
    async function load() {
      const [competitionRes, swimmerRes] = await Promise.all([
        supabase.from("competitions").select("id, name, start_date").eq("id", competitionId).maybeSingle(),
        supabase.from("swimmers").select("id, first_name, last_name, birth_year, gender"),
      ]);
      setCompetition((competitionRes.data as Competition | null) ?? null);
      setSwimmers(
        ((swimmerRes.data ?? []) as Swimmer[]).sort((a, b) => (a.last_name ?? "").localeCompare(b.last_name ?? "", "de"))
      );
    }
    load();
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const saved = JSON.parse(raw);
        // eslint-disable-next-line react-hooks/set-state-in-effect -- gespeicherten Stand aus dem Browser-Speicher laden
        if (saved.lanes?.length) setLanes(saved.lanes);
        if (saved.pool) setPool(saved.pool);
      }
    } catch {
      /* ohne Browser-Speicher weiter */
    }
    setRestored(true);
  }, [competitionId, storageKey]);

  useEffect(() => {
    if (!restored) return;
    try {
      localStorage.setItem(storageKey, JSON.stringify({ lanes, pool }));
    } catch {
      /* ignorieren */
    }
  }, [lanes, pool, restored, storageKey]);

  /* Anzeige aktualisieren, solange eine Uhr laeuft */
  const running = lanes.some((lane) => lane.startedAt !== null && lane.finalMs === null);
  useEffect(() => {
    if (!running) return;
    const timer = setInterval(() => setNow(Date.now()), 50);
    return () => clearInterval(timer);
  }, [running]);

  /* Bildschirm nicht ausgehen lassen, solange die Seite offen ist */
  useEffect(() => {
    const nav = navigator as Navigator & { wakeLock?: { request: (type: "screen") => Promise<{ release: () => Promise<void> }> } };
    nav.wakeLock
      ?.request("screen")
      .then((lock) => (wakeLock.current = lock))
      .catch(() => undefined);
    return () => {
      wakeLock.current?.release().catch(() => undefined);
    };
  }, []);

  function update(id: string, change: (lane: Lane) => Lane) {
    setLanes((current) => current.map((lane) => (lane.id === id ? change(lane) : lane)));
  }

  function tap(id: string, action: "start" | "split" | "finish") {
    const at = Date.now();
    if (navigator.vibrate) navigator.vibrate(action === "finish" ? 80 : 30);
    update(id, (lane) => (action === "start" ? startLane(lane, at) : action === "split" ? addSplit(lane, at) : finishLane(lane, at)));
  }

  function startAll() {
    const at = Date.now();
    if (navigator.vibrate) navigator.vibrate(60);
    setLanes((current) => current.map((lane) => (lane.startedAt === null ? startLane(lane, at) : lane)));
  }

  async function save(lane: Lane) {
    if (!lane.swimmerId || lane.finalMs === null || !competition) {
      setMessage({ tone: "bad", text: "Bitte Athlet wählen und die Uhr mit „Ziel“ stoppen." });
      return;
    }
    const { error } = await supabase.from("competition_starts").insert({
      competition_id: competitionId,
      swimmer_id: lane.swimmerId,
      start_date: new Date().toISOString().slice(0, 10) < competition.start_date ? competition.start_date : new Date().toISOString().slice(0, 10),
      pool_length: pool,
      distance: lane.distance,
      stroke: lane.stroke,
      time_ms: lane.finalMs,
      split_times_ms: lane.splits,
      status: "ok",
    });
    if (error) {
      setMessage({ tone: "bad", text: `Konnte nicht gespeichert werden: ${error.message}` });
      return;
    }
    update(lane.id, (current) => ({ ...current, saved: true }));
    const name = swimmers.find((swimmer) => swimmer.id === lane.swimmerId);
    setMessage({ tone: "good", text: `${name?.first_name ?? "Start"}: ${formatTime(lane.finalMs)} gespeichert ✅ – Fehler & Feedback in der Auswertung ergänzen.` });
  }

  const nameOf = (id: string) => {
    const swimmer = swimmers.find((item) => item.id === id);
    return swimmer ? `${swimmer.first_name} ${swimmer.last_name ?? ""}`.trim() : "";
  };

  return (
    <main className="mx-auto max-w-6xl space-y-4 pb-24">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href={`/coach/competitions/${competitionId}/auswertung`} className="text-sm text-app-accent">
            ← zur Auswertung
          </Link>
          <h1 className="text-2xl font-extrabold tracking-tight text-app-heading sm:text-[28px]">⏱ Stoppuhr</h1>
          <p className="text-sm text-app-muted">{competition?.name ?? ""}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex overflow-hidden rounded-xl border border-app-border">
            {([25, 50] as const).map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setPool(value)}
                className={`px-4 py-2.5 text-sm font-semibold ${pool === value ? "bg-app-accent text-app-accent-ink" : "text-app-text"}`}
              >
                {value} m
              </button>
            ))}
          </div>
          <button type="button" onClick={startAll} className="rounded-xl bg-app-good px-5 py-2.5 text-sm font-bold text-app-signal-ink">
            ▶ Alle starten
          </button>
          <button
            type="button"
            onClick={() => setLanes((current) => [...current, newLane(current.length)])}
            className="rounded-xl border border-app-border px-4 py-2.5 text-sm font-semibold"
          >
            + Bahn
          </button>
        </div>
      </div>

      {message && (
        <p className={`rounded-xl px-4 py-3 text-sm font-semibold ${message.tone === "good" ? "bg-app-good/10 text-app-good" : "bg-app-bad/10 text-app-bad"}`}>
          {message.text}
        </p>
      )}

      <div className="grid gap-3 md:grid-cols-2">
        {lanes.map((lane, index) => {
          const time = elapsed(lane, now);
          const expected = expectedSplits(lane.distance, pool);
          const laneLaps = laps(lane.splits, lane.finalMs);
          const isRunning = lane.startedAt !== null && lane.finalMs === null;
          const done = lane.finalMs !== null;

          return (
            <section
              key={lane.id}
              className={`space-y-3 rounded-2xl border p-3 ${lane.saved ? "border-app-good/60 bg-app-good/5" : "border-app-border bg-app-surface"}`}
            >
              <div className="flex flex-wrap gap-2">
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-app-elevated text-sm font-bold">{index + 1}</span>
                <select
                  value={lane.swimmerId}
                  onChange={(e) => update(lane.id, (current) => ({ ...current, swimmerId: e.target.value }))}
                  className="min-w-0 flex-1 rounded-lg border border-app-border bg-app-bg px-2 text-base"
                >
                  <option value="">Athlet wählen …</option>
                  {swimmers.map((swimmer) => (
                    <option key={swimmer.id} value={swimmer.id}>
                      {swimmer.last_name}, {swimmer.first_name}
                    </option>
                  ))}
                </select>
                <select
                  value={lane.distance}
                  onChange={(e) => update(lane.id, (current) => ({ ...current, distance: Number(e.target.value) }))}
                  className="rounded-lg border border-app-border bg-app-bg px-2 text-base"
                >
                  {getDistancesForStroke(lane.stroke as Stroke).map((distance) => (
                    <option key={distance} value={distance}>
                      {distance} m
                    </option>
                  ))}
                </select>
                <select
                  value={lane.stroke}
                  onChange={(e) => {
                    const stroke = e.target.value as Stroke;
                    const distances = getDistancesForStroke(stroke);
                    update(lane.id, (current) => ({
                      ...current,
                      stroke,
                      distance: distances.includes(current.distance) ? current.distance : distances[0],
                    }));
                  }}
                  className="rounded-lg border border-app-border bg-app-bg px-2 text-base"
                >
                  {STROKES.map((stroke) => (
                    <option key={stroke.value} value={stroke.value}>
                      {stroke.short}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-end justify-between gap-2">
                <p className={`font-mono text-5xl font-bold tabular-nums ${done ? "text-app-good" : "text-app-heading"}`}>
                  {done ? formatTime(time) : formatLive(time)}
                </p>
                <p className="pb-1 text-right text-xs text-app-muted">
                  {nameOf(lane.swimmerId) || "–"}
                  <br />
                  Splits {lane.splits.length}/{expected}
                </p>
              </div>

              {laneLaps.length > 0 && (
                <div className="flex flex-wrap gap-1 text-xs">
                  {laneLaps.map((lap, lapIndex) => (
                    <span key={lapIndex} className="rounded bg-app-elevated px-1.5 py-0.5 tabular-nums">
                      {(lapIndex + 1) * pool} m: {formatTime(lap)}
                    </span>
                  ))}
                </div>
              )}

              {!lane.startedAt ? (
                <button type="button" onClick={() => tap(lane.id, "start")} className="h-20 w-full rounded-2xl bg-app-good text-2xl font-bold text-app-signal-ink active:scale-[0.98]">
                  ▶ Start
                </button>
              ) : isRunning ? (
                <div className="grid grid-cols-[2fr_1fr] gap-2">
                  <button type="button" onClick={() => tap(lane.id, "split")} className="h-24 rounded-2xl bg-app-accent text-3xl font-bold text-app-accent-ink active:scale-[0.98]">
                    Split
                  </button>
                  <button type="button" onClick={() => tap(lane.id, "finish")} className="h-24 rounded-2xl bg-app-bad text-2xl font-bold text-white active:scale-[0.98]">
                    Ziel
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => save(lane)}
                  disabled={lane.saved}
                  className="h-16 w-full rounded-2xl bg-app-accent text-xl font-bold text-app-accent-ink disabled:bg-app-good disabled:text-app-signal-ink"
                >
                  {lane.saved ? "✓ gespeichert" : "Speichern"}
                </button>
              )}

              <div className="flex justify-between text-sm">
                <button type="button" onClick={() => update(lane.id, undoLane)} disabled={!lane.startedAt || lane.saved} className="px-2 py-1 text-app-muted disabled:opacity-40">
                  ↶ letzter Tipp zurück
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (lane.startedAt && !lane.saved && !window.confirm("Uhr zurücksetzen? Die Zeit geht verloren.")) return;
                    update(lane.id, resetLane);
                  }}
                  className="px-2 py-1 text-app-muted"
                >
                  neu
                </button>
                {lanes.length > 1 && (
                  <button
                    type="button"
                    onClick={() => setLanes((current) => current.filter((item) => item.id !== lane.id))}
                    className="px-2 py-1 text-app-faint"
                  >
                    Bahn entfernen
                  </button>
                )}
              </div>
            </section>
          );
        })}
      </div>

      <p className="text-xs text-app-faint">
        Tipps innerhalb von 3 s nach dem letzten werden ignoriert (Doppeltipper). Zeiten bleiben auch nach Neuladen erhalten. Der
        Bildschirm bleibt an, solange diese Seite offen ist.
      </p>
    </main>
  );
}
