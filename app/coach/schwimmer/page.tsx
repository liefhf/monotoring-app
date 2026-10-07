"use client";

import Loader from "@/components/Loader";
import Link from "next/link";
import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { isMissingTable, supabase } from "@/lib/supabase";
import { fetchAll } from "@/lib/fetchAll";
import { Gender, Swimmer, formatGender, getSwimmerName } from "@/lib/swim";
import { Icon } from "@/components/icons";
import {
  Card,
  EmptyState,
  FormField,
  Modal,
  Notice,
  PageHeader,
  buttonGhost,
  buttonPrimary,
  inputClass,
} from "@/components/ui";

/*
 * Athleten: EINE Liste fuer alle, die der Coach betreut.
 * Anlegen geht mit dem Vornamen. Ein eigener Login ist
 * optional und wird beim Athleten verknuepft. Teams
 * enthalten Athleten aus dieser Liste.
 * (Technisch: Tabelle swimmers, Route bleibt /coach/schwimmer.)
 */

type Athlete = Swimmer & { profile_id: string | null };
type Team = { id: string; name: string };
type Membership = { team_id: string; swimmer_id: string };

type Filter = { kind: "all" } | { kind: "team"; id: string } | { kind: "noTeam" } | { kind: "login" } | { kind: "noLogin" };

