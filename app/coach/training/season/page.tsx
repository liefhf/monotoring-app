"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import {
  EntryCategory,
  categoryToSeasonType,
  isoToLocalParts,
  localToIso,
  seasonTypeToCategory,
} from "@/lib/community";

type DatabaseEventType =
  | "competition"
  | "training_camp"
  | "testing"
  | "meeting"
  | "other";

type ColorKey =
  | "amber"
  | "blue"
  | "violet"
  | "cyan"
  | "emerald"
  | "red"
  | "orange"
  | "pink"
  | "lime"
  | "slate";

type Team = {
  id: string;
  name: string;
};

type CalendarEvent = {
  id: string;
  coach_id: string;
  team_id: string | null;
  title: string;
  event_type: DatabaseEventType;
  start_date: string;
  end_date: string | null;
  location: string | null;
  description: string | null;
  color: string | null;
  created_at: string;
};

type CalendarTask = {
  id: string;
  coach_id: string;
  event_id: string | null;
  team_id: string | null;
  title: string;
  due_date: string;
  completed: boolean;
  description: string | null;
  color: string | null;
  created_at: string;
};

type MonthData = {
  year: number;
  month: number;
  label: string;
};

type CalendarCell = {
  day: number | null;
  dateString: string | null;
};

type PositionedEvent = {
  event: CalendarEvent;
  lane: number;
};

type PositionedTask = {
  task: CalendarTask;
  lane: number;
};

const eventTypeOptions: {
  value: DatabaseEventType;
  label: string;
}[] = [
  {
    value: "competition",
    label: "Wettkampf",
  },
  {
    value: "training_camp",
    label: "Trainingslager",
  },
  {
    value: "testing",
    label: "Test / Diagnostik",
  },
  {
    value: "meeting",
    label: "Besprechung",
  },
  {
    value: "other",
    label: "Sonstiges",
  },
];

const colorOptions: {
  value: ColorKey;
  label: string;
}[] = [
  {
    value: "amber",
    label: "Gelb",
  },
  {
    value: "blue",
    label: "Blau",
  },
  {
    value: "violet",
    label: "Violett",
  },
  {
    value: "cyan",
    label: "Türkis",
  },
  {
    value: "emerald",
    label: "Grün",
  },
  {
    value: "red",
    label: "Rot",
  },
  {
    value: "orange",
    label: "Orange",
  },
  {
    value: "pink",
    label: "Pink",
  },
  {
    value: "lime",
    label: "Hellgrün",
  },
  {
    value: "slate",
    label: "Grau",
  },
];

const colorStyles: Record<
  ColorKey,
  {
    card: string;
    dot: string;
    soft: string;
  }
> = {
  amber: {
    card: "border-app-warn bg-app-warn text-app-signal-ink",
    dot: "bg-app-warn",
    soft: "border-app-warn/40 bg-app-warn/10 text-app-warn",
  },

  blue: {
    card: "border-app-accent bg-app-accent text-app-accent-ink",
    dot: "bg-app-accent",
    soft: "border-app-accent/40 bg-app-accent/10 text-app-accent",
  },

  violet: {
    card: "border-app-accent bg-app-accent text-app-accent-ink",
    dot: "bg-app-accent",
    soft: "border-app-accent/40 bg-app-accent/10 text-app-accent",
  },

  cyan: {
    card: "border-app-accent bg-app-accent text-app-accent-ink",
    dot: "bg-app-accent",
    soft: "border-app-accent/40 bg-app-accent/10 text-app-accent",
  },

  emerald: {
    card: "border-app-good bg-app-good text-app-signal-ink",
    dot: "bg-app-good",
    soft: "border-app-good/40 bg-app-good/10 text-app-good",
  },

  red: {
    card: "border-app-bad bg-app-bad text-white",
    dot: "bg-app-bad",
    soft: "border-app-bad/40 bg-app-bad/10 text-app-bad",
  },

  orange: {
    card: "border-app-warn bg-app-warn text-app-signal-ink",
    dot: "bg-app-warn",
    soft: "border-app-warn/40 bg-app-warn/10 text-app-warn",
  },

  pink: {
    card: "border-app-soon bg-app-soon text-app-signal-ink",
    dot: "bg-pink-500",
    soft: "border-pink-800 bg-pink-950 text-pink-200",
  },

  lime: {
    card: "border-lime-300 bg-lime-500 text-app-accent-ink",
    dot: "bg-lime-500",
    soft: "border-lime-800 bg-lime-950 text-lime-200",
  },

  slate: {
    card: "border-app-border bg-app-elevated text-app-heading",
    dot: "bg-app-elevated",
    soft: "border-app-border bg-app-elevated text-app-text",
  },
};

function getLocalDateString(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function parseDate(date: string) {
  return new Date(`${date}T12:00:00`);
}

function formatDate(date: string | null) {
  if (!date) {
    return "—";
  }

  return parseDate(date).toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function formatShortDate(date: string | null) {
  if (!date) {
    return "";
  }

  return parseDate(date).toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
  });
}

function getDefaultSeasonStartYear() {
  const now = new Date();

  if (now.getMonth() >= 7) {
    return now.getFullYear();
  }

  return now.getFullYear() - 1;
}

function getSeasonMonths(seasonStartYear: number): MonthData[] {
  const months: MonthData[] = [];

  for (let index = 0; index < 12; index += 1) {
    const date = new Date(seasonStartYear, 7 + index, 1);

    months.push({
      year: date.getFullYear(),
      month: date.getMonth(),
      label: date.toLocaleDateString("de-DE", {
        month: "short",
      }),
    });
  }

  return months;
}

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getMondayBasedOffset(year: number, month: number) {
  const weekday = new Date(year, month, 1).getDay();

  return weekday === 0 ? 6 : weekday - 1;
}

function isSingleDayEvent(event: CalendarEvent) {
  return !event.end_date || event.end_date === event.start_date;
}

function isColorKey(value: string | null): value is ColorKey {
  return colorOptions.some((option) => option.value === value);
}

