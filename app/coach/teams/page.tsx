"use client";

import Loader from "@/components/Loader";
import Link from "next/link";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Swimmer, getSwimmerName } from "@/lib/swim";
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
  buttonSecondary,
  inputClass,
} from "@/components/ui";

/*
 * Teams des Coaches. Ein Team enthaelt Athleten aus
 * "Athleten" (swimmers) - egal ob mit oder ohne Login.
 * Fuer Athleten mit Login pflegt die Datenbank die alte
 * Tabelle team_members automatisch mit
 * (supabase/athleten_zusammenfuehren.sql).
 */

type Team = { id: string; name: string };
type Membership = { team_id: string; swimmer_id: string };
type TeamSwimmer = Swimmer & { profile_id: string | null };

export default function TeamsPage() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [swimmers, setSwimmers] = useState<TeamSwimmer[]>([]);
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ tone: "good" | "bad" | "warn"; text: string } | null>(null);

  const [newTeamName, setNewTeamName] = useState("");
  const [editing, setEditing] = useState<Team | null>(null);
  const [selection, setSelection] = useState<Set<string>>(new Set());
  const [teamName, setTeamName] = useState("");
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);

  const loadData = useCallback(async () => {
    const { data: userData } = await supabase.auth.getUser();

    if (!userData.user) {
      setMessage({ tone: "bad", text: "Coach konnte nicht geladen werden." });
      setLoading(false);
      return;
    }

    const [teamResponse, swimmerResponse, membershipResponse] = await Promise.all([
      supabase.from("teams").select("id, name").eq("coach_id", userData.user.id).order("name"),
      supabase.from("swimmers").select("id, first_name, last_name, birth_year, gender, profile_id").order("first_name"),
      supabase.from("team_swimmers").select("team_id, swimmer_id"),
    ]);

    if (membershipResponse.error) {
      setMessage({
        tone: "warn",
        text: "Die Teams sind noch nicht auf die neue Athletenliste umgestellt. Bitte führe supabase/athleten_zusammenfuehren.sql im Supabase SQL-Editor aus.",
      });
    }

    setTeams((teamResponse.data ?? []) as Team[]);
    setSwimmers((swimmerResponse.data ?? []) as TeamSwimmer[]);
    setMemberships((membershipResponse.data ?? []) as Membership[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Daten beim Oeffnen laden
    loadData();
  }, [loadData]);

  const membersOf = useCallback(
    (teamId: string) => {
      const ids = new Set(memberships.filter((item) => item.team_id === teamId).map((item) => item.swimmer_id));

      return swimmers.filter((swimmer) => ids.has(swimmer.id));
    },
    [memberships, swimmers]
  );

  const withoutTeam = useMemo(() => {
    const assigned = new Set(memberships.map((item) => item.swimmer_id));

    return swimmers.filter((swimmer) => !assigned.has(swimmer.id));
  }, [memberships, swimmers]);

  function openTeam(team: Team, currentMemberships = memberships) {
    setEditing(team);
    setTeamName(team.name);
    setSearch("");
    setSelection(new Set(currentMemberships.filter((item) => item.team_id === team.id).map((item) => item.swimmer_id)));
  }

  async function handleCreateTeam(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const name = newTeamName.trim();

    if (!name) return;

    const { data: userData } = await supabase.auth.getUser();
    const { data, error } = await supabase
      .from("teams")
      .insert({ name, coach_id: userData.user?.id })
      .select("id, name")
      .single();

    if (error || !data) {
      setMessage({ tone: "bad", text: `Team konnte nicht angelegt werden: ${error?.message}` });
      return;
    }

    setNewTeamName("");
    setMessage({ tone: "good", text: `„${name}“ angelegt ✅ – jetzt Athleten zuordnen.` });
    await loadData();
    openTeam(data as Team, []);
  }

  function toggle(swimmerId: string) {
    setSelection((current) => {
      const next = new Set(current);

      if (next.has(swimmerId)) next.delete(swimmerId);
      else next.add(swimmerId);

      return next;
    });
  }

  async function saveTeam() {
    if (!editing) return;

    setSaving(true);

    const before = new Set(memberships.filter((item) => item.team_id === editing.id).map((item) => item.swimmer_id));
    const toAdd = [...selection].filter((id) => !before.has(id));
    const toRemove = [...before].filter((id) => !selection.has(id));

    if (teamName.trim() && teamName.trim() !== editing.name) {
      const { error } = await supabase.from("teams").update({ name: teamName.trim() }).eq("id", editing.id);

      if (error) {
        setSaving(false);
        setMessage({ tone: "bad", text: `Name konnte nicht geändert werden: ${error.message}` });
        return;
      }
    }

    if (toAdd.length > 0) {
      const { error } = await supabase.from("team_swimmers").insert(toAdd.map((swimmer_id) => ({ team_id: editing.id, swimmer_id })));

      if (error) {
        setSaving(false);
        setMessage({ tone: "bad", text: `Athleten konnten nicht zugeordnet werden: ${error.message}` });
        return;
      }
    }

    if (toRemove.length > 0) {
      const { error } = await supabase.from("team_swimmers").delete().eq("team_id", editing.id).in("swimmer_id", toRemove);

      if (error) {
        setSaving(false);
        setMessage({ tone: "bad", text: `Athleten konnten nicht entfernt werden: ${error.message}` });
        return;
      }
    }

    setSaving(false);
    setEditing(null);
    setMessage({ tone: "good", text: `Team gespeichert ✅ (${selection.size} Athleten)` });
    await loadData();
  }

  async function deleteTeam(team: Team) {
    if (
      !window.confirm(
        `Team „${team.name}“ löschen? Die Athleten bleiben erhalten. Termine, News und der Gruppenraum dieses Teams werden mit gelöscht.`
      )
    ) {
      return;
    }

    const { error } = await supabase.from("teams").delete().eq("id", team.id);

    if (error) {
      setMessage({ tone: "bad", text: `Team konnte nicht gelöscht werden: ${error.message}` });
      return;
    }

    setEditing(null);
    setMessage({ tone: "good", text: `„${team.name}“ gelöscht.` });
    await loadData();
  }

  const filteredSwimmers = swimmers.filter((swimmer) =>
    getSwimmerName(swimmer).toLowerCase().includes(search.trim().toLowerCase())
  );

  return (
    <main className="mx-auto max-w-6xl space-y-6">
      <PageHeader
        icon="teams"
        title="Teams"
        description={
          <>
            Teams bündeln deine Athleten für Kalender, News und Gruppenräume. Athleten selbst legst du unter{" "}
            <Link href="/coach/schwimmer" className="text-app-accent hover:underline">
              Athleten
            </Link>{" "}
            an.
          </>
        }
      />

      {message && <Notice tone={message.tone}>{message.text}</Notice>}

      <Card>
        <form onSubmit={handleCreateTeam} className="flex flex-wrap items-end gap-3 p-5">
          <FormField label="Neues Team" className="min-w-60 flex-1">
            <input
              type="text"
              value={newTeamName}
              onChange={(event) => setNewTeamName(event.target.value)}
              placeholder="z. B. Leistungsgruppe 1"
              className={inputClass}
            />
          </FormField>
          <button type="submit" disabled={!newTeamName.trim()} className={buttonPrimary}>
            <Icon name="plus" className="h-4 w-4" />
            Team anlegen
          </button>
        </form>
      </Card>

      {loading ? (
        <div className="rounded-[20px] border border-app-border bg-app-surface shadow-app p-10 text-center text-app-muted"><Loader /></div>
      ) : teams.length === 0 ? (
        <Card>
          <EmptyState icon="teams" title="Noch kein Team">
            Leg oben dein erstes Team an.
          </EmptyState>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {teams.map((team) => {
            const members = membersOf(team.id);
            const withLogin = members.filter((member) => member.profile_id).length;

            return (
              <section key={team.id} className="flex flex-col rounded-[20px] border border-app-border bg-app-surface shadow-app p-5 shadow-app">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="truncate text-lg font-semibold">{team.name}</h2>
                    <p className="text-sm text-app-muted">
                      {members.length} Athlet{members.length === 1 ? "" : "en"} · {withLogin} mit Login
                    </p>
                  </div>
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-app-accent/12 text-app-accent">
                    <Icon name="teams" className="h-5 w-5" />
                  </span>
                </div>

                <div className="mt-4 flex flex-1 flex-wrap content-start gap-1.5">
                  {members.length === 0 ? (
                    <p className="text-sm text-app-faint">Noch keine Athleten zugeordnet.</p>
                  ) : (
                    members.slice(0, 14).map((member) => (
                      <Link
                        key={member.id}
                        href={`/coach/schwimmer/${member.id}`}
                        className="rounded-full bg-app-elevated px-2.5 py-1 text-xs font-medium text-app-heading hover:bg-app-accent/12 hover:text-app-accent"
                      >
                        {getSwimmerName(member)}
                      </Link>
                    ))
                  )}
                  {members.length > 14 && <span className="px-1 py-1 text-xs text-app-muted">+{members.length - 14} weitere</span>}
                </div>

                <div className="mt-4 flex gap-2 border-t border-app-border pt-4">
                  <button type="button" onClick={() => openTeam(team)} className={`${buttonSecondary} flex-1`}>
                    Athleten zuordnen
                  </button>
                  <Link href={`/coach/gruppen/${team.id}`} className={buttonGhost} title="Gruppenraum">
                    <Icon name="chat" className="h-4 w-4" />
                  </Link>
                </div>
              </section>
            );
          })}
        </div>
      )}

      {!loading && withoutTeam.length > 0 && teams.length > 0 && (
        <Notice tone="warn">
          {withoutTeam.length} Athlet{withoutTeam.length === 1 ? " ist" : "en sind"} in keinem Team:{" "}
          {withoutTeam.slice(0, 8).map(getSwimmerName).join(", ")}
          {withoutTeam.length > 8 ? " …" : ""}
        </Notice>
      )}

      <Modal open={Boolean(editing)} title={editing ? `Team: ${editing.name}` : ""} onClose={() => setEditing(null)} wide>
        {editing && (
          <div className="space-y-5">
            <FormField label="Name">
              <input type="text" value={teamName} onChange={(event) => setTeamName(event.target.value)} className={inputClass} />
            </FormField>

            <div>
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-medium text-app-text">
                  Athleten <span className="text-app-muted">({selection.size} ausgewählt)</span>
                </p>
                <input
                  type="search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Suchen …"
                  className={`${inputClass} w-48 py-1.5`}
                />
              </div>

              {swimmers.length === 0 ? (
                <p className="text-sm text-app-muted">
                  Noch keine Athleten.{" "}
                  <Link href="/coach/schwimmer" className="text-app-accent hover:underline">
                    Athleten anlegen
                  </Link>
                </p>
              ) : (
                <div className="grid max-h-[45vh] gap-1.5 overflow-y-auto sm:grid-cols-2">
                  {filteredSwimmers.map((swimmer) => {
                    const checked = selection.has(swimmer.id);

                    return (
                      <label
                        key={swimmer.id}
                        className={`flex cursor-pointer items-center gap-3 rounded-xl border px-3 py-2 text-sm transition ${
                          checked ? "border-app-accent/50 bg-app-accent/8" : "border-app-border hover:bg-app-elevated"
                        }`}
                      >
                        <input type="checkbox" checked={checked} onChange={() => toggle(swimmer.id)} />
                        <span className="min-w-0 flex-1 truncate font-medium text-app-heading">{getSwimmerName(swimmer)}</span>
                        <span className="text-xs text-app-muted">{swimmer.birth_year ?? ""}</span>
                        {swimmer.profile_id && (
                          <span className="rounded-full bg-app-good/15 px-1.5 py-px text-[10px] font-semibold text-app-good" title="hat einen Login">
                            Login
                          </span>
                        )}
                      </label>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="flex flex-wrap justify-between gap-2 border-t border-app-border pt-4">
              <button type="button" onClick={() => deleteTeam(editing)} className={`${buttonGhost} text-app-bad`}>
                Team löschen
              </button>
              <div className="flex gap-2">
                <button type="button" onClick={() => setEditing(null)} className={buttonSecondary}>
                  Abbrechen
                </button>
                <button type="button" onClick={saveTeam} disabled={saving} className={buttonPrimary}>
                  {saving ? "Speichern..." : "Speichern"}
                </button>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </main>
  );
}