export default function AthletenPage() {
  const [athletes, setAthletes] = useState<Athlete[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [resultCounts, setResultCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ tone: "good" | "bad" | "warn"; text: string } | null>(null);

  const [filter, setFilter] = useState<Filter>({ kind: "all" });
  const [search, setSearch] = useState("");

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [birthYear, setBirthYear] = useState("");
  const [gender, setGender] = useState<"" | Gender>("");
  const [teamId, setTeamId] = useState("");
  const [saving, setSaving] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const firstNameInput = useRef<HTMLInputElement>(null);

  const loadData = useCallback(async () => {
    const { data: userData } = await supabase.auth.getUser();

    const [athleteResponse, teamResponse, membershipResponse, resultResponse] = await Promise.all([
      supabase.from("swimmers").select("id, first_name, last_name, birth_year, gender, profile_id").order("first_name"),
      supabase.from("teams").select("id, name").eq("coach_id", userData.user?.id ?? "").order("name"),
      supabase.from("team_swimmers").select("team_id, swimmer_id"),
      fetchAll(() => supabase.from("swimmer_results").select("swimmer_id")),
    ]);

    if (athleteResponse.error) {
      setMessage({ tone: "bad", text: `Athleten konnten nicht geladen werden: ${athleteResponse.error.message}` });
      setLoading(false);
      return;
    }

    if (membershipResponse.error) {
      setMessage({
        tone: "warn",
        text: "Teams sind noch nicht mit der Athletenliste verbunden. Bitte führe supabase/athleten_zusammenfuehren.sql im Supabase SQL-Editor aus.",
      });
    }

    const counts: Record<string, number> = {};

    for (const row of resultResponse.data ?? []) {
      counts[row.swimmer_id] = (counts[row.swimmer_id] ?? 0) + 1;
    }

    setAthletes((athleteResponse.data ?? []) as Athlete[]);
    setTeams((teamResponse.data ?? []) as Team[]);
    setMemberships((membershipResponse.data ?? []) as Membership[]);
    setResultCounts(counts);
    setLoading(false);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Daten beim Oeffnen laden
    loadData();
  }, [loadData]);

  const teamsOf = useMemo(() => {
    const map = new Map<string, Team[]>();

    for (const membership of memberships) {
      const team = teams.find((item) => item.id === membership.team_id);

      if (!team) continue;

      map.set(membership.swimmer_id, [...(map.get(membership.swimmer_id) ?? []), team]);
    }

    return map;
  }, [memberships, teams]);

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();

    /* Sortiert nach Nachname, dann Vorname (A-Z) */
    const byLastName = (a: Athlete, b: Athlete) =>
      (a.last_name ?? a.first_name).localeCompare(b.last_name ?? b.first_name, "de") ||
      a.first_name.localeCompare(b.first_name, "de");

    return [...athletes].sort(byLastName).filter((athlete) => {
      if (term && !getSwimmerName(athlete).toLowerCase().includes(term)) return false;

      const own = teamsOf.get(athlete.id) ?? [];

      switch (filter.kind) {
        case "team":
          return own.some((team) => team.id === filter.id);
        case "noTeam":
          return own.length === 0;
        case "login":
          return Boolean(athlete.profile_id);
        case "noLogin":
          return !athlete.profile_id;
        default:
          return true;
      }
    });
  }, [athletes, teamsOf, filter, search]);

  async function handleAdd(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const name = firstName.trim();

    if (!name) {
      setMessage({ tone: "bad", text: "Bitte gib einen Vornamen ein." });
      return;
    }

    const year = birthYear.trim() ? Number(birthYear) : null;

    if (year !== null && (!Number.isInteger(year) || year < 1950 || year > 2100)) {
      setMessage({ tone: "bad", text: "Bitte gib den Jahrgang vierstellig ein, z. B. 2012." });
      return;
    }

    setSaving(true);

    const { data, error } = await supabase
      .from("swimmers")
      .insert({ first_name: name, last_name: lastName.trim() || null, birth_year: year, gender: gender || null })
      .select("id")
      .single();

    if (!error && data && teamId) {
      await supabase.from("team_swimmers").insert({ team_id: teamId, swimmer_id: data.id });
    }

    setSaving(false);

    if (error) {
      setMessage({ tone: "bad", text: `Athlet konnte nicht angelegt werden: ${error.message}` });
      return;
    }

    setMessage({ tone: "good", text: `${name} wurde angelegt ✅` });
    setAddOpen(false);
    setFirstName("");
    setLastName("");
    setBirthYear("");
    firstNameInput.current?.focus();
    await loadData();
  }

  async function handleDelete(athlete: Athlete) {
    /* Hochgeladene Dateien wuerden beim Loeschen im Speicher zurueckbleiben (ohne Eintrag).
       Deshalb erst die Dokumente im Profil loeschen lassen. */
    const files = await supabase.from("athlete_documents").select("id").eq("swimmer_id", athlete.id).not("file_path", "is", null);
    if (files.error && !isMissingTable(files.error.code)) {
      setMessage({ tone: "bad", text: "Löschen abgebrochen: Dokumente des Athleten konnten nicht geprüft werden." });
      return;
    }
    if (files.data?.length) {
      setMessage({
        tone: "bad",
        text: `${getSwimmerName(athlete)} hat noch ${files.data.length} hochgeladene ${files.data.length === 1 ? "Datei" : "Dateien"}. Bitte zuerst im Profil unter Stammdaten → Dokumente löschen.`,
      });
      return;
    }

    if (
      !window.confirm(
        `${getSwimmerName(athlete)} wirklich löschen? Alle Zeiten, Gesundheit, Ziele, Notizen und das Wettkampf-Feedback werden ebenfalls gelöscht. Tipp: vorher Einstellungen → Datensicherung. Ein eigener Login bleibt bestehen.`
      )
    ) {
      return;
    }

    const { data: deleted, error } = await supabase.from("swimmers").delete().eq("id", athlete.id).select("id");

    if (error || !deleted?.length) {
      setMessage({ tone: "bad", text: error ? `Athlet konnte nicht gelöscht werden: ${error.message}` : "Athlet wurde nicht gelöscht (keine Berechtigung)." });
      return;
    }

    setMessage({ tone: "good", text: `${getSwimmerName(athlete)} wurde gelöscht.` });
    await loadData();
  }

  const chips: { key: string; label: string; filter: Filter; count: number }[] = [
    { key: "all", label: "Alle", filter: { kind: "all" }, count: athletes.length },
    ...teams.map((team) => ({
      key: team.id,
      label: team.name,
      filter: { kind: "team", id: team.id } as Filter,
      count: memberships.filter((item) => item.team_id === team.id).length,
    })),
    { key: "noTeam", label: "ohne Team", filter: { kind: "noTeam" }, count: athletes.filter((a) => !(teamsOf.get(a.id)?.length)).length },
    { key: "login", label: "mit Login", filter: { kind: "login" }, count: athletes.filter((a) => a.profile_id).length },
  ];

  const isActive = (candidate: Filter) =>
    candidate.kind === filter.kind && (candidate.kind !== "team" || (filter.kind === "team" && candidate.id === filter.id));

  return (
    <main className="mx-auto max-w-6xl space-y-4 sm:space-y-5">
      <PageHeader
        eyebrow="Team"
        title="Athleten"
        description={
          <>
            Alle, die du betreust – mit oder ohne eigenen Login.{" "}
            <Link href="/coach/teams" className="text-app-accent-soft hover:underline">
              Teams verwalten
            </Link>
          </>
        }
        actions={
          <button type="button" onClick={() => setAddOpen(true)} className={buttonPrimary}>
            <Icon name="plus" className="h-4 w-4" />
            Athlet
          </button>
        }
      />

      {message && <Notice tone={message.tone}>{message.text}</Notice>}

      <Modal open={addOpen} title="Athlet anlegen" onClose={() => setAddOpen(false)}>
        <p className="mb-4 text-sm text-app-muted">Nur der Vorname ist Pflicht. Jahrgang und Geschlecht braucht der Pflichtzeiten-Vergleich.</p>
          <form onSubmit={handleAdd} className="grid gap-3 sm:grid-cols-2">
            <FormField label="Vorname *">
              <input ref={firstNameInput} type="text" value={firstName} onChange={(event) => setFirstName(event.target.value)} required placeholder="z. B. Lena" className={inputClass} />
            </FormField>
            <FormField label="Nachname">
              <input type="text" value={lastName} onChange={(event) => setLastName(event.target.value)} className={inputClass} />
            </FormField>
            <FormField label="Jahrgang">
              <input type="number" inputMode="numeric" value={birthYear} onChange={(event) => setBirthYear(event.target.value)} placeholder="2012" className={inputClass} />
            </FormField>
            <FormField label="Geschlecht">
              <select value={gender} onChange={(event) => setGender(event.target.value as "" | Gender)} className={inputClass}>
                <option value="">–</option>
                <option value="female">weiblich</option>
                <option value="male">männlich</option>
              </select>
            </FormField>
            <FormField label="Team">
              <select value={teamId} onChange={(event) => setTeamId(event.target.value)} className={inputClass}>
                <option value="">– kein Team –</option>
                {teams.map((team) => (
                  <option key={team.id} value={team.id}>
                    {team.name}
                  </option>
                ))}
              </select>
            </FormField>
            <button type="submit" disabled={saving} className={`${buttonPrimary} sm:col-span-2`}>
              {saving ? "Speichern..." : "Anlegen"}
            </button>
          </form>
      </Modal>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="-mx-4 flex w-[calc(100%+2rem)] gap-2 overflow-x-auto px-4 sm:mx-0 sm:w-auto sm:flex-wrap sm:px-0">
          {chips.map((chip) => (
            <button
              key={chip.key}
              type="button"
              onClick={() => setFilter(chip.filter)}
              aria-pressed={isActive(chip.filter)}
              className={`flex h-9 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-3.5 text-[13px] font-bold transition ${
                isActive(chip.filter) ? "bg-app-heading text-app-bg" : "bg-app-elevated text-app-muted hover:text-app-heading"
              }`}
            >
              {chip.label} <span className="num opacity-70">{chip.count}</span>
            </button>
          ))}
        </div>
        <input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Name suchen …"
          aria-label="Athleten suchen"
          className={`${inputClass} w-full sm:w-56`}
        />
      </div>

      <Card>
        {loading ? (
          <p className="p-6 text-sm text-app-muted"><Loader /></p>
        ) : athletes.length === 0 ? (
          <EmptyState icon="athlete" title="Noch keine Athleten">
            Tippe oben auf „Athlet“, um den ersten anzulegen.
          </EmptyState>
        ) : visible.length === 0 ? (
          <p className="p-6 text-sm text-app-muted">Niemand passt zu diesem Filter.</p>
        ) : (
          <>
          {/* Handy: Liste mit Karten (Design 9j) */}
          <ul className="divide-y divide-app-border/60 md:hidden">
            {visible.map((athlete) => (
              <li key={athlete.id}>
                <Link href={`/coach/schwimmer/${athlete.id}`} className="flex min-h-14 items-center gap-3 px-4 py-2.5 transition hover:bg-app-elevated/60">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-app-accent/20 text-sm font-extrabold text-app-accent-soft" aria-hidden="true">
                    {(athlete.first_name?.[0] ?? "").toUpperCase()}
                    {(athlete.last_name?.[0] ?? "").toUpperCase()}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[15px] font-bold text-app-heading">{getSwimmerName(athlete)}</span>
                    <span className="block truncate text-[13px] text-app-muted">
                      {athlete.birth_year ? `Jg. ${athlete.birth_year}` : "Jg. –"}
                      {teamsOf.get(athlete.id)?.length ? ` · ${(teamsOf.get(athlete.id) ?? []).map((team) => team.name).join(", ")}` : ""}
                    </span>
                  </span>
                  <span className="num text-[13px] text-app-muted">{resultCounts[athlete.id] ?? 0} Zeiten</span>
                  {athlete.profile_id && <Icon name="check" className="h-4 w-4 text-app-good" />}
                  <svg viewBox="0 0 20 20" className="h-4 w-4 shrink-0 text-app-faint" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M8 5l5 5-5 5" />
                  </svg>
                </Link>
              </li>
            ))}
          </ul>

          {/* Desktop: Tabelle */}
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="border-b border-app-border/60 text-app-faint">
                <tr>
                  <th className="px-5 py-3 font-medium">Nachname</th>
                  <th className="px-3 py-3 font-medium">Vorname</th>
                  <th className="px-3 py-3 font-medium">Jg.</th>
                  <th className="px-3 py-3 font-medium">Geschlecht</th>
                  <th className="px-3 py-3 font-medium">Teams</th>
                  <th className="px-3 py-3 font-medium">Login</th>
                  <th className="px-3 py-3 font-medium">Zeiten</th>
                  <th className="px-3 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-app-border">
                {visible.map((athlete) => (
                  <tr key={athlete.id} className="hover:bg-app-elevated/60">
                    <td className="px-5 py-3">
                      <Link href={`/coach/schwimmer/${athlete.id}`} className="font-bold text-app-heading hover:text-app-accent-soft hover:underline">
                        {athlete.last_name || "–"}
                      </Link>
                    </td>
                    <td className="px-3 py-3">
                      <Link href={`/coach/schwimmer/${athlete.id}`} className="text-app-heading hover:underline">
                        {athlete.first_name}
                      </Link>
                    </td>
                    <td className="px-3 py-3">{athlete.birth_year ?? "–"}</td>
                    <td className="px-3 py-3">{formatGender(athlete.gender)}</td>
                    <td className="px-3 py-3">
                      <span className="flex flex-wrap gap-1">
                        {(teamsOf.get(athlete.id) ?? []).map((team) => (
                          <span key={team.id} className="rounded-full bg-app-elevated px-2 py-0.5 text-xs text-app-heading">
                            {team.name}
                          </span>
                        ))}
                        {!teamsOf.get(athlete.id)?.length && <span className="text-xs text-app-faint">–</span>}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      {athlete.profile_id ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-app-good/15 px-2 py-0.5 text-xs font-semibold text-app-good">
                          <Icon name="check" className="h-3 w-3" /> verknüpft
                        </span>
                      ) : (
                        <span className="text-xs text-app-faint">–</span>
                      )}
                    </td>
                    <td className="num px-3 py-3 text-app-muted">{resultCounts[athlete.id] ?? 0}</td>
                    <td className="px-3 py-3 text-right">
                      <button type="button" onClick={() => handleDelete(athlete)} className={`${buttonGhost} text-xs hover:text-app-bad`}>
                        Löschen
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          </>
        )}
      </Card>
    </main>
  );
}
