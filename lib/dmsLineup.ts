import { SwimEvent, SwimmerResult } from "@/lib/swim";

/*
 * DMS-Aufstellung: Einzelstarts, Wertung als Mannschaft ueber Punkte.
 * Jede Strecke hat eine feste Zahl an Starts (z. B. 2), jeder Schwimmer
 * darf hoechstens N Starts haben (z. B. 5). Gesucht ist die Verteilung mit
 * der hoechsten Punktsumme.
 *
 * Das ist ein "b-Matching" im bipartiten Graphen (Schwimmer <-> Strecken);
 * geloest exakt mit einem kleinen Min-Cost-Max-Flow. Die Regeln sind frei
 * einstellbar, weil die Ausschreibung noch fehlt.
 */

export type Candidate = { swimmerId: string; event: SwimEvent; points: number; timeMs: number; result: SwimmerResult };

export type Assignment = { event: SwimEvent; slots: (Candidate | null)[] };

const eventKey = (event: SwimEvent) => `${event.distance}-${event.stroke}`;

/* Beste Punktzahl je Schwimmer und Strecke (Bahn und Zeitraum waehlbar) */
export function candidatesFrom(results: SwimmerResult[], events: SwimEvent[], pool: number | null, since: string): Candidate[] {
  const wanted = new Set(events.map(eventKey));
  const best = new Map<string, Candidate>();
  for (const result of results) {
    if (!result.points || result.result_date < since) continue;
    if (pool !== null && result.pool_length !== pool) continue;
    const key = `${result.distance}-${result.stroke}`;
    if (!wanted.has(key)) continue;
    const id = `${result.swimmer_id}|${key}`;
    const current = best.get(id);
    if (!current || result.points > current.points) {
      best.set(id, {
        swimmerId: result.swimmer_id,
        event: { distance: result.distance, stroke: result.stroke },
        points: result.points,
        timeMs: result.time_ms,
        result,
      });
    }
  }
  return [...best.values()];
}

type Edge = { to: number; rev: number; cap: number; cost: number };

/* Min-Cost-Max-Flow (Bellman-Ford / SPFA), Kosten = -Punkte */
function minCostFlow(graph: Edge[][], source: number, sink: number) {
  const n = graph.length;
  for (;;) {
    const dist = new Array(n).fill(Infinity);
    const inQueue = new Array(n).fill(false);
    const prev: ({ node: number; edge: number } | null)[] = new Array(n).fill(null);
    dist[source] = 0;
    const queue = [source];
    while (queue.length) {
      const u = queue.shift()!;
      inQueue[u] = false;
      graph[u].forEach((edge, index) => {
        if (edge.cap > 0 && dist[u] + edge.cost < dist[edge.to] - 1e-9) {
          dist[edge.to] = dist[u] + edge.cost;
          prev[edge.to] = { node: u, edge: index };
          if (!inQueue[edge.to]) {
            inQueue[edge.to] = true;
            queue.push(edge.to);
          }
        }
      });
    }
    /* nur Wege mit Gewinn (negative Kosten) nehmen */
    if (dist[sink] === Infinity || dist[sink] >= 0) break;
    let flow = Infinity;
    for (let v = sink; v !== source; v = prev[v]!.node) flow = Math.min(flow, graph[prev[v]!.node][prev[v]!.edge].cap);
    for (let v = sink; v !== source; v = prev[v]!.node) {
      const edge = graph[prev[v]!.node][prev[v]!.edge];
      edge.cap -= flow;
      graph[v][edge.rev].cap += flow;
    }
  }
}

export function optimizeLineup({
  candidates,
  events,
  swimmerIds,
  startsPerEvent,
  maxStartsPerSwimmer,
  locked = [],
  excluded = [],
}: {
  candidates: Candidate[];
  events: SwimEvent[];
  swimmerIds: string[];
  startsPerEvent: number;
  maxStartsPerSwimmer: number;
  /* fest gesetzt: "swimmerId|100-freestyle" */
  locked?: string[];
  /* ausgeschlossen: "swimmerId|100-freestyle" */
  excluded?: string[];
}): { assignments: Assignment[]; total: number; startsBySwimmer: Record<string, number> } {
  const S = swimmerIds.length;
  const E = events.length;
  const source = 0;
  const sink = 1 + S + E;
  const graph: Edge[][] = Array.from({ length: sink + 1 }, () => []);
  const add = (from: number, to: number, cap: number, cost: number) => {
    graph[from].push({ to, rev: graph[to].length, cap, cost });
    graph[to].push({ to: from, rev: graph[from].length - 1, cap: 0, cost: -cost });
  };
  const swimmerIndex = new Map(swimmerIds.map((id, index) => [id, 1 + index]));
  const eventIndex = new Map(events.map((event, index) => [eventKey(event), 1 + S + index]));

  /* Fest gesetzte Starts zaehlen vorab gegen die Grenzen */
  const lockedCandidates = candidates.filter((c) => locked.includes(`${c.swimmerId}|${eventKey(c.event)}`));
  const lockedPerSwimmer = new Map<string, number>();
  const lockedPerEvent = new Map<string, number>();
  for (const c of lockedCandidates) {
    lockedPerSwimmer.set(c.swimmerId, (lockedPerSwimmer.get(c.swimmerId) ?? 0) + 1);
    lockedPerEvent.set(eventKey(c.event), (lockedPerEvent.get(eventKey(c.event)) ?? 0) + 1);
  }

  for (const id of swimmerIds) add(source, swimmerIndex.get(id)!, Math.max(0, maxStartsPerSwimmer - (lockedPerSwimmer.get(id) ?? 0)), 0);
  for (const event of events) add(eventIndex.get(eventKey(event))!, sink, Math.max(0, startsPerEvent - (lockedPerEvent.get(eventKey(event)) ?? 0)), 0);
  const edgeOf = new Map<string, { from: number; index: number; candidate: Candidate }>();
  for (const c of candidates) {
    const key = `${c.swimmerId}|${eventKey(c.event)}`;
    if (excluded.includes(key) || locked.includes(key)) continue;
    const from = swimmerIndex.get(c.swimmerId);
    const to = eventIndex.get(eventKey(c.event));
    if (!from || !to) continue;
    add(from, to, 1, -c.points);
    edgeOf.set(key, { from, index: graph[from].length - 1, candidate: c });
  }

  minCostFlow(graph, source, sink);

  const chosen = [...lockedCandidates];
  for (const { from, index, candidate } of edgeOf.values()) if (graph[from][index].cap === 0) chosen.push(candidate);

  const assignments = events.map((event) => {
    const list = chosen.filter((c) => eventKey(c.event) === eventKey(event)).sort((a, b) => b.points - a.points);
    return { event, slots: Array.from({ length: startsPerEvent }, (_, i) => list[i] ?? null) };
  });
  const startsBySwimmer: Record<string, number> = {};
  for (const c of chosen) startsBySwimmer[c.swimmerId] = (startsBySwimmer[c.swimmerId] ?? 0) + 1;
  return { assignments, total: chosen.reduce((sum, c) => sum + c.points, 0), startsBySwimmer };
}
