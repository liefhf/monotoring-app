/*
 * Supabase liefert pro Abfrage hoechstens 1000 Zeilen. Fuer Tabellen, die
 * wachsen (Ergebnisse, Tests, ...), seitenweise laden, bis alles da ist.
 *
 * build() muss bei jedem Aufruf eine NEUE Abfrage liefern, z. B.
 *   fetchAll(() => supabase.from("swimmer_results").select(RESULT_COLUMNS))
 */

const PAGE_SIZE = 1000;

type RangeQuery<T> = {
  range: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>;
};

export async function fetchAll<T = Record<string, unknown>>(build: () => RangeQuery<T>) {
  const rows: T[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await build().range(from, from + PAGE_SIZE - 1);
    if (error) return { data: rows.length ? rows : null, error };
    rows.push(...(data ?? []));
    if (!data || data.length < PAGE_SIZE) break;
  }
  return { data: rows, error: null };
}