export default function SeasonPlanningPage() {
  const [seasonStartYear, setSeasonStartYear] = useState(
    getDefaultSeasonStartYear()
  );

  const initialDate = new Date();

  const [visibleMonth, setVisibleMonth] = useState(
    initialDate.getMonth()
  );

  const [visibleYear, setVisibleYear] = useState(
    initialDate.getFullYear()
  );

  const [teams, setTeams] = useState<Team[]>([]);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [tasks, setTasks] = useState<CalendarTask[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const [showEventForm, setShowEventForm] = useState(false);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [showCompletedTasks, setShowCompletedTasks] = useState(false);

  /*
    TEAM-FILTER
  */

  const [selectedTeamId, setSelectedTeamId] = useState("");

  /*
    NEU:
    Angeclickter Tag im Monatskalender.

    Wenn hier ein Datum steht,
    wird das kleine Auswahlfenster angezeigt.
  */

  const [selectedCalendarDate, setSelectedCalendarDate] = useState<
    string | null
  >(null);

  /*
    Bearbeiten-Modus
  */

  const [editingEventId, setEditingEventId] = useState<string | null>(
    null
  );

  const [editingTaskId, setEditingTaskId] = useState<string | null>(
    null
  );

  /*
    Termin Formular
  */

  const [newEventTitle, setNewEventTitle] = useState("");

  const [newEventType, setNewEventType] =
    useState<DatabaseEventType>("competition");

  const [newEventStartDate, setNewEventStartDate] = useState("");
  const [newEventEndDate, setNewEventEndDate] = useState("");
  const [newEventTeamId, setNewEventTeamId] = useState("");
  const [newEventLocation, setNewEventLocation] = useState("");

  const [newEventDescription, setNewEventDescription] =
    useState("");

  const [newEventColor, setNewEventColor] =
    useState<ColorKey>("amber");

  /*
    Aufgaben Formular
  */

  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskDueDate, setNewTaskDueDate] = useState("");
  const [newTaskEventId, setNewTaskEventId] = useState("");
  const [newTaskTeamId, setNewTaskTeamId] = useState("");

  const [newTaskDescription, setNewTaskDescription] =
    useState("");

  const [newTaskColor, setNewTaskColor] =
    useState<ColorKey>("emerald");

  const todayDate = new Date();
  const today = getLocalDateString(todayDate);

  const visibleMonthName = new Date(
    visibleYear,
    visibleMonth,
    1
  ).toLocaleDateString("de-DE", {
    month: "long",
    year: "numeric",
  });

  const visibleMonthStart = `${visibleYear}-${String(
    visibleMonth + 1
  ).padStart(2, "0")}-01`;

  const visibleMonthEnd = `${visibleYear}-${String(
    visibleMonth + 1
  ).padStart(2, "0")}-${String(
    getDaysInMonth(visibleYear, visibleMonth)
  ).padStart(2, "0")}`;

  /*
    Saison August bis Juli
  */

  const seasonStart = `${seasonStartYear}-08-01`;
  const seasonEnd = `${seasonStartYear + 1}-07-31`;

  const queryStart =
    visibleMonthStart < seasonStart
      ? visibleMonthStart
      : seasonStart;

  const queryEnd =
    visibleMonthEnd > seasonEnd ? visibleMonthEnd : seasonEnd;

  const months = useMemo(
    () => getSeasonMonths(seasonStartYear),
    [seasonStartYear]
  );

  useEffect(() => {
    loadPlanning();
  }, [seasonStartYear, visibleMonth, visibleYear]);

  function matchesTeamFilter(teamId: string | null) {
    if (!selectedTeamId) {
      return true;
    }

    return teamId === selectedTeamId || teamId === null;
  }

  function getDefaultEventColor(
    type: DatabaseEventType
  ): ColorKey {
    if (type === "competition") {
      return "amber";
    }

    if (type === "training_camp") {
      return "blue";
    }

    if (type === "testing") {
      return "violet";
    }

    if (type === "meeting") {
      return "cyan";
    }

    return "slate";
  }

  function getEventColorKey(event: CalendarEvent): ColorKey {
    if (isColorKey(event.color)) {
      return event.color;
    }

    return getDefaultEventColor(event.event_type);
  }

  function getTaskColorKey(task: CalendarTask): ColorKey {
    if (isColorKey(task.color)) {
      return task.color;
    }

    if (task.completed) {
      return "slate";
    }

    if (task.due_date < today) {
      return "red";
    }

    return "emerald";
  }

  function goToPreviousMonth() {
    setSelectedCalendarDate(null);

    if (visibleMonth === 0) {
      setVisibleMonth(11);
      setVisibleYear((current) => current - 1);
      return;
    }

    setVisibleMonth((current) => current - 1);
  }

  function goToNextMonth() {
    setSelectedCalendarDate(null);

    if (visibleMonth === 11) {
      setVisibleMonth(0);
      setVisibleYear((current) => current + 1);
      return;
    }

    setVisibleMonth((current) => current + 1);
  }

  function goToCurrentMonth() {
    const current = new Date();

    setSelectedCalendarDate(null);
    setVisibleMonth(current.getMonth());
    setVisibleYear(current.getFullYear());
  }

  async function loadPlanning() {
    setLoading(true);
    setMessage("");

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setMessage("Coach konnte nicht geladen werden.");
      setLoading(false);
      return;
    }

    const { data: teamData, error: teamError } = await supabase
      .from("teams")
      .select("id, name")
      .eq("coach_id", user.id)
      .order("name");

    if (teamError) {
      setMessage(
        `Teams konnten nicht geladen werden: ${teamError.message}`
      );

      setLoading(false);
      return;
    }

    setTeams((teamData ?? []) as Team[]);

    /*
     * Termine kommen aus dem gemeinsamen Kalender
     * (calendar_entries) - dieselben wie unter "Kalender".
     * Hier werden sie ganztaegig als Zeitraum gezeigt.
     */
    const { data: entryData, error: eventError } = await supabase
      .from("calendar_entries")
      .select(
        "id, coach_id, team_id, title, category, starts_at, ends_at, location, description, color, created_at"
      )
      .eq("coach_id", user.id)
      .lte("starts_at", localToIso(queryEnd, "23:59"))
      .or(`ends_at.is.null,ends_at.gte.${localToIso(queryStart, "00:00")}`)
      .order("starts_at", {
        ascending: true,
      });

    const eventData = (
      (entryData ?? []) as {
        id: string;
        coach_id: string;
        team_id: string | null;
        title: string;
        category: EntryCategory;
        starts_at: string;
        ends_at: string | null;
        location: string | null;
        description: string | null;
        color: string | null;
        created_at: string;
      }[]
    ).map((entry) => ({
      id: entry.id,
      coach_id: entry.coach_id,
      team_id: entry.team_id,
      title: entry.title,
      event_type: categoryToSeasonType(entry.category),
      start_date: isoToLocalParts(entry.starts_at)[0],
      end_date: entry.ends_at ? isoToLocalParts(entry.ends_at)[0] : null,
      location: entry.location,
      description: entry.description,
      color: entry.color,
      created_at: entry.created_at,
    }));

    if (eventError) {
      setMessage(
        `Termine konnten nicht geladen werden: ${eventError.message}`
      );

      setLoading(false);
      return;
    }

    setEvents(eventData as CalendarEvent[]);

    const { data: taskData, error: taskError } = await supabase
      .from("calendar_tasks")
      .select(
        `
          id,
          coach_id,
          event_id,
          team_id,
          title,
          due_date,
          completed,
          description,
          color,
          created_at
        `
      )
      .eq("coach_id", user.id)
      .gte("due_date", queryStart)
      .lte("due_date", queryEnd)
      .order("due_date", {
        ascending: true,
      });

    if (taskError) {
      setMessage(
        `Fristen konnten nicht geladen werden: ${taskError.message}`
      );

      setLoading(false);
      return;
    }

    setTasks((taskData ?? []) as CalendarTask[]);
    setLoading(false);
  }

  /*
    FORMULARE
  */

  function resetEventForm() {
    setEditingEventId(null);
    setNewEventTitle("");
    setNewEventType("competition");
    setNewEventStartDate("");
    setNewEventEndDate("");
    setNewEventTeamId(selectedTeamId || "");
    setNewEventLocation("");
    setNewEventDescription("");
    setNewEventColor("amber");
  }

  function resetTaskForm() {
    setEditingTaskId(null);
    setNewTaskTitle("");
    setNewTaskDueDate("");
    setNewTaskEventId("");
    setNewTaskTeamId(selectedTeamId || "");
    setNewTaskDescription("");
    setNewTaskColor("emerald");
  }

  /*
    NEU:
    Klick auf Kalendertag.
  */

  function openCalendarDay(date: string) {
    setSelectedCalendarDate(date);
  }

  /*
    NEU:
    Termin direkt für angeklickten Tag anlegen.
  */

  function createEventForDate(date: string) {
    resetTaskForm();
    setShowTaskForm(false);

    resetEventForm();

    setNewEventStartDate(date);
    setNewEventEndDate("");
    setNewEventTeamId(selectedTeamId || "");

    setSelectedCalendarDate(null);
    setShowEventForm(true);

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  /*
    NEU:
    Aufgabe direkt für angeklickten Tag anlegen.
  */

  function createTaskForDate(date: string) {
    resetEventForm();
    setShowEventForm(false);

    resetTaskForm();

    setNewTaskDueDate(date);
    setNewTaskTeamId(selectedTeamId || "");

    setSelectedCalendarDate(null);
    setShowTaskForm(true);

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  function editEvent(event: CalendarEvent) {
    setSelectedCalendarDate(null);

    setShowTaskForm(false);
    setEditingTaskId(null);

    setEditingEventId(event.id);
    setNewEventTitle(event.title);
    setNewEventType(event.event_type);
    setNewEventStartDate(event.start_date);
    setNewEventEndDate(event.end_date ?? "");
    setNewEventTeamId(event.team_id ?? "");
    setNewEventLocation(event.location ?? "");
    setNewEventDescription(event.description ?? "");
    setNewEventColor(getEventColorKey(event));

    setShowEventForm(true);

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  function editTask(task: CalendarTask) {
    setSelectedCalendarDate(null);

    setShowEventForm(false);
    setEditingEventId(null);

    setEditingTaskId(task.id);
    setNewTaskTitle(task.title);
    setNewTaskDueDate(task.due_date);
    setNewTaskEventId(task.event_id ?? "");
    setNewTaskTeamId(task.team_id ?? "");
    setNewTaskDescription(task.description ?? "");
    setNewTaskColor(getTaskColorKey(task));

    setShowTaskForm(true);

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  async function saveEvent() {
    setMessage("");

    if (!newEventTitle.trim()) {
      setMessage("Bitte gib einen Titel ein.");
      return;
    }

    if (!newEventStartDate) {
      setMessage("Bitte wähle ein Startdatum.");
      return;
    }

    if (
      newEventEndDate &&
      newEventEndDate < newEventStartDate
    ) {
      setMessage(
        "Das Enddatum darf nicht vor dem Startdatum liegen."
      );

      return;
    }

    setSaving(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setMessage("Coach konnte nicht geladen werden.");
      setSaving(false);
      return;
    }

    /* Gespeichert wird im gemeinsamen Kalender, ganztaegig */
    const payload = {
      team_id: newEventTeamId || null,
      title: newEventTitle.trim(),
      category: seasonTypeToCategory(newEventType),
      starts_at: localToIso(newEventStartDate, "00:00"),
      ends_at: localToIso(newEventEndDate || newEventStartDate, "23:59"),
      all_day: true,
      location: newEventLocation.trim() || null,
      description: newEventDescription.trim() || null,
      color: newEventColor,
    };

    if (editingEventId) {
      const { error } = await supabase
        .from("calendar_entries")
        .update(payload)
        .eq("id", editingEventId)
        .eq("coach_id", user.id);

      if (error) {
        setMessage(
          `Termin konnte nicht aktualisiert werden: ${error.message}`
        );

        setSaving(false);
        return;
      }

      resetEventForm();
      setShowEventForm(false);

      await loadPlanning();

      setMessage("Termin aktualisiert ✅");
      setSaving(false);

      return;
    }

    /*
     * Neue Termine aus der Saisonplanung stehen zuerst im
     * Trainerkalender (wie bisher nur fuer Trainer sichtbar).
     * Unter "Kalender" laesst sich das pro Termin aendern.
     */
    const { error } = await supabase
      .from("calendar_entries")
      .insert({
        coach_id: user.id,
        visibility: "coach",
        ...payload,
      });

    if (error) {
      setMessage(
        `Termin konnte nicht gespeichert werden: ${error.message}`
      );

      setSaving(false);
      return;
    }

    resetEventForm();
    setShowEventForm(false);

    await loadPlanning();

    setMessage("Termin gespeichert ✅");
    setSaving(false);
  }

  async function saveTask() {
    setMessage("");

    if (!newTaskTitle.trim()) {
      setMessage("Bitte gib eine Aufgabe ein.");
      return;
    }

    if (!newTaskDueDate) {
      setMessage("Bitte wähle eine Frist.");
      return;
    }

    setSaving(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setMessage("Coach konnte nicht geladen werden.");
      setSaving(false);
      return;
    }

    const linkedEvent = newTaskEventId
      ? events.find((event) => event.id === newTaskEventId)
      : null;

    const payload = {
      event_id: newTaskEventId || null,

      team_id:
        newTaskTeamId ||
        linkedEvent?.team_id ||
        null,

      title: newTaskTitle.trim(),
      due_date: newTaskDueDate,
      description: newTaskDescription.trim() || null,
      color: newTaskColor,
    };

    if (editingTaskId) {
      const { error } = await supabase
        .from("calendar_tasks")
        .update(payload)
        .eq("id", editingTaskId)
        .eq("coach_id", user.id);

      if (error) {
        setMessage(
          `Aufgabe konnte nicht aktualisiert werden: ${error.message}`
        );

        setSaving(false);
        return;
      }

      resetTaskForm();
      setShowTaskForm(false);

      await loadPlanning();

      setMessage("Aufgabe aktualisiert ✅");
      setSaving(false);

      return;
    }

    const { error } = await supabase
      .from("calendar_tasks")
      .insert({
        coach_id: user.id,
        completed: false,
        ...payload,
      });

    if (error) {
      setMessage(
        `Aufgabe konnte nicht gespeichert werden: ${error.message}`
      );

      setSaving(false);
      return;
    }

    resetTaskForm();
    setShowTaskForm(false);

    await loadPlanning();

    setMessage("Aufgabe gespeichert ✅");
    setSaving(false);
  }

  async function deleteEvent(event: CalendarEvent) {
    const confirmed = window.confirm(
      `Termin "${event.title}" wirklich löschen?`
    );

    if (!confirmed) {
      return;
    }

    setMessage("");

    const { error: unlinkError } = await supabase
      .from("calendar_tasks")
      .update({
        event_id: null,
      })
      .eq("event_id", event.id);

    if (unlinkError) {
      setMessage(
        `Verknüpfte Aufgaben konnten nicht gelöst werden: ${unlinkError.message}`
      );

      return;
    }

    const { error } = await supabase
      .from("calendar_entries")
      .delete()
      .eq("id", event.id);

    if (error) {
      setMessage(
        `Termin konnte nicht gelöscht werden: ${error.message}`
      );

      return;
    }

    if (editingEventId === event.id) {
      resetEventForm();
      setShowEventForm(false);
    }

    await loadPlanning();

    setMessage("Termin gelöscht.");
  }

  async function deleteTask(task: CalendarTask) {
    const confirmed = window.confirm(
      `Aufgabe "${task.title}" wirklich löschen?`
    );

    if (!confirmed) {
      return;
    }

    const { error } = await supabase
      .from("calendar_tasks")
      .delete()
      .eq("id", task.id);

    if (error) {
      setMessage(
        `Aufgabe konnte nicht gelöscht werden: ${error.message}`
      );

      return;
    }

    if (editingTaskId === task.id) {
      resetTaskForm();
      setShowTaskForm(false);
    }

    await loadPlanning();

    setMessage("Aufgabe gelöscht.");
  }

  async function toggleTask(task: CalendarTask) {
    const { error } = await supabase
      .from("calendar_tasks")
      .update({
        completed: !task.completed,
      })
      .eq("id", task.id);

    if (error) {
      setMessage(
        `Aufgabe konnte nicht aktualisiert werden: ${error.message}`
      );

      return;
    }

    setTasks((current) =>
      current.map((item) =>
        item.id === task.id
          ? {
              ...item,
              completed: !item.completed,
            }
          : item
      )
    );
  }

  function getTeamName(teamId: string | null) {
    if (!teamId) {
      return "Alle / Allgemein";
    }

    return (
      teams.find((team) => team.id === teamId)?.name ??
      "Unbekanntes Team"
    );
  }

  function getEventTypeLabel(type: DatabaseEventType) {
    return (
      eventTypeOptions.find((option) => option.value === type)
        ?.label ?? "Sonstiges"
    );
  }

  /*
    SAISON-DATEN
  */

  const allSeasonEvents = useMemo(
    () =>
      events
        .filter(
          (event) =>
            event.start_date <= seasonEnd &&
            (event.end_date ?? event.start_date) >= seasonStart
        )
        .sort((a, b) =>
          a.start_date.localeCompare(b.start_date)
        ),
    [events, seasonStart, seasonEnd]
  );

  const seasonEvents = useMemo(
    () =>
      allSeasonEvents.filter((event) =>
        matchesTeamFilter(event.team_id)
      ),
    [allSeasonEvents, selectedTeamId]
  );

  const allSeasonTasks = useMemo(
    () =>
      tasks
        .filter(
          (task) =>
            task.due_date >= seasonStart &&
            task.due_date <= seasonEnd
        )
        .sort((a, b) =>
          a.due_date.localeCompare(b.due_date)
        ),
    [tasks, seasonStart, seasonEnd]
  );

  const seasonTasks = useMemo(
    () =>
      allSeasonTasks.filter((task) =>
        matchesTeamFilter(task.team_id)
      ),
    [allSeasonTasks, selectedTeamId]
  );

  const openTasks = seasonTasks.filter(
    (task) => !task.completed
  );

  const completedTasks = seasonTasks.filter(
    (task) => task.completed
  );

  const taskProgress =
    seasonTasks.length === 0
      ? 0
      : Math.round(
          (completedTasks.length / seasonTasks.length) * 100
        );

  /*
    MONATS-DATEN
  */

  const visibleMonthEvents = events.filter((event) => {
    const end = event.end_date ?? event.start_date;

    const isInMonth =
      event.start_date <= visibleMonthEnd &&
      end >= visibleMonthStart;

    return isInMonth && matchesTeamFilter(event.team_id);
  });

  const visibleMonthTasks = tasks.filter((task) => {
    const isInMonth =
      task.due_date >= visibleMonthStart &&
      task.due_date <= visibleMonthEnd;

    return isInMonth && matchesTeamFilter(task.team_id);
  });

  const calendarCells = useMemo<CalendarCell[]>(() => {
    const days = getDaysInMonth(
      visibleYear,
      visibleMonth
    );

    const offset = getMondayBasedOffset(
      visibleYear,
      visibleMonth
    );

    const cells: CalendarCell[] = [];

    for (let index = 0; index < offset; index += 1) {
      cells.push({
        day: null,
        dateString: null,
      });
    }

    for (let day = 1; day <= days; day += 1) {
      const date = new Date(
        visibleYear,
        visibleMonth,
        day,
        12
      );

      cells.push({
        day,
        dateString: getLocalDateString(date),
      });
    }

    while (cells.length % 7 !== 0) {
      cells.push({
        day: null,
        dateString: null,
      });
    }

    return cells;
  }, [visibleYear, visibleMonth]);

  /*
    ZEITSTRAHL
  */

  const seasonStartDate = parseDate(seasonStart);
  const seasonEndDate = parseDate(seasonEnd);

  const oneDayMs = 24 * 60 * 60 * 1000;

  const seasonDuration =
    seasonEndDate.getTime() -
    seasonStartDate.getTime() +
    oneDayMs;

  function getPosition(date: string) {
    const target = parseDate(date);

    const difference =
      target.getTime() -
      seasonStartDate.getTime();

    return (
      ((difference + oneDayMs / 2) / seasonDuration) * 100
    );
  }

  function getRangeStart(date: string) {
    const target = parseDate(date);

    return (
      ((target.getTime() - seasonStartDate.getTime()) /
        seasonDuration) *
      100
    );
  }

  function getRangeEnd(date: string) {
    const target = parseDate(date);

    return (
      ((target.getTime() -
        seasonStartDate.getTime() +
        oneDayMs) /
        seasonDuration) *
      100
    );
  }

  const todayIsInSeason =
    today >= seasonStart &&
    today <= seasonEnd;

  const todayPosition = todayIsInSeason
    ? getPosition(today)
    : null;

  const positionedEvents = useMemo<PositionedEvent[]>(() => {
    const lanes: {
      start: number;
      end: number;
    }[][] = [];

    const CARD_WIDTH = 13;
    const GAP = 1.5;

    return seasonEvents.map((event) => {
      const single = isSingleDayEvent(event);

      let visualStart = 0;
      let visualEnd = 0;

      if (single) {
        const position = getPosition(event.start_date);

        visualStart = position - CARD_WIDTH / 2;
        visualEnd = position + CARD_WIDTH / 2;
      } else {
        const start = getRangeStart(event.start_date);

        const end = getRangeEnd(
          event.end_date ?? event.start_date
        );

        const center = (start + end) / 2;

        visualStart = Math.min(
          start,
          center - CARD_WIDTH / 2
        );

        visualEnd = Math.max(
          end,
          center + CARD_WIDTH / 2
        );
      }

      let lane = 0;

      while (true) {
        if (!lanes[lane]) {
          lanes[lane] = [];
        }

        const collision = lanes[lane].some(
          (range) =>
            visualStart <= range.end + GAP &&
            visualEnd >= range.start - GAP
        );

        if (!collision) {
          lanes[lane].push({
            start: visualStart,
            end: visualEnd,
          });

          break;
        }

        lane += 1;
      }

      return {
        event,
        lane,
      };
    });
  }, [seasonEvents, seasonStartYear]);

  const eventLaneCount =
    positionedEvents.length === 0
      ? 1
      : Math.max(
          ...positionedEvents.map((item) => item.lane)
        ) + 1;

  const positionedTasks = useMemo<PositionedTask[]>(() => {
    const lanes: {
      start: number;
      end: number;
    }[][] = [];

    const CARD_WIDTH = 10;
    const GAP = 1.8;

    return seasonTasks.map((task) => {
      const position = getPosition(task.due_date);

      const visualStart = position - CARD_WIDTH / 2;
      const visualEnd = position + CARD_WIDTH / 2;

      let lane = 0;

      while (true) {
        if (!lanes[lane]) {
          lanes[lane] = [];
        }

        const collision = lanes[lane].some(
          (range) =>
            visualStart <= range.end + GAP &&
            visualEnd >= range.start - GAP
        );

        if (!collision) {
          lanes[lane].push({
            start: visualStart,
            end: visualEnd,
          });

          break;
        }

        lane += 1;
      }

      return {
        task,
        lane,
      };
    });
  }, [seasonTasks, seasonStartYear]);

  const taskLaneCount =
    positionedTasks.length === 0
      ? 1
      : Math.max(
          ...positionedTasks.map((item) => item.lane)
        ) + 1;

  const upcomingEvents = seasonEvents
    .filter(
      (event) =>
        (event.end_date ?? event.start_date) >= today
    )
    .slice(0, 6);

  const selectedTeamName = selectedTeamId
    ? teams.find((team) => team.id === selectedTeamId)?.name ??
      "Team"
    : "Alle Teams";

  return (
    <div className="mx-auto w-full max-w-[1800px]">
      {/* KOPF */}

      <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="text-sm text-app-muted">
            Organisation & Saisonplanung
          </p>

          <h1 className="mt-1 text-3xl font-bold">
            Jahresplanung
          </h1>

          <p className="mt-2 text-app-muted">
            Wettkämpfe, Fristen und wichtige Saisontermine.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* TEAM-FILTER */}

          <div className="flex items-center gap-3 rounded-xl border border-app-border bg-app-surface px-3 py-2">
            <div>
              <p className="text-[10px] uppercase tracking-wide text-app-faint">
                Ansicht
              </p>

              <select
                value={selectedTeamId}
                onChange={(event) => {
                  setSelectedTeamId(event.target.value);
                  setSelectedCalendarDate(null);
                }}
                className="mt-0.5 min-w-36 bg-transparent text-sm font-semibold text-app-heading outline-none"
              >
                <option
                  value=""
                  className="bg-app-surface"
                >
                  Alle Teams
                </option>

                {teams.map((team) => (
                  <option
                    key={team.id}
                    value={team.id}
                    className="bg-app-surface"
                  >
                    {team.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* SAISON */}

          <div className="flex items-center gap-2 rounded-xl border border-app-border bg-app-surface px-3 py-2">
            <button
              type="button"
              onClick={() =>
                setSeasonStartYear(
                  (current) => current - 1
                )
              }
              className="rounded-lg px-2 py-1 hover:bg-app-elevated"
            >
              ←
            </button>

            <div className="px-3 text-center">
              <p className="text-[10px] uppercase text-app-faint">
                Saison
              </p>

              <p className="font-semibold">
                {seasonStartYear} /{" "}
                {seasonStartYear + 1}
              </p>
            </div>

            <button
              type="button"
              onClick={() =>
                setSeasonStartYear(
                  (current) => current + 1
                )
              }
              className="rounded-lg px-2 py-1 hover:bg-app-elevated"
            >
              →
            </button>
          </div>

          {/* NEUER TERMIN */}

          <button
            type="button"
            onClick={() => {
              setSelectedCalendarDate(null);
              setShowTaskForm(false);
              setEditingTaskId(null);

              resetEventForm();

              setShowEventForm(true);
            }}
            className="rounded-xl border border-app-border px-4 py-3 text-sm hover:bg-app-elevated"
          >
            + Termin
          </button>

          {/* NEUE AUFGABE */}

          <button
            type="button"
            onClick={() => {
              setSelectedCalendarDate(null);
              setShowEventForm(false);
              setEditingEventId(null);

              resetTaskForm();

              setShowTaskForm(true);
            }}
            className="rounded-xl bg-app-accent px-4 py-3 text-sm font-medium text-app-accent-ink"
          >
            + Aufgabe / Frist
          </button>
        </div>
      </div>

      <div className="mt-4 flex items-center gap-2 text-xs text-app-faint">
        <span>
          Angezeigt:
        </span>

        <span className="rounded-full border border-app-border bg-app-surface px-3 py-1 font-medium text-app-text">
          {selectedTeamName}
        </span>

        {selectedTeamId && (
          <span>
            + allgemeine Termine
          </span>
        )}
      </div>

      {message && (
        <div className="mt-6 rounded-xl border border-app-border bg-app-surface p-4 text-sm">
          {message}
        </div>
      )}

      {/* TERMIN FORMULAR */}

      {showEventForm && (
        <section className="mt-6 rounded-[20px] border border-app-border bg-app-surface shadow-app">
          <div className="flex items-start justify-between border-b border-app-border p-5">
            <div>
              <p className="text-sm text-app-muted">
                {editingEventId
                  ? "Bestehender Termin"
                  : "Neuer Termin"}
              </p>

              <h2 className="mt-1 text-xl font-semibold">
                {editingEventId
                  ? "Termin bearbeiten"
                  : "Termin anlegen"}
              </h2>
            </div>

            {editingEventId && (
              <span className="rounded-full border border-app-accent/40 bg-app-accent/10 px-3 py-1 text-xs text-app-accent">
                Bearbeiten
              </span>
            )}
          </div>

          <div className="grid gap-5 p-5 md:grid-cols-2 xl:grid-cols-4">
            <div className="xl:col-span-2">
              <label className="mb-2 block text-sm text-app-muted">
                Titel
              </label>

              <input
                value={newEventTitle}
                onChange={(event) =>
                  setNewEventTitle(event.target.value)
                }
                placeholder="z. B. Deutsche Meisterschaft"
                className="w-full rounded-xl border border-app-border bg-app-bg px-4 py-3 outline-none"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm text-app-muted">
                Art
              </label>

              <select
                value={newEventType}
                onChange={(event) => {
                  const nextType =
                    event.target.value as DatabaseEventType;

                  setNewEventType(nextType);

                  if (!editingEventId) {
                    setNewEventColor(
                      getDefaultEventColor(nextType)
                    );
                  }
                }}
                className="w-full rounded-xl border border-app-border bg-app-bg px-4 py-3"
              >
                {eventTypeOptions.map((option) => (
                  <option
                    key={option.value}
                    value={option.value}
                  >
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm text-app-muted">
                Team
              </label>

              <select
                value={newEventTeamId}
                onChange={(event) =>
                  setNewEventTeamId(event.target.value)
                }
                className="w-full rounded-xl border border-app-border bg-app-bg px-4 py-3"
              >
                <option value="">
                  Alle / Allgemein
                </option>

                {teams.map((team) => (
                  <option
                    key={team.id}
                    value={team.id}
                  >
                    {team.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm text-app-muted">
                Start
              </label>

              <input
                type="date"
                value={newEventStartDate}
                onChange={(event) =>
                  setNewEventStartDate(event.target.value)
                }
                className="w-full rounded-xl border border-app-border bg-app-bg px-4 py-3"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm text-app-muted">
                Ende
              </label>

              <input
                type="date"
                value={newEventEndDate}
                onChange={(event) =>
                  setNewEventEndDate(event.target.value)
                }
                className="w-full rounded-xl border border-app-border bg-app-bg px-4 py-3"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm text-app-muted">
                Farbe
              </label>

              <select
                value={newEventColor}
                onChange={(event) =>
                  setNewEventColor(
                    event.target.value as ColorKey
                  )
                }
                className="w-full rounded-xl border border-app-border bg-app-bg px-4 py-3"
              >
                {colorOptions.map((option) => (
                  <option
                    key={option.value}
                    value={option.value}
                  >
                    {option.label}
                  </option>
                ))}
              </select>

              <div className="mt-2 flex items-center gap-2">
                <span
                  className={`h-4 w-4 rounded-full ${
                    colorStyles[newEventColor].dot
                  }`}
                />

                <span className="text-xs text-app-faint">
                  Vorschau
                </span>
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm text-app-muted">
                Ort
              </label>

              <input
                value={newEventLocation}
                onChange={(event) =>
                  setNewEventLocation(event.target.value)
                }
                className="w-full rounded-xl border border-app-border bg-app-bg px-4 py-3"
              />
            </div>

            <div className="md:col-span-2 xl:col-span-4">
              <label className="mb-2 block text-sm text-app-muted">
                Notiz
              </label>

              <textarea
                rows={3}
                value={newEventDescription}
                onChange={(event) =>
                  setNewEventDescription(
                    event.target.value
                  )
                }
                className="w-full rounded-xl border border-app-border bg-app-bg px-4 py-3"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-app-border p-5">
            <div>
              {editingEventId && (
                <button
                  type="button"
                  onClick={() => {
                    const event = events.find(
                      (item) =>
                        item.id === editingEventId
                    );

                    if (event) {
                      deleteEvent(event);
                    }
                  }}
                  className="rounded-xl border border-app-bad/40 px-4 py-3 text-sm text-app-bad hover:bg-app-bad/10"
                >
                  Löschen
                </button>
              )}
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => {
                  resetEventForm();
                  setShowEventForm(false);
                }}
                className="rounded-xl border border-app-border px-4 py-3"
              >
                Abbrechen
              </button>

              <button
                type="button"
                disabled={saving}
                onClick={saveEvent}
                className="rounded-xl bg-app-accent px-4 py-3 font-medium text-app-accent-ink disabled:opacity-50"
              >
                {saving
                  ? "Speichert..."
                  : editingEventId
                  ? "Änderungen speichern"
                  : "Termin speichern"}
              </button>
            </div>
          </div>
        </section>
      )}

      {/* AUFGABEN FORMULAR */}

      {showTaskForm && (
        <section className="mt-6 rounded-[20px] border border-app-border bg-app-surface shadow-app">
          <div className="flex items-start justify-between border-b border-app-border p-5">
            <div>
              <p className="text-sm text-app-muted">
                {editingTaskId
                  ? "Bestehende Aufgabe"
                  : "Neue Aufgabe"}
              </p>

              <h2 className="mt-1 text-xl font-semibold">
                {editingTaskId
                  ? "Aufgabe / Frist bearbeiten"
                  : "Aufgabe / Frist anlegen"}
              </h2>
            </div>

            {editingTaskId && (
              <span className="rounded-full border border-app-accent/40 bg-app-accent/10 px-3 py-1 text-xs text-app-accent">
                Bearbeiten
              </span>
            )}
          </div>

          <div className="grid gap-5 p-5 md:grid-cols-2 xl:grid-cols-4">
            <div className="xl:col-span-2">
              <label className="mb-2 block text-sm text-app-muted">
                Aufgabe
              </label>

              <input
                value={newTaskTitle}
                onChange={(event) =>
                  setNewTaskTitle(event.target.value)
                }
                className="w-full rounded-xl border border-app-border bg-app-bg px-4 py-3"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm text-app-muted">
                Fällig
              </label>

              <input
                type="date"
                value={newTaskDueDate}
                onChange={(event) =>
                  setNewTaskDueDate(event.target.value)
                }
                className="w-full rounded-xl border border-app-border bg-app-bg px-4 py-3"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm text-app-muted">
                Team
              </label>

              <select
                value={newTaskTeamId}
                onChange={(event) =>
                  setNewTaskTeamId(event.target.value)
                }
                className="w-full rounded-xl border border-app-border bg-app-bg px-4 py-3"
              >
                <option value="">
                  Alle / Allgemein
                </option>

                {teams.map((team) => (
                  <option
                    key={team.id}
                    value={team.id}
                  >
                    {team.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm text-app-muted">
                Farbe
              </label>

              <select
                value={newTaskColor}
                onChange={(event) =>
                  setNewTaskColor(
                    event.target.value as ColorKey
                  )
                }
                className="w-full rounded-xl border border-app-border bg-app-bg px-4 py-3"
              >
                {colorOptions.map((option) => (
                  <option
                    key={option.value}
                    value={option.value}
                  >
                    {option.label}
                  </option>
                ))}
              </select>

              <div className="mt-2 flex items-center gap-2">
                <span
                  className={`h-4 w-4 rounded-full ${
                    colorStyles[newTaskColor].dot
                  }`}
                />

                <span className="text-xs text-app-faint">
                  Vorschau
                </span>
              </div>
            </div>

            <div className="md:col-span-2">
              <label className="mb-2 block text-sm text-app-muted">
                Gehört zu
              </label>

              <select
                value={newTaskEventId}
                onChange={(event) =>
                  setNewTaskEventId(event.target.value)
                }
                className="w-full rounded-xl border border-app-border bg-app-bg px-4 py-3"
              >
                <option value="">
                  Kein Termin
                </option>

                {allSeasonEvents.map((event) => (
                  <option
                    key={event.id}
                    value={event.id}
                  >
                    {formatDate(event.start_date)} –{" "}
                    {event.title}
                  </option>
                ))}
              </select>
            </div>

            <div className="md:col-span-2 xl:col-span-4">
              <label className="mb-2 block text-sm text-app-muted">
                Notiz
              </label>

              <textarea
                rows={3}
                value={newTaskDescription}
                onChange={(event) =>
                  setNewTaskDescription(
                    event.target.value
                  )
                }
                className="w-full rounded-xl border border-app-border bg-app-bg px-4 py-3"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-app-border p-5">
            <div>
              {editingTaskId && (
                <button
                  type="button"
                  onClick={() => {
                    const task = tasks.find(
                      (item) =>
                        item.id === editingTaskId
                    );

                    if (task) {
                      deleteTask(task);
                    }
                  }}
                  className="rounded-xl border border-app-bad/40 px-4 py-3 text-sm text-app-bad hover:bg-app-bad/10"
                >
                  Löschen
                </button>
              )}
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => {
                  resetTaskForm();
                  setShowTaskForm(false);
                }}
                className="rounded-xl border border-app-border px-4 py-3"
              >
                Abbrechen
              </button>

              <button
                type="button"
                disabled={saving}
                onClick={saveTask}
                className="rounded-xl bg-app-accent px-4 py-3 font-medium text-app-accent-ink disabled:opacity-50"
              >
                {saving
                  ? "Speichert..."
                  : editingTaskId
                  ? "Änderungen speichern"
                  : "Aufgabe speichern"}
              </button>
            </div>
          </div>
        </section>
      )}

      {loading ? (
        <div className="mt-6 rounded-[20px] border border-app-border bg-app-surface shadow-app p-10 text-center text-app-muted">
          Wird geladen...
        </div>
      ) : (
        <>
          {/* MONAT + TO-DOS */}

          <section className="mt-6 grid gap-6 xl:grid-cols-[1.6fr_0.7fr]">
            {/* MONAT */}

            <div className="rounded-[20px] border border-app-border bg-app-surface shadow-app">
              <div className="flex flex-col gap-4 border-b border-app-border p-5 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm text-app-muted">
                    Monatsübersicht
                  </p>

                  <h2 className="mt-1 text-2xl font-semibold capitalize">
                    {visibleMonthName}
                  </h2>

                  <p className="mt-1 text-xs text-app-faint">
                    {visibleMonthEvents.length} Termine ·{" "}
                    {visibleMonthTasks.length} Fristen
                  </p>

                  <p className="mt-1 text-[10px] text-app-faint">
                    Tipp: Klicke auf einen Tag, um direkt etwas anzulegen.
                  </p>
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={goToPreviousMonth}
                    className="rounded-xl border border-app-border px-3 py-2 hover:bg-app-elevated"
                  >
                    ←
                  </button>

                  <button
                    type="button"
                    onClick={goToCurrentMonth}
                    className="rounded-xl border border-app-border px-4 py-2 text-sm hover:bg-app-elevated"
                  >
                    Heute
                  </button>

                  <button
                    type="button"
                    onClick={goToNextMonth}
                    className="rounded-xl border border-app-border px-3 py-2 hover:bg-app-elevated"
                  >
                    →
                  </button>
                </div>
              </div>

              <div className="p-5">
                <div className="grid grid-cols-7 gap-2 text-center text-xs text-app-faint">
                  <div>Mo</div>
                  <div>Di</div>
                  <div>Mi</div>
                  <div>Do</div>
                  <div>Fr</div>
                  <div>Sa</div>
                  <div>So</div>
                </div>

                <div className="mt-2 grid grid-cols-7 gap-2">
                  {calendarCells.map((cell, index) => {
                    if (!cell.day || !cell.dateString) {
                      return (
                        <div
                          key={`empty-${index}`}
                          className="min-h-24"
                        />
                      );
                    }

                    const dayEvents =
                      visibleMonthEvents.filter(
                        (event) =>
                          cell.dateString! >=
                            event.start_date &&
                          cell.dateString! <=
                            (event.end_date ??
                              event.start_date)
                      );

                    const dayTasks =
                      visibleMonthTasks.filter(
                        (task) =>
                          task.due_date ===
                          cell.dateString
                      );

                    const isSelected =
                      selectedCalendarDate ===
                      cell.dateString;

                    return (
                      <div
                        key={cell.dateString}
                        className={`relative min-h-28 rounded-lg border p-2 transition ${
                          cell.dateString === today
                            ? "border-app-heading bg-app-elevated"
                            : isSelected
                            ? "border-app-accent bg-app-elevated"
                            : "border-app-border bg-app-bg hover:border-app-border"
                        }`}
                      >
                        {/* Klickbarer Hintergrund */}

                        <button
                          type="button"
                          onClick={() =>
                            openCalendarDay(
                              cell.dateString!
                            )
                          }
                          className="absolute inset-0 z-0 rounded-lg"
                          aria-label={`Eintrag am ${formatDate(
                            cell.dateString
                          )} anlegen`}
                        />

                        <div className="relative z-10 pointer-events-none">
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-semibold text-app-muted">
                              {cell.day}
                            </p>

                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();

                                openCalendarDay(
                                  cell.dateString!
                                );
                              }}
                              className="pointer-events-auto flex h-5 w-5 items-center justify-center rounded-md text-xs text-app-faint hover:bg-app-elevated hover:text-app-heading"
                              title="Eintrag hinzufügen"
                            >
                              +
                            </button>
                          </div>

                          <div className="mt-1 space-y-1">
                            {dayEvents
                              .slice(0, 3)
                              .map((event) => {
                                const color =
                                  getEventColorKey(event);

                                return (
                                  <button
                                    key={event.id}
                                    type="button"
                                    onClick={(clickEvent) => {
                                      clickEvent.stopPropagation();

                                      editEvent(event);
                                    }}
                                    className={`pointer-events-auto block w-full truncate rounded px-1.5 py-1 text-left text-[10px] transition hover:ring-2 hover:ring-app-heading/40 ${
                                      colorStyles[color]
                                        .card
                                    }`}
                                  >
                                    {event.title}
                                  </button>
                                );
                              })}

                            {dayTasks
                              .slice(0, 3)
                              .map((task) => {
                                const color =
                                  getTaskColorKey(task);

                                return (
                                  <button
                                    key={task.id}
                                    type="button"
                                    onClick={(clickEvent) => {
                                      clickEvent.stopPropagation();

                                      editTask(task);
                                    }}
                                    className={`pointer-events-auto block w-full truncate rounded px-1.5 py-1 text-left text-[10px] transition hover:ring-2 hover:ring-app-heading/40 ${
                                      colorStyles[color]
                                        .card
                                    } ${
                                      task.completed
                                        ? "opacity-60 line-through"
                                        : ""
                                    }`}
                                  >
                                    {task.title}
                                  </button>
                                );
                              })}
                          </div>

                          {/* AUSWAHLFENSTER IM TAG */}

                          {isSelected && (
                            <div className="pointer-events-auto relative z-30 mt-3 rounded-lg border border-app-border bg-app-surface p-2 shadow-xl">
                              <p className="px-1 pb-2 text-[10px] font-semibold text-app-muted">
                                {formatDate(
                                  cell.dateString
                                )}
                              </p>

                              <div className="space-y-1">
                                <button
                                  type="button"
                                  onClick={(event) => {
                                    event.stopPropagation();

                                    createEventForDate(
                                      cell.dateString!
                                    );
                                  }}
                                  className="block w-full rounded-md bg-app-accent px-2 py-2 text-left text-[10px] font-semibold text-app-accent-ink hover:brightness-110"
                                >
                                  Termin anlegen
                                </button>

                                <button
                                  type="button"
                                  onClick={(event) => {
                                    event.stopPropagation();

                                    createTaskForDate(
                                      cell.dateString!
                                    );
                                  }}
                                  className="block w-full rounded-md border border-app-border px-2 py-2 text-left text-[10px] font-semibold text-app-heading hover:bg-app-elevated"
                                >
                                  Aufgabe / Frist
                                </button>

                                <button
                                  type="button"
                                  onClick={(event) => {
                                    event.stopPropagation();

                                    setSelectedCalendarDate(
                                      null
                                    );
                                  }}
                                  className="block w-full rounded-md px-2 py-1.5 text-left text-[9px] text-app-faint hover:text-app-heading"
                                >
                                  Schließen
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* FRISTEN & TO-DOS */}

            <div className="rounded-[20px] border border-app-border bg-app-surface shadow-app">
              <div className="border-b border-app-border p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm text-app-muted">
                      Organisation
                    </p>

                    <h2 className="mt-1 text-xl font-semibold">
                      Fristen & To-dos
                    </h2>
                  </div>

                  <span className="rounded-full bg-app-bg px-3 py-1 text-xs">
                    {completedTasks.length}/
                    {seasonTasks.length}
                  </span>
                </div>

                <div className="mt-4 h-2 overflow-hidden rounded-full bg-app-elevated">
                  <div
                    className="h-full rounded-full bg-app-accent"
                    style={{
                      width: `${taskProgress}%`,
                    }}
                  />
                </div>
              </div>

              <div className="space-y-3 p-5">
                {openTasks.length === 0 ? (
                  <div className="rounded-xl border border-app-border bg-app-bg p-5 text-center text-sm text-app-faint">
                    Keine offenen Aufgaben für diese Ansicht.
                  </div>
                ) : (
                  openTasks.slice(0, 10).map((task) => {
                    const color = getTaskColorKey(task);

                    return (
                      <div
                        key={task.id}
                        className={`rounded-xl border p-3 ${
                          colorStyles[color].soft
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <button
                            type="button"
                            onClick={() => toggleTask(task)}
                            className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-current"
                            title="Als erledigt markieren"
                          >
                            ✓
                          </button>

                          <div className="min-w-0 flex-1">
                            <p className="font-semibold">
                              {task.title}
                            </p>

                            <p className="mt-1 text-xs opacity-70">
                              Fällig:{" "}
                              {formatDate(task.due_date)}
                            </p>

                            <p className="mt-1 text-[10px] opacity-60">
                              {getTeamName(task.team_id)}
                            </p>

                            {task.due_date < today && (
                              <p className="mt-1 text-xs font-semibold text-app-bad">
                                Überfällig
                              </p>
                            )}
                          </div>

                          <div className="flex shrink-0 gap-1">
                            <button
                              type="button"
                              onClick={() =>
                                editTask(task)
                              }
                              className="rounded-lg border border-current px-2 py-1 text-[10px] opacity-70 hover:opacity-100"
                            >
                              Bearbeiten
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                deleteTask(task)
                              }
                              className="rounded-lg border border-app-bad/40 px-2 py-1 text-[10px] text-app-bad hover:bg-app-bad/10"
                            >
                              Löschen
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}

                {/* ERLEDIGTE */}

                <div className="border-t border-app-border pt-4">
                  <button
                    type="button"
                    onClick={() =>
                      setShowCompletedTasks(
                        (current) => !current
                      )
                    }
                    className="flex w-full items-center justify-between rounded-xl px-3 py-3 text-left text-sm text-app-muted hover:bg-app-elevated hover:text-app-heading"
                  >
                    <span>
                      Erledigte Aufgaben{" "}
                      <span className="text-app-faint">
                        ({completedTasks.length})
                      </span>
                    </span>

                    <span>
                      {showCompletedTasks ? "▲" : "▼"}
                    </span>
                  </button>

                  {showCompletedTasks && (
                    <div className="mt-3 space-y-2">
                      {completedTasks.length === 0 ? (
                        <p className="px-3 py-4 text-sm text-app-faint">
                          Noch keine erledigten Aufgaben.
                        </p>
                      ) : (
                        completedTasks.map((task) => {
                          const color =
                            getTaskColorKey(task);

                          return (
                            <div
                              key={task.id}
                              className={`rounded-xl border p-3 opacity-70 ${
                                colorStyles[color].soft
                              }`}
                            >
                              <div className="flex items-start gap-3">
                                <button
                                  type="button"
                                  onClick={() =>
                                    toggleTask(task)
                                  }
                                  className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-current bg-app-accent/10"
                                  title="Wieder als offen markieren"
                                >
                                  ↺
                                </button>

                                <div className="min-w-0 flex-1">
                                  <p className="font-medium line-through">
                                    {task.title}
                                  </p>

                                  <p className="mt-1 text-xs opacity-70">
                                    Ursprünglich fällig:{" "}
                                    {formatDate(
                                      task.due_date
                                    )}
                                  </p>

                                  <p className="mt-1 text-[10px] opacity-60">
                                    {getTeamName(
                                      task.team_id
                                    )}
                                  </p>
                                </div>

                                <div className="flex shrink-0 gap-1">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      editTask(task)
                                    }
                                    className="rounded-lg border border-current px-2 py-1 text-[10px]"
                                  >
                                    Bearbeiten
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() =>
                                      deleteTask(task)
                                    }
                                    className="rounded-lg border border-app-bad/40 px-2 py-1 text-[10px] text-app-bad"
                                  >
                                    Löschen
                                  </button>
                                </div>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </section>

          {/* JAHRESZEITSTRAHL */}

          <section className="mt-6 rounded-[20px] border border-app-border bg-app-surface shadow-app">
            <div className="flex flex-col gap-4 border-b border-app-border p-5 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-sm text-app-muted">
                  Saisonübersicht
                </p>

                <h2 className="mt-1 text-2xl font-semibold">
                  Jahreszeitstrahl
                </h2>

                <p className="mt-1 text-sm text-app-faint">
                  August {seasonStartYear} bis Juli{" "}
                  {seasonStartYear + 1} ·{" "}
                  {selectedTeamName}
                </p>
              </div>

              <div className="flex flex-wrap gap-5 text-xs text-app-muted">
                <span className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full bg-app-warn" />
                  1 Tag
                </span>

                <span className="flex items-center gap-2">
                  <span className="h-3 w-9 rounded-full bg-app-accent" />
                  Zeitraum
                </span>

                <span className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full bg-app-good" />
                  Frist
                </span>

                {todayIsInSeason && (
                  <span className="flex items-center gap-2">
                    <span className="h-4 w-0.5 bg-app-accent" />
                    Heute
                  </span>
                )}
              </div>
            </div>

            <div className="overflow-x-auto p-5">
              <div className="min-w-[1500px] overflow-hidden rounded-xl border border-app-border bg-app-bg">
                {/* MONATE */}

                <div className="relative grid grid-cols-12 border-b border-app-border">
                  {months.map((month) => (
                    <div
                      key={`${month.year}-${month.month}`}
                      className="border-r border-app-border py-4 text-center text-sm font-semibold last:border-r-0"
                    >
                      {month.label}
                    </div>
                  ))}

                  {todayPosition !== null && (
                    <div
                      className="pointer-events-none absolute bottom-0 top-0 z-20 w-px bg-app-accent/80"
                      style={{
                        left: `${todayPosition}%`,
                      }}
                    />
                  )}
                </div>

                {/* TERMINE */}

                <div className="border-b border-app-border">
                  <div className="border-b border-app-border px-4 py-3 text-xs uppercase tracking-wide text-app-faint">
                    Saisontermine
                  </div>

                  <div
                    className="relative"
                    style={{
                      height: `${
                        eventLaneCount * 110 + 35
                      }px`,
                    }}
                  >
                    <div className="pointer-events-none absolute inset-0 grid grid-cols-12">
                      {months.map((month) => (
                        <div
                          key={`${month.year}-${month.month}`}
                          className="border-r border-app-border last:border-r-0"
                        />
                      ))}
                    </div>

                    {todayPosition !== null && (
                      <div
                        className="pointer-events-none absolute bottom-0 top-0 z-20 w-px bg-app-accent/10"
                        style={{
                          left: `${todayPosition}%`,
                        }}
                      >
                        <div className="absolute -left-7 -top-1 rounded-full bg-app-accent px-2 py-1 text-[9px] font-bold text-app-accent-ink">
                          HEUTE
                        </div>
                      </div>
                    )}

                    {positionedEvents.map(
                      ({ event, lane }) => {
                        const color =
                          getEventColorKey(event);

                        const single =
                          isSingleDayEvent(event);

                        const laneTop =
                          18 + lane * 110;

                        if (single) {
                          const position =
                            getPosition(
                              event.start_date
                            );

                          return (
                            <div
                              key={event.id}
                              className="absolute z-30"
                              style={{
                                left: `${position}%`,
                                top: `${laneTop}px`,
                              }}
                            >
                              <button
                                type="button"
                                onClick={() =>
                                  editEvent(event)
                                }
                                className={`absolute left-0 top-0 h-4 w-4 -translate-x-1/2 rounded-full ring-4 ring-app-accent-ink transition hover:scale-125 ${
                                  colorStyles[color]
                                    .dot
                                }`}
                              />

                              <div className="absolute left-0 top-4 h-4 w-px bg-app-elevated" />

                              <div
                                className="absolute top-8 w-48"
                                style={{
                                  left:
                                    position < 7
                                      ? "8px"
                                      : position > 93
                                      ? "auto"
                                      : "50%",

                                  right:
                                    position > 93
                                      ? "8px"
                                      : "auto",

                                  transform:
                                    position >= 7 &&
                                    position <= 93
                                      ? "translateX(-50%)"
                                      : "none",
                                }}
                              >
                                <button
                                  type="button"
                                  onClick={() =>
                                    editEvent(event)
                                  }
                                  className={`w-full rounded-lg border px-3 py-2 text-left transition hover:ring-2 hover:ring-app-heading/40 ${
                                    colorStyles[color]
                                      .card
                                  }`}
                                >
                                  <p className="text-[10px] font-semibold opacity-80">
                                    {formatShortDate(
                                      event.start_date
                                    )}
                                  </p>

                                  <p className="mt-1 text-xs font-bold">
                                    {event.title}
                                  </p>

                                  <p className="mt-1 truncate text-[9px] opacity-70">
                                    {getTeamName(
                                      event.team_id
                                    )}
                                  </p>
                                </button>
                              </div>
                            </div>
                          );
                        }

                        const start =
                          getRangeStart(
                            event.start_date
                          );

                        const end =
                          getRangeEnd(
                            event.end_date ??
                              event.start_date
                          );

                        const width = end - start;

                        return (
                          <div
                            key={event.id}
                            className="absolute z-30"
                            style={{
                              left: `${start}%`,
                              width: `${width}%`,
                              top: `${laneTop + 4}px`,
                            }}
                          >
                            <button
                              type="button"
                              onClick={() =>
                                editEvent(event)
                              }
                              className={`block h-3 w-full rounded-full transition hover:ring-2 hover:ring-app-heading/50 ${
                                colorStyles[color]
                                  .dot
                              }`}
                            />

                            <div className="mt-2 flex min-w-[95px] justify-between text-[9px] text-app-muted">
                              <span>
                                {formatShortDate(
                                  event.start_date
                                )}
                              </span>

                              <span>
                                {formatShortDate(
                                  event.end_date
                                )}
                              </span>
                            </div>

                            <div
                              className="absolute top-8 w-48"
                              style={{
                                left: "50%",
                                transform:
                                  "translateX(-50%)",
                              }}
                            >
                              <button
                                type="button"
                                onClick={() =>
                                  editEvent(event)
                                }
                                className="w-full rounded-lg border border-app-border bg-app-surface px-3 py-2 text-left transition hover:border-app-border"
                              >
                                <div className="flex items-center gap-2">
                                  <span
                                    className={`h-3 w-3 shrink-0 rounded-full ${
                                      colorStyles[
                                        color
                                      ].dot
                                    }`}
                                  />

                                  <span className="truncate text-xs font-semibold">
                                    {event.title}
                                  </span>
                                </div>

                                <p className="mt-1 truncate pl-5 text-[9px] text-app-faint">
                                  {getTeamName(
                                    event.team_id
                                  )}
                                </p>
                              </button>
                            </div>
                          </div>
                        );
                      }
                    )}

                    {positionedEvents.length === 0 && (
                      <div className="absolute inset-0 flex items-center justify-center text-sm text-app-faint">
                        Keine Termine für diese Ansicht.
                      </div>
                    )}
                  </div>
                </div>

                {/* FRISTEN */}

                <div>
                  <div className="border-b border-app-border px-4 py-3 text-xs uppercase tracking-wide text-app-faint">
                    Fristen & To-dos
                  </div>

                  <div
                    className="relative"
                    style={{
                      height: `${
                        taskLaneCount * 95 + 35
                      }px`,
                    }}
                  >
                    <div className="pointer-events-none absolute inset-0 grid grid-cols-12">
                      {months.map((month) => (
                        <div
                          key={`${month.year}-${month.month}`}
                          className="border-r border-app-border last:border-r-0"
                        />
                      ))}
                    </div>

                    {todayPosition !== null && (
                      <div
                        className="pointer-events-none absolute bottom-0 top-0 z-20 w-px bg-app-accent/10"
                        style={{
                          left: `${todayPosition}%`,
                        }}
                      />
                    )}

                    {positionedTasks.map(
                      ({ task, lane }) => {
                        const position =
                          getPosition(task.due_date);

                        const color =
                          getTaskColorKey(task);

                        return (
                          <div
                            key={task.id}
                            className={`absolute z-30 ${
                              task.completed
                                ? "opacity-45"
                                : ""
                            }`}
                            style={{
                              left: `${position}%`,
                              top: `${
                                16 + lane * 95
                              }px`,
                            }}
                          >
                            <button
                              type="button"
                              onClick={() =>
                                editTask(task)
                              }
                              className={`absolute h-4 w-4 -translate-x-1/2 rounded-full ring-4 ring-app-accent-ink transition hover:scale-125 ${
                                colorStyles[color].dot
                              }`}
                            />

                            <div className="absolute top-4 h-4 w-px bg-app-elevated" />

                            <div
                              className="absolute top-8 w-36"
                              style={{
                                left:
                                  position < 5
                                    ? "8px"
                                    : position > 95
                                    ? "auto"
                                    : "50%",

                                right:
                                  position > 95
                                    ? "8px"
                                    : "auto",

                                transform:
                                  position >= 5 &&
                                  position <= 95
                                    ? "translateX(-50%)"
                                    : "none",
                              }}
                            >
                              <button
                                type="button"
                                onClick={() =>
                                  editTask(task)
                                }
                                className={`w-full rounded-lg border px-2 py-2 text-left transition hover:ring-2 hover:ring-app-heading/40 ${
                                  colorStyles[color]
                                    .card
                                }`}
                              >
                                <p className="text-[9px] font-semibold">
                                  {formatShortDate(
                                    task.due_date
                                  )}
                                </p>

                                <p
                                  className={`mt-1 truncate text-[10px] font-bold ${
                                    task.completed
                                      ? "line-through"
                                      : ""
                                  }`}
                                >
                                  {task.title}
                                </p>

                                <p className="mt-1 truncate text-[8px] opacity-70">
                                  {getTeamName(
                                    task.team_id
                                  )}
                                </p>
                              </button>
                            </div>
                          </div>
                        );
                      }
                    )}

                    {positionedTasks.length === 0 && (
                      <div className="absolute inset-0 flex items-center justify-center text-sm text-app-faint">
                        Keine Fristen für diese Ansicht.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* NÄCHSTE TERMINE */}

          <section className="mt-6 rounded-[20px] border border-app-border bg-app-surface shadow-app">
            <div className="flex items-center justify-between border-b border-app-border p-5">
              <div>
                <h2 className="text-xl font-semibold">
                  Nächste wichtige Termine
                </h2>

                <p className="mt-1 text-xs text-app-faint">
                  {selectedTeamName}
                </p>
              </div>
            </div>

            <div className="grid gap-3 p-5 md:grid-cols-2 xl:grid-cols-3">
              {upcomingEvents.map((event) => {
                const color =
                  getEventColorKey(event);

                return (
                  <div
                    key={event.id}
                    className={`rounded-xl border p-4 ${
                      colorStyles[color].card
                    }`}
                  >
                    <p className="text-xs font-medium">
                      {formatDate(event.start_date)}

                      {!isSingleDayEvent(event) &&
                        ` – ${formatDate(
                          event.end_date
                        )}`}
                    </p>

                    <h3 className="mt-2 font-bold">
                      {event.title}
                    </h3>

                    <p className="mt-2 text-xs">
                      {getEventTypeLabel(
                        event.event_type
                      )}{" "}
                      ·{" "}
                      {getTeamName(event.team_id)}
                    </p>

                    {event.location && (
                      <p className="mt-1 text-xs opacity-75">
                        {event.location}
                      </p>
                    )}

                    <div className="mt-4 flex gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          editEvent(event)
                        }
                        className="rounded-lg border border-current px-3 py-1.5 text-xs font-semibold opacity-80 hover:opacity-100"
                      >
                        Bearbeiten
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          deleteEvent(event)
                        }
                        className="rounded-lg border border-app-bad/60 bg-app-bad/10 px-3 py-1.5 text-xs font-semibold hover:bg-app-bad/10"
                      >
                        Löschen
                      </button>
                    </div>
                  </div>
                );
              })}

              {upcomingEvents.length === 0 && (
                <div className="col-span-full py-8 text-center text-sm text-app-faint">
                  Keine kommenden Termine für diese Ansicht.
                </div>
              )}
            </div>
          </section>

          <div className="mt-6">
            <Link
              href="/coach"
              className="inline-block rounded-xl border border-app-border px-4 py-3 text-sm hover:bg-app-elevated"
            >
              ← Zurück zum Dashboard
            </Link>
          </div>
        </>
      )}
    </div>
  );
}