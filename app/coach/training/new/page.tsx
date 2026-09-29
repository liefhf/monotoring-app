"use client";

import Link from "next/link";
import {
  Suspense,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import WeekFocusPanel from "@/components/WeekFocusPanel";
import { SuggestedBlock } from "@/lib/weekFocus";
import {
  CORE_GOALS,
  PRACTICE_MODE_CLASS,
  PRACTICE_MODE_HINT,
  PRACTICE_MODE_LABEL,
  parsePracticeMode,
  type PracticeMode,
} from "@/lib/kapitel1";

type TrainingType = "Wasser" | "Land";
type IntervalType = "P" | "@";

type Team = {
  id: string;
  name: string;
};

type WaterRow = {
  id: number;
  repetitions: number;
  distance: number;
  exercise: string;
  style: string;
  materials: string[];
  zone: string;
  intervalType: IntervalType;
  intervalTime: string;
};

type WaterSection = {
  id: string;
  name: string;
  /* Kapitel 1.5: null = nicht gekennzeichnet */
  mode: PracticeMode | null;
  rows: WaterRow[];
};

type LandRow = {
  id: number;
  exercise: string;
  sets: string;
  repetitions: string;
  weight: string;
  material: string;
  intensity: string;
};

type MaterialPickerState = {
  sectionId: string;
  rowId: number;
} | null;

type SavedSection = {
  id: string;
  section_key: string;
};

type ExistingSession = {
  id: string;
  team_id: string;
  title: string;
  session_date: string;
  start_time: string | null;
  training_type: "water" | "land";
  duration_minutes: number | null;
  total_meters: number | null;
  pool_length: number | null;
  focus: string | null;
  planned_rpe: number | null;
  core_goals: string[] | null;
  notes?: string | null;
};

type ExistingSection = {
  id: string;
  section_key: string;
  section_name: string;
  sort_order: number;
  practice_mode: string | null;
};

type ExistingWaterRow = {
  id: string;
  section_id: string;
  repetitions: number;
  distance: number;
  exercise: string | null;
  style: string | null;
  materials: string[];
  zone: string | null;
  interval_type: "P" | "@" | null;
  interval_time: string | null;
  sort_order: number;
};

type ExistingLandRow = {
  id: string;
  exercise: string;
  sets: string | null;
  repetitions: string | null;
  weight: string | null;
  material: string | null;
  intensity: string | null;
  sort_order: number;
};

type ExistingWarmUpRow = {
  id: string;
  exercise: string;
  sets: string | null;
  repetitions: string | null;
  material: string | null;
  intensity: string | null;
  sort_order: number;
};

const distanceOptions = [
  10,
  15,
  25,
  50,
  75,
  100,
  150,
  200,
  300,
  400,
  500,
  600,
  800,
  900,
  1000,
  1500,
  2000,
  3000,
  4000,
  5000,
  6000,
];

const styleOptions = [
  "Kraul",
  "Rücken",
  "Brust",
  "Schmetterling",
  "Lagen",
  "Beine",
  "Arme",
  "Beliebig",
];

const materialOptions = [
  "Flossen",
  "Paddels klein",
  "Paddels groß",
  "Pullbouy",
  "Brett",
  "Schnorchel",
  "Nasenklammer",
  "Knöchelband",
  "Becher",
  "Fallschirm",
  "Tauchring",
  "Schwimmnudel",
];

const zoneOptions = [
  "BZ1 (Rekom)",
  "BZ2 (GA1)",
  "BZ3 (GA1)",
  "BZ4 (GA2)",
  "BZ5 (GA2)",
  "BZ6 (WA)",
  "BZ7 (SA)",
  "BZ8 (S)",
];

function createWaterRow(id: number): WaterRow {
  return {
    id,
    repetitions: 1,
    distance: 100,
    exercise: "",
    style: "Kraul",
    materials: [],
    zone: "BZ2 (GA1)",
    intervalType: "P",
    intervalTime: "",
  };
}

function createLandRow(id: number): LandRow {
  return {
    id,
    exercise: "",
    sets: "",
    repetitions: "",
    weight: "",
    material: "",
    intensity: "",
  };
}

function createDefaultWaterSections(): WaterSection[] {
  return [
    {
      id: "einschwimmen",
      name: "Einschwimmen",
      mode: null,
      rows: [createWaterRow(1)],
    },
    {
      id: "technik",
      name: "Technik",
      mode: "ueben",
      rows: [createWaterRow(2)],
    },
    {
      id: "hauptblock",
      name: "Hauptblock",
      mode: "training",
      rows: [createWaterRow(3)],
    },
    {
      id: "ausschwimmen",
      name: "Ausschwimmen",
      mode: null,
      rows: [createWaterRow(4)],
    },
  ];
}

function TrainingEditor() {
  const searchParams = useSearchParams();

  const weekFromUrl = searchParams.get("week");
  const dayFromUrl = searchParams.get("day");
  const mesoFromUrl = searchParams.get("meso");
  const sessionFromUrl = searchParams.get("session");

  const isEditing = Boolean(sessionFromUrl);

  const [title, setTitle] = useState("");
  const [focus, setFocus] = useState("");

  const [trainingType, setTrainingType] =
    useState<TrainingType>("Wasser");

  const [date, setDate] = useState(dayFromUrl ?? "");
  const [time, setTime] = useState("16:00");
  const [duration, setDuration] = useState("90");
  const [poolLength, setPoolLength] = useState("25");

  /* Kapitel 1.1: geplante Belastung (RPE 1-10) */
  const [plannedRpe, setPlannedRpe] = useState("");

  /* Kapitel 1.4: Kernziele Land & Praevention */
  const [coreGoals, setCoreGoals] = useState<string[]>([]);

  /* Notizen zur Einheit (Spalte notes, siehe supabase/training_notizen.sql) */
  const [notes, setNotes] = useState("");
  const [hadNotes, setHadNotes] = useState(false);

  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState("");

  const [loadingTeams, setLoadingTeams] = useState(true);
  const [loadingTraining, setLoadingTraining] = useState(false);

  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const [materialPicker, setMaterialPicker] =
    useState<MaterialPickerState>(null);

  const [warmUpLand, setWarmUpLand] = useState<LandRow[]>([
    createLandRow(1),
  ]);

  const [waterSections, setWaterSections] =
    useState<WaterSection[]>(
      createDefaultWaterSections()
    );

  const [landRows, setLandRows] = useState<LandRow[]>([
    createLandRow(1),
  ]);

  /*
   * Entwurf: Neue Einheiten werden laufend im Browser zwischengespeichert,
   * damit beim Neuladen oder Seitenwechsel nichts verloren geht.
   * Nach erfolgreichem Speichern wird der Entwurf geloescht.
   */
  const draftKey = `training-entwurf:${dayFromUrl ?? ""}:${weekFromUrl ?? ""}`;
  const [draftReady, setDraftReady] = useState(false);
  const [draftRestored, setDraftRestored] = useState(false);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (isEditing) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- Entwurf aus dem Browser-Speicher laden
      setDraftReady(true);
      return;
    }
    try {
      const raw = localStorage.getItem(draftKey);
      if (raw) {
        const d = JSON.parse(raw);
        setTitle(d.title ?? "");
        setFocus(d.focus ?? "");
        if (d.trainingType) setTrainingType(d.trainingType);
        if (d.date) setDate(d.date);
        if (d.time) setTime(d.time);
        if (d.duration) setDuration(d.duration);
        if (d.poolLength) setPoolLength(d.poolLength);
        setPlannedRpe(d.plannedRpe ?? "");
        setCoreGoals(d.coreGoals ?? []);
        setNotes(d.notes ?? "");
        if (d.warmUpLand?.length) setWarmUpLand(d.warmUpLand);
        if (d.waterSections?.length) setWaterSections(d.waterSections);
        if (d.landRows?.length) setLandRows(d.landRows);
        setDraftRestored(true);
      }
    } catch {
      /* kein Zugriff auf den Browser-Speicher - dann ohne Entwurf */
    }
    setDraftReady(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- nur beim Oeffnen
  }, []);

  useEffect(() => {
    if (!draftReady || isEditing) return;
    const timer = setTimeout(() => {
      try {
        localStorage.setItem(
          draftKey,
          JSON.stringify({ title, focus, notes, trainingType, date, time, duration, poolLength, plannedRpe, coreGoals, warmUpLand, waterSections, landRows, savedAt: Date.now() })
        );
      } catch {
        /* ignorieren */
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [draftReady, isEditing, draftKey, title, focus, notes, trainingType, date, time, duration, poolLength, plannedRpe, coreGoals, warmUpLand, waterSections, landRows]);

  /* Aenderungen merken -> Warnung beim Verlassen ohne Speichern */
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Aenderung am Formular merken
    if (draftReady) setDirty(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reagiert nur auf Inhalte
  }, [title, focus, warmUpLand, waterSections, landRows]);

  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  function clearDraft() {
    try {
      localStorage.removeItem(draftKey);
    } catch {
      /* ignorieren */
    }
    setDirty(false);
    setDraftRestored(false);
  }

  function discardDraft() {
    clearDraft();
    setTitle("");
    setFocus("");
    setPlannedRpe("");
    setCoreGoals([]);
    setWarmUpLand([createLandRow(1)]);
    setWaterSections(createDefaultWaterSections());
    setLandRows([createLandRow(1)]);
  }

  async function loadTeams() {
    setLoadingTeams(true);

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setMessage("Coach konnte nicht geladen werden.");
      setLoadingTeams(false);
      return;
    }

    const { data, error } = await supabase
      .from("teams")
      .select("id, name")
      .eq("coach_id", user.id)
      .order("name");

    if (error) {
      setMessage(
        `Teams konnten nicht geladen werden: ${error.message}`
      );
      setLoadingTeams(false);
      return;
    }

    const loadedTeams = (data ?? []) as Team[];

    setTeams(loadedTeams);

    if (
      loadedTeams.length > 0 &&
      !sessionFromUrl
    ) {
      setSelectedTeamId(
        (current) =>
          current || loadedTeams[0].id
      );
    }

    setLoadingTeams(false);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Daten beim Oeffnen laden
    loadTeams();
  }, []);

  async function loadExistingTraining(
    sessionId: string
  ) {
    setLoadingTraining(true);
    setMessage("");

    const {
      data: sessionData,
      error: sessionError,
    } = await supabase
      .from("training_sessions")
      .select(
        `
          id,
          team_id,
          title,
          session_date,
          start_time,
          training_type,
          duration_minutes,
          total_meters,
          pool_length,
          focus,
          planned_rpe,
          core_goals,
          *
        `
      )
      .eq("id", sessionId)
      .single();

    if (sessionError || !sessionData) {
      setMessage(
        "Das Training konnte nicht geladen werden oder du hast keinen Zugriff darauf."
      );
      setLoadingTraining(false);
      return;
    }

    const session =
      sessionData as ExistingSession;

    setTitle(session.title);
    setDate(session.session_date);

    setTime(
      session.start_time
        ? session.start_time.slice(0, 5)
        : ""
    );

    setDuration(
      session.duration_minutes !== null
        ? String(session.duration_minutes)
        : ""
    );

    setFocus(session.focus ?? "");
    setSelectedTeamId(session.team_id);

    setPlannedRpe(
      session.planned_rpe !== null
        ? String(session.planned_rpe)
        : ""
    );

    setCoreGoals(session.core_goals ?? []);
    setNotes(session.notes ?? "");
    setHadNotes(Boolean(session.notes));

    setPoolLength(
      session.pool_length === 50
        ? "50"
        : "25"
    );

    const loadedType: TrainingType =
      session.training_type === "water"
        ? "Wasser"
        : "Land";

    setTrainingType(loadedType);

    if (loadedType === "Land") {
      const {
        data: landData,
        error: landError,
      } = await supabase
        .from("training_land_rows")
        .select(
          `
            id,
            exercise,
            sets,
            repetitions,
            weight,
            material,
            intensity,
            sort_order
          `
        )
        .eq("training_session_id", sessionId)
        .order("sort_order", {
          ascending: true,
        });

      if (landError) {
        setMessage(
          `Landübungen konnten nicht geladen werden: ${landError.message}`
        );
        setLoadingTraining(false);
        return;
      }

      const loadedRows =
        (landData ?? []) as ExistingLandRow[];

      setLandRows(
        loadedRows.length > 0
          ? loadedRows.map((row, index) => ({
              id: index + 1,
              exercise: row.exercise,
              sets: row.sets ?? "",
              repetitions:
                row.repetitions ?? "",
              weight: row.weight ?? "",
              material: row.material ?? "",
              intensity:
                row.intensity ?? "",
            }))
          : [createLandRow(1)]
      );

      setWaterSections(
        createDefaultWaterSections()
      );

      setWarmUpLand([
        createLandRow(1),
      ]);

      setLoadingTraining(false);
      return;
    }

    const {
      data: warmUpData,
      error: warmUpError,
    } = await supabase
      .from("training_warmup_land_rows")
      .select(
        `
          id,
          exercise,
          sets,
          repetitions,
          material,
          intensity,
          sort_order
        `
      )
      .eq("training_session_id", sessionId)
      .order("sort_order", {
        ascending: true,
      });

    if (warmUpError) {
      setMessage(
        `Warm-up-Übungen konnten nicht geladen werden: ${warmUpError.message}`
      );
      setLoadingTraining(false);
      return;
    }

    const loadedWarmUpRows =
      (warmUpData ?? []) as ExistingWarmUpRow[];

    setWarmUpLand(
      loadedWarmUpRows.length > 0
        ? loadedWarmUpRows.map((row, index) => ({
            id: index + 1,
            exercise: row.exercise,
            sets: row.sets ?? "",
            repetitions: row.repetitions ?? "",
            weight: "",
            material: row.material ?? "",
            intensity: row.intensity ?? "",
          }))
        : [createLandRow(1)]
    );

    const {
      data: sectionData,
      error: sectionError,
    } = await supabase
      .from("training_sections")
      .select(
        `
          id,
          section_key,
          section_name,
          sort_order,
          practice_mode
        `
      )
      .eq("training_session_id", sessionId)
      .order("sort_order", {
        ascending: true,
      });

    if (sectionError) {
      setMessage(
        `Trainingsblöcke konnten nicht geladen werden: ${sectionError.message}`
      );
      setLoadingTraining(false);
      return;
    }

    const loadedSections =
      (sectionData ?? []) as ExistingSection[];

    if (loadedSections.length === 0) {
      setWaterSections(
        createDefaultWaterSections()
      );
      setLoadingTraining(false);
      return;
    }

    const sectionIds = loadedSections.map(
      (section) => section.id
    );

    const {
      data: rowData,
      error: rowError,
    } = await supabase
      .from("training_rows")
      .select(
        `
          id,
          section_id,
          repetitions,
          distance,
          exercise,
          style,
          materials,
          zone,
          interval_type,
          interval_time,
          sort_order
        `
      )
      .in("section_id", sectionIds)
      .order("sort_order", {
        ascending: true,
      });

    if (rowError) {
      setMessage(
        `Trainingsserien konnten nicht geladen werden: ${rowError.message}`
      );
      setLoadingTraining(false);
      return;
    }

    const loadedWaterRows =
      (rowData ?? []) as ExistingWaterRow[];

    let nextRowId = 1;

    const rebuiltSections: WaterSection[] =
      loadedSections.map((section) => {
        const sectionRows = loadedWaterRows
          .filter(
            (row) =>
              row.section_id === section.id
          )
          .sort(
            (a, b) =>
              a.sort_order - b.sort_order
          )
          .map((row) => {
            const newRow: WaterRow = {
              id: nextRowId++,
              repetitions:
                row.repetitions,
              distance: row.distance,
              exercise:
                row.exercise ?? "",
              style:
                row.style ?? "Kraul",
              materials:
                row.materials ?? [],
              zone:
                row.zone ??
                "BZ2 (GA1)",
              intervalType:
                row.interval_type === "@"
                  ? "@"
                  : "P",
              intervalTime:
                row.interval_time ?? "",
            };

            return newRow;
          });

        return {
          id: section.section_key,
          name: section.section_name,
          mode: parsePracticeMode(
            section.practice_mode
          ),
          rows:
            sectionRows.length > 0
              ? sectionRows
              : [
                  createWaterRow(
                    nextRowId++
                  ),
                ],
        };
      });

    setWaterSections(rebuiltSections);
    setLandRows([createLandRow(1)]);
    setLoadingTraining(false);
  }

  useEffect(() => {
    if (sessionFromUrl) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- Daten beim Oeffnen laden
      loadExistingTraining(sessionFromUrl);
    }
  }, [sessionFromUrl]);

  const weekday = useMemo(() => {
    if (!date) return "";

    const parsedDate = new Date(
      `${date}T12:00:00`
    );

    if (
      Number.isNaN(parsedDate.getTime())
    ) {
      return "";
    }

    return parsedDate.toLocaleDateString(
      "de-DE",
      {
        weekday: "long",
      }
    );
  }, [date]);

  const formattedDate = useMemo(() => {
    if (!date) return "";

    const parsedDate = new Date(
      `${date}T12:00:00`
    );

    if (
      Number.isNaN(parsedDate.getTime())
    ) {
      return "";
    }

    return parsedDate.toLocaleDateString(
      "de-DE"
    );
  }, [date]);

  const totalWaterMeters = useMemo(() => {
    return waterSections.reduce(
      (sectionTotal, section) =>
        sectionTotal +
        section.rows.reduce(
          (rowTotal, row) =>
            rowTotal +
            row.repetitions *
              row.distance,
          0
        ),
      0
    );
  }, [waterSections]);

  const selectedMaterialRow = useMemo(() => {
    if (!materialPicker) {
      return null;
    }

    const section = waterSections.find(
      (currentSection) =>
        currentSection.id ===
        materialPicker.sectionId
    );

    if (!section) {
      return null;
    }

    const row = section.rows.find(
      (currentRow) =>
        currentRow.id ===
        materialPicker.rowId
    );

    if (!row) {
      return null;
    }

    return {
      section,
      row,
    };
  }, [
    materialPicker,
    waterSections,
  ]);

  function getSectionMeters(
    section: WaterSection
  ) {
    return section.rows.reduce(
      (total, row) =>
        total +
        row.repetitions *
          row.distance,
      0
    );
  }

  function updateWaterRow(
    sectionId: string,
    rowId: number,
    field: keyof WaterRow,
    value:
      | string
      | number
      | string[]
  ) {
    setWaterSections((current) =>
      current.map((section) => {
        if (
          section.id !== sectionId
        ) {
          return section;
        }

        return {
          ...section,
          rows: section.rows.map(
            (row) =>
              row.id === rowId
                ? {
                    ...row,
                    [field]: value,
                  }
                : row
          ),
        };
      })
    );
  }

  /* Baustein aus dem Wochenfokus in die Einheit uebernehmen (leere Startzeile wird ersetzt) */
  function insertSuggestedBlock(block: SuggestedBlock) {
    setTrainingType("Wasser");
    setWaterSections((current) => {
      let nextId = Math.max(0, ...current.flatMap((section) => section.rows.map((row) => row.id))) + 1;
      return current.map((section) => {
        const additions = block.rows
          .filter((row) => row.section === section.id)
          .map((row) => ({
            ...createWaterRow(nextId++),
            repetitions: row.repetitions,
            distance: row.distance,
            exercise: row.exercise,
            style: row.style,
            zone: row.zone,
            intervalType: row.intervalType,
            intervalTime: row.intervalTime,
          }));
        if (additions.length === 0) return section;
        const kept = section.rows.filter((row) => row.exercise.trim() !== "" || row.intervalTime !== "");
        return { ...section, rows: [...kept, ...additions] };
      });
    });
    if (!focus.trim()) setFocus(block.title);
  }

  function addWaterRow(
    sectionId: string
  ) {
    setWaterSections((current) => {
      const allIds =
        current.flatMap((section) =>
          section.rows.map(
            (row) => row.id
          )
        );

      const nextId =
        allIds.length > 0
          ? Math.max(...allIds) + 1
          : 1;

      return current.map(
        (section) =>
          section.id === sectionId
            ? {
                ...section,
                rows: [
                  ...section.rows,
                  createWaterRow(nextId),
                ],
              }
            : section
      );
    });
  }

  function removeWaterRow(
    sectionId: string,
    rowId: number
  ) {
    setWaterSections((current) =>
      current.map((section) =>
        section.id === sectionId
          ? {
              ...section,
              rows:
                section.rows.filter(
                  (row) =>
                    row.id !== rowId
                ),
            }
          : section
      )
    );
  }

  function toggleMaterial(
    sectionId: string,
    row: WaterRow,
    material: string
  ) {
    const newMaterials =
      row.materials.includes(material)
        ? row.materials.filter(
            (currentMaterial) =>
              currentMaterial !==
              material
          )
        : [
            ...row.materials,
            material,
          ];

    updateWaterRow(
      sectionId,
      row.id,
      "materials",
      newMaterials
    );
  }

  function setSectionMode(
    sectionId: string,
    mode: PracticeMode
  ) {
    setWaterSections((current) =>
      current.map((section) =>
        section.id === sectionId
          ? {
              ...section,
              /* erneutes Klicken hebt die Kennzeichnung auf */
              mode:
                section.mode === mode
                  ? null
                  : mode,
            }
          : section
      )
    );
  }

  function toggleCoreGoal(goal: string) {
    setCoreGoals((current) =>
      current.includes(goal)
        ? current.filter((g) => g !== goal)
        : [...current, goal]
    );
  }

  function updateWarmUpLand(
    id: number,
    field: keyof LandRow,
    value: string
  ) {
    setWarmUpLand((current) =>
      current.map((row) =>
        row.id === id
          ? {
              ...row,
              [field]: value,
            }
          : row
      )
    );
  }

  function addWarmUpLandRow() {
    const nextId =
      warmUpLand.length > 0
        ? Math.max(
            ...warmUpLand.map(
              (row) => row.id
            )
          ) + 1
        : 1;

    setWarmUpLand((current) => [
      ...current,
      createLandRow(nextId),
    ]);
  }

  function removeWarmUpLandRow(
    id: number
  ) {
    setWarmUpLand((current) =>
      current.filter(
        (row) => row.id !== id
      )
    );
  }

  function updateLandRow(
    id: number,
    field: keyof LandRow,
    value: string
  ) {
    setLandRows((current) =>
      current.map((row) =>
        row.id === id
          ? {
              ...row,
              [field]: value,
            }
          : row
      )
    );
  }

  function addLandRow() {
    const nextId =
      landRows.length > 0
        ? Math.max(
            ...landRows.map(
              (row) => row.id
            )
          ) + 1
        : 1;

    setLandRows((current) => [
      ...current,
      createLandRow(nextId),
    ]);
  }

  function removeLandRow(id: number) {
    setLandRows((current) =>
      current.filter(
        (row) => row.id !== id
      )
    );
  }

  async function saveLandDetails(
    trainingId: string,
    filledLandRows: LandRow[]
  ) {
    const landRowsToInsert =
      filledLandRows.map(
        (row, index) => ({
          training_session_id:
            trainingId,

          exercise:
            row.exercise.trim(),

          sets:
            row.sets.trim() === ""
              ? null
              : row.sets.trim(),

          repetitions:
            row.repetitions.trim() ===
            ""
              ? null
              : row.repetitions.trim(),

          weight:
            row.weight.trim() === ""
              ? null
              : row.weight.trim(),

          material:
            row.material.trim() === ""
              ? null
              : row.material.trim(),

          intensity:
            row.intensity.trim() ===
            ""
              ? null
              : row.intensity.trim(),

          sort_order: index,
        })
      );

    const { error } = await supabase
      .from("training_land_rows")
      .insert(landRowsToInsert);

    return error;
  }

  async function saveWarmUpDetails(
    trainingId: string
  ) {
    const filledWarmUpRows =
      warmUpLand.filter(
        (row) =>
          row.exercise.trim() !== ""
      );

    if (
      filledWarmUpRows.length === 0
    ) {
      return null;
    }

    const warmUpRowsToInsert =
      filledWarmUpRows.map(
        (row, index) => ({
          training_session_id:
            trainingId,

          exercise:
            row.exercise.trim(),

          sets:
            row.sets.trim() === ""
              ? null
              : row.sets.trim(),

          repetitions:
            row.repetitions.trim() === ""
              ? null
              : row.repetitions.trim(),

          material:
            row.material.trim() === ""
              ? null
              : row.material.trim(),

          intensity:
            row.intensity.trim() === ""
              ? null
              : row.intensity.trim(),

          sort_order: index,
        })
      );

    const { error } = await supabase
      .from("training_warmup_land_rows")
      .insert(warmUpRowsToInsert);

    return error;
  }

  async function saveWaterDetails(
    trainingId: string
  ) {
    const sectionsToInsert =
      waterSections.map(
        (section, index) => ({
          training_session_id:
            trainingId,
          section_key: section.id,
          section_name: section.name,
          practice_mode: section.mode,
          sort_order: index,
        })
      );

    const {
      data: savedSections,
      error: sectionError,
    } = await supabase
      .from("training_sections")
      .insert(sectionsToInsert)
      .select("id, section_key");

    if (
      sectionError ||
      !savedSections
    ) {
      return (
        sectionError ??
        new Error(
          "Trainingsblöcke konnten nicht gespeichert werden."
        )
      );
    }

    const sectionMap =
      new Map<string, string>();

    (
      savedSections as SavedSection[]
    ).forEach((section) => {
      sectionMap.set(
        section.section_key,
        section.id
      );
    });

    const rowsToInsert =
      waterSections.flatMap(
        (section) => {
          const savedSectionId =
            sectionMap.get(
              section.id
            );

          if (!savedSectionId) {
            return [];
          }

          return section.rows.map(
            (row, rowIndex) => ({
              section_id:
                savedSectionId,

              repetitions:
                row.repetitions,

              distance:
                row.distance,

              exercise:
                row.exercise.trim() ===
                ""
                  ? null
                  : row.exercise.trim(),

              style: row.style,

              materials:
                row.materials,

              zone: row.zone,

              interval_type:
                row.intervalType,

              interval_time:
                row.intervalTime.trim() ===
                ""
                  ? null
                  : row.intervalTime.trim(),

              sort_order:
                rowIndex,
            })
          );
        }
      );

    if (
      rowsToInsert.length === 0
    ) {
      return null;
    }

    const { error: rowError } =
      await supabase
        .from("training_rows")
        .insert(rowsToInsert);

    return rowError;
  }

  async function handleSaveTraining() {
    setMessage("");

    if (!title.trim()) {
      setMessage(
        "Bitte gib einen Titel für das Training ein."
      );
      return;
    }

    if (!date) {
      setMessage(
        "Bitte wähle ein Datum aus."
      );
      return;
    }

    if (!selectedTeamId) {
      setMessage(
        "Bitte wähle ein Team aus."
      );
      return;
    }

    const parsedDuration =
      Number(duration);

    if (
      !Number.isFinite(
        parsedDuration
      ) ||
      parsedDuration <= 0
    ) {
      setMessage(
        "Bitte gib eine gültige Trainingsdauer ein."
      );
      return;
    }

    const filledLandRows =
      landRows.filter(
        (row) =>
          row.exercise.trim() !== ""
      );

    if (
      trainingType === "Land" &&
      filledLandRows.length === 0
    ) {
      setMessage(
        "Bitte trage mindestens eine Landübung ein."
      );
      return;
    }

    setSaving(true);

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setMessage(
        "Coach konnte nicht geladen werden."
      );
      setSaving(false);
      return;
    }

    const sessionValues = {
      coach_id: user.id,
      team_id: selectedTeamId,
      title: title.trim(),
      session_date: date,
      start_time:
        time || null,
      training_type:
        trainingType === "Wasser"
          ? "water"
          : "land",
      duration_minutes:
        parsedDuration,
      total_meters:
        trainingType === "Wasser"
          ? totalWaterMeters
          : null,
      pool_length:
        trainingType === "Wasser"
          ? Number(poolLength)
          : null,
      focus:
        focus.trim() === ""
          ? null
          : focus.trim(),
      planned_rpe:
        plannedRpe === ""
          ? null
          : Number(plannedRpe),
      core_goals: coreGoals,
      /* nur mitschicken, wenn etwas drinsteht - so klappt Speichern auch ohne die neue Spalte */
      ...(notes.trim() ? { notes: notes.trim() } : hadNotes ? { notes: null } : {}),
    };

    if (
      isEditing &&
      sessionFromUrl
    ) {
      const { error: updateError } =
        await supabase
          .from("training_sessions")
          .update(sessionValues)
          .eq(
            "id",
            sessionFromUrl
          );

      if (updateError) {
        setMessage(
          `Training konnte nicht aktualisiert werden: ${updateError.message}`
        );
        setSaving(false);
        return;
      }

      const {
        error:
          deleteSectionsError,
      } = await supabase
        .from("training_sections")
        .delete()
        .eq(
          "training_session_id",
          sessionFromUrl
        );

      if (deleteSectionsError) {
        setMessage(
          `Alte Wasserblöcke konnten nicht entfernt werden: ${deleteSectionsError.message}`
        );
        setSaving(false);
        return;
      }

      const {
        error: deleteLandError,
      } = await supabase
        .from("training_land_rows")
        .delete()
        .eq(
          "training_session_id",
          sessionFromUrl
        );

      if (deleteLandError) {
        setMessage(
          `Alte Landübungen konnten nicht entfernt werden: ${deleteLandError.message}`
        );
        setSaving(false);
        return;
      }

      const {
        error: deleteWarmUpError,
      } = await supabase
        .from("training_warmup_land_rows")
        .delete()
        .eq(
          "training_session_id",
          sessionFromUrl
        );

      if (deleteWarmUpError) {
        setMessage(
          `Alte Warm-up-Übungen konnten nicht entfernt werden: ${deleteWarmUpError.message}`
        );
        setSaving(false);
        return;
      }

      if (
        trainingType === "Land"
      ) {
        const landError =
          await saveLandDetails(
            sessionFromUrl,
            filledLandRows
          );

        if (landError) {
          setMessage(
            `Landübungen konnten nicht aktualisiert werden: ${landError.message}`
          );
          setSaving(false);
          return;
        }

        setMessage(
          "Landtraining wurde aktualisiert ✅"
        );

        setSaving(false);
        return;
      }

      const waterError =
        await saveWaterDetails(
          sessionFromUrl
        );

      if (waterError) {
        setMessage(
          `Wassertraining konnte nicht vollständig aktualisiert werden: ${waterError.message}`
        );
        setSaving(false);
        return;
      }

      const warmUpError =
        await saveWarmUpDetails(
          sessionFromUrl
        );

      if (warmUpError) {
        setMessage(
          `Warm-up-Übungen konnten nicht aktualisiert werden: ${warmUpError.message}`
        );
        setSaving(false);
        return;
      }

      setMessage(
        "Wassertraining inklusive Warm Up am Land wurde aktualisiert ✅"
      );

      setSaving(false);
      return;
    }

    const {
      data: savedTraining,
      error: trainingError,
    } = await supabase
      .from("training_sessions")
      .insert(sessionValues)
      .select("id")
      .single();

    if (
      trainingError ||
      !savedTraining
    ) {
      setMessage(
        `Training konnte nicht gespeichert werden: ${
          trainingError?.message ??
          "Unbekannter Fehler"
        }`
      );

      setSaving(false);
      return;
    }

    const trainingId =
      savedTraining.id;

    if (
      trainingType === "Land"
    ) {
      const landError =
        await saveLandDetails(
          trainingId,
          filledLandRows
        );

      if (landError) {
        await supabase
          .from("training_sessions")
          .delete()
          .eq("id", trainingId);

        setMessage(
          `Landübungen konnten nicht gespeichert werden: ${landError.message}`
        );

        setSaving(false);
        return;
      }

      setMessage(
        "Landtraining inklusive aller Übungen wurde gespeichert ✅"
      );
      clearDraft();

      setSaving(false);
      return;
    }

    const waterError =
      await saveWaterDetails(
        trainingId
      );

    if (waterError) {
      await supabase
        .from("training_sessions")
        .delete()
        .eq("id", trainingId);

      setMessage(
        `Wassertraining konnte nicht vollständig gespeichert werden: ${waterError.message}`
      );

      setSaving(false);
      return;
    }

    const warmUpError =
      await saveWarmUpDetails(
        trainingId
      );

    if (warmUpError) {
      await supabase
        .from("training_sessions")
        .delete()
        .eq("id", trainingId);

      setMessage(
        `Warm-up-Übungen konnten nicht gespeichert werden: ${warmUpError.message}`
      );

      setSaving(false);
      return;
    }

    setMessage(
      "Training inklusive Wasser-Serien und Warm Up am Land wurde gespeichert ✅"
    );
    clearDraft();

    setSaving(false);
  }

  const hasPlanningContext =
    weekFromUrl ||
    dayFromUrl ||
    mesoFromUrl;

  return (
    <main>
      {materialPicker &&
        selectedMaterialRow && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-app-bg/80 p-4">
            <div className="w-full max-w-xl rounded-3xl border border-app-border bg-app-surface shadow-app shadow-2xl">
              <div className="flex items-start justify-between border-b border-app-border p-5">
                <div>
                  <h2 className="text-xl font-semibold">
                    Material auswählen
                  </h2>

                  <p className="mt-1 text-sm text-app-muted">
                    Du kannst mehrere Materialien gleichzeitig auswählen.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    setMaterialPicker(
                      null
                    )
                  }
                  className="rounded-lg border border-app-border px-3 py-2 text-sm hover:bg-app-elevated"
                >
                  ✕
                </button>
              </div>

              <div className="p-5">
                <div className="grid gap-3 sm:grid-cols-2">
                  {materialOptions.map(
                    (material) => {
                      const isSelected =
                        selectedMaterialRow.row.materials.includes(
                          material
                        );

                      return (
                        <button
                          key={
                            material
                          }
                          type="button"
                          onClick={() =>
                            toggleMaterial(
                              selectedMaterialRow
                                .section
                                .id,
                              selectedMaterialRow
                                .row,
                              material
                            )
                          }
                          className={`flex items-center justify-between rounded-xl border px-4 py-3 text-left text-sm transition ${
                            isSelected
                              ? "border-app-heading bg-app-accent text-app-accent-ink"
                              : "border-app-border bg-app-bg text-app-heading hover:bg-app-elevated"
                          }`}
                        >
                          <span>
                            {
                              material
                            }
                          </span>

                          <span className="text-lg">
                            {isSelected
                              ? "✓"
                              : ""}
                          </span>
                        </button>
                      );
                    }
                  )}
                </div>

                {selectedMaterialRow
                  .row.materials
                  .length > 0 && (
                  <div className="mt-5 rounded-xl border border-app-border bg-app-bg p-4">
                    <p className="text-xs text-app-faint">
                      Ausgewählt
                    </p>

                    <div className="mt-2 flex flex-wrap gap-2">
                      {selectedMaterialRow.row.materials.map(
                        (
                          material
                        ) => (
                          <span
                            key={
                              material
                            }
                            className="rounded-full bg-app-elevated px-3 py-1 text-xs"
                          >
                            {
                              material
                            }
                          </span>
                        )
                      )}
                    </div>
                  </div>
                )}

                <div className="mt-5 flex justify-between gap-3">
                  <button
                    type="button"
                    onClick={() =>
                      updateWaterRow(
                        selectedMaterialRow
                          .section.id,
                        selectedMaterialRow
                          .row.id,
                        "materials",
                        []
                      )
                    }
                    className="rounded-xl border border-app-border px-4 py-3 text-sm hover:bg-app-elevated"
                  >
                    Auswahl löschen
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setMaterialPicker(
                        null
                      )
                    }
                    className="rounded-xl bg-app-accent px-5 py-3 text-sm font-medium text-app-accent-ink hover:brightness-110"
                  >
                    Fertig
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

      <div className="mx-auto max-w-[1800px] px-6 py-8">
        <div className="mb-5">
          {weekFromUrl ? (
            <Link
              href={`/coach/training/week/${weekFromUrl}`}
              className="text-sm text-app-muted hover:text-app-heading"
            >
              ← Zurück zur Woche
            </Link>
          ) : (
            <Link
              href="/coach/training"
              className="text-sm text-app-muted hover:text-app-heading"
            >
              ← Zurück zur Trainingsübersicht
            </Link>
          )}
        </div>

        <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-sm text-app-muted">
              Trainingsplanung
            </p>

            <h1 className="mt-1 text-3xl font-bold">
              {isEditing
                ? "Training bearbeiten"
                : "Training erstellen"}
            </h1>

            <p className="mt-2 text-app-muted">
              {isEditing
                ? "Gespeicherte Trainingseinheit bearbeiten."
                : "Wasser- oder Landtraining planen."}
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/coach/training/season"
              className="rounded-xl border border-app-border px-4 py-3 text-sm hover:bg-app-elevated"
            >
              Jahresplanung
            </Link>

            <Link
              href="/coach/training"
              className="rounded-xl border border-app-border px-4 py-3 text-sm hover:bg-app-elevated"
            >
              Trainingsübersicht
            </Link>
          </div>
        </div>

        {loadingTraining && (
          <div className="mt-6 rounded-xl border border-app-border bg-app-surface p-4 text-sm text-app-text">
            Training wird geladen...
          </div>
        )}

        {message && (
          <div className="mt-6 rounded-xl border border-app-border bg-app-surface p-4 text-sm text-app-text">
            {message}
          </div>
        )}

        {hasPlanningContext && (
          <section className="mt-6 rounded-2xl border border-app-accent/40 bg-app-accent/10 p-5">
            <p className="text-xs font-medium uppercase tracking-wide text-app-accent">
              Zugeordnet zur Trainingsplanung
            </p>

            <div className="mt-4 flex flex-wrap gap-3">
              {mesoFromUrl && (
                <div className="rounded-xl border border-app-accent/40 bg-app-bg px-4 py-3">
                  <p className="text-xs text-app-faint">
                    Mesozyklus
                  </p>

                  <p className="mt-1 font-semibold">
                    Meso {mesoFromUrl}
                  </p>
                </div>
              )}

              {weekFromUrl && (
                <div className="rounded-xl border border-app-accent/40 bg-app-bg px-4 py-3">
                  <p className="text-xs text-app-faint">
                    Mikrozyklus
                  </p>

                  <p className="mt-1 font-semibold">
                    Woche {weekFromUrl}
                  </p>
                </div>
              )}

              {date && (
                <div className="rounded-xl border border-app-accent/40 bg-app-bg px-4 py-3">
                  <p className="text-xs text-app-faint">
                    Trainingstag
                  </p>

                  <p className="mt-1 font-semibold">
                    {weekday} ·{" "}
                    {formattedDate}
                  </p>
                </div>
              )}
            </div>
          </section>
        )}

        {draftRestored && (
          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-app-warn/40 bg-app-warn/10 px-4 py-3 text-sm text-app-text">
            <span>
              <b>Nicht gespeicherter Entwurf wiederhergestellt.</b> Zum Sichern unten auf „Training speichern“ klicken.
            </span>
            <button type="button" onClick={discardDraft} className="text-xs font-semibold text-app-warn">
              Entwurf verwerfen
            </button>
          </div>
        )}

        {!isEditing && draftReady && (
          <p className="mt-3 text-xs text-app-faint">Entwurf wird automatisch im Browser zwischengespeichert – gespeichert ist die Einheit erst mit „Training speichern“.</p>
        )}

        <div className="mt-6">
          <WeekFocusPanel onInsert={insertSuggestedBlock} poolLength={Number(poolLength)} />
        </div>

        <section className="mt-6 rounded-3xl border border-app-border bg-app-surface shadow-app">
          <div className="border-b border-app-border p-5">
            <h2 className="text-xl font-semibold">
              Trainingsdaten
            </h2>
          </div>

          <div className="grid gap-5 p-5 md:grid-cols-2 xl:grid-cols-6">
            <div className="xl:col-span-2">
              <label className="mb-2 block text-sm text-app-muted">
                Titel
              </label>

              <input
                value={title}
                onChange={(event) =>
                  setTitle(
                    event.target.value
                  )
                }
                placeholder="z. B. GA1 + Technik"
                className="w-full rounded-xl border border-app-border bg-app-bg px-4 py-3 outline-none"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm text-app-muted">
                Datum
              </label>

              <input
                type="date"
                value={date}
                onChange={(event) =>
                  setDate(
                    event.target.value
                  )
                }
                className="w-full rounded-xl border border-app-border bg-app-bg px-4 py-3 outline-none"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm text-app-muted">
                Uhrzeit
              </label>

              <input
                type="time"
                value={time}
                onChange={(event) =>
                  setTime(
                    event.target.value
                  )
                }
                className="w-full rounded-xl border border-app-border bg-app-bg px-4 py-3 outline-none"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm text-app-muted">
                Dauer in Minuten
              </label>

              <input
                type="number"
                min="1"
                value={duration}
                onChange={(event) =>
                  setDuration(
                    event.target.value
                  )
                }
                className="w-full rounded-xl border border-app-border bg-app-bg px-4 py-3 outline-none"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm text-app-muted">
                Team
              </label>

              <select
                value={
                  selectedTeamId
                }
                onChange={(event) =>
                  setSelectedTeamId(
                    event.target.value
                  )
                }
                disabled={
                  loadingTeams
                }
                className="w-full rounded-xl border border-app-border bg-app-bg px-4 py-3 outline-none disabled:opacity-60"
              >
                {loadingTeams ? (
                  <option value="">
                    Teams werden geladen...
                  </option>
                ) : teams.length ===
                  0 ? (
                  <option value="">
                    Kein Team vorhanden
                  </option>
                ) : (
                  teams.map(
                    (team) => (
                      <option
                        key={
                          team.id
                        }
                        value={
                          team.id
                        }
                      >
                        {
                          team.name
                        }
                      </option>
                    )
                  )
                )}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm text-app-muted">
                Geplante RPE
              </label>

              <select
                value={plannedRpe}
                onChange={(event) =>
                  setPlannedRpe(
                    event.target.value
                  )
                }
                title="Wie anstrengend soll die Einheit sein? Wird mit der RPE der Athleten verglichen."
                className="w-full rounded-xl border border-app-border bg-app-bg px-4 py-3 outline-none"
              >
                <option value="">
                  –
                </option>
                {Array.from(
                  { length: 10 },
                  (_, index) => index + 1
                ).map((value) => (
                  <option
                    key={value}
                    value={value}
                  >
                    {value}
                  </option>
                ))}
              </select>
            </div>

            <div className="md:col-span-2 xl:col-span-5">
              <label className="mb-2 block text-sm text-app-muted">
                Trainingsfokus
              </label>

              <input
                value={focus}
                onChange={(event) =>
                  setFocus(
                    event.target.value
                  )
                }
                placeholder="z. B. Technik & Grundlagenausdauer"
                className="w-full rounded-xl border border-app-border bg-app-bg px-4 py-3 outline-none"
              />
            </div>

            <div className="md:col-span-2 xl:col-span-5">
              <label className="mb-2 block text-sm text-app-muted">
                Notizen (erscheinen auch im Ausdruck)
              </label>

              <textarea
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                rows={3}
                placeholder="z. B. Hinweise für die Gruppe, Beobachtungen nach dem Training …"
                className="w-full rounded-xl border border-app-border bg-app-bg px-4 py-3 outline-none"
              />
            </div>
          </div>
        </section>

        <section className="mt-6 rounded-3xl border border-app-border bg-app-surface shadow-app p-5">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm text-app-muted">
                Trainingsart
              </p>

              <div className="mt-3 flex gap-3">
                <button
                  type="button"
                  onClick={() =>
                    setTrainingType(
                      "Wasser"
                    )
                  }
                  className={`rounded-xl px-5 py-3 text-sm font-medium ${
                    trainingType ===
                    "Wasser"
                      ? "bg-app-accent text-app-accent-ink"
                      : "border border-app-border hover:bg-app-elevated"
                  }`}
                >
                  Wassertraining
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setTrainingType(
                      "Land"
                    )
                  }
                  className={`rounded-xl px-5 py-3 text-sm font-medium ${
                    trainingType ===
                    "Land"
                      ? "bg-app-accent text-app-accent-ink"
                      : "border border-app-border hover:bg-app-elevated"
                  }`}
                >
                  Landtraining
                </button>
              </div>
            </div>

            {trainingType ===
              "Wasser" && (
              <div>
                <p className="mb-2 text-sm text-app-muted">
                  Beckenlänge
                </p>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setPoolLength(
                        "25"
                      )
                    }
                    className={`rounded-xl px-4 py-2 text-sm ${
                      poolLength ===
                      "25"
                        ? "bg-app-accent text-app-accent-ink"
                        : "border border-app-border"
                    }`}
                  >
                    25 m
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setPoolLength(
                        "50"
                      )
                    }
                    className={`rounded-xl px-4 py-2 text-sm ${
                      poolLength ===
                      "50"
                        ? "bg-app-accent text-app-accent-ink"
                        : "border border-app-border"
                    }`}
                  >
                    50 m
                  </button>
                </div>
              </div>
            )}
          </div>
        </section>

        <section className="mt-6 rounded-3xl border border-app-border bg-app-surface shadow-app p-5">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
            <p className="text-sm text-app-muted">
              Kernziele Land & Prävention
            </p>

            <p className="text-xs text-app-faint">
              {trainingType === "Wasser"
                ? "gilt für das Warm Up am Land"
                : "fließt in die Monatsübersicht unter Analysen"}
            </p>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            {CORE_GOALS.map((goal) => {
              const selected =
                coreGoals.includes(goal.key);

              return (
                <button
                  key={goal.key}
                  type="button"
                  title={goal.hint}
                  onClick={() =>
                    toggleCoreGoal(goal.key)
                  }
                  className={`rounded-full border px-3 py-1.5 text-xs transition ${
                    selected
                      ? "border-app-sand/60 bg-app-sand/15 text-app-sand"
                      : "border-app-border text-app-muted hover:bg-app-elevated"
                  }`}
                >
                  {selected ? "✓ " : ""}
                  {goal.label}
                </button>
              );
            })}
          </div>
        </section>

        {trainingType ===
        "Wasser" ? (
          <>
            <section className="mt-6 rounded-3xl border border-app-border bg-app-surface shadow-app">
              <div className="flex items-center justify-between border-b border-app-border p-5">
                <div>
                  <h2 className="text-lg font-semibold">
                    Warm Up am Land
                  </h2>

                  <p className="mt-1 text-sm text-app-muted">
                    Optional vor dem Wassertraining
                  </p>
                </div>

                <button
                  type="button"
                  onClick={
                    addWarmUpLandRow
                  }
                  className="rounded-xl border border-app-border px-4 py-2 text-sm hover:bg-app-elevated"
                >
                  + Übung
                </button>
              </div>

              <div className="overflow-x-auto p-5">
                <div className="min-w-[1050px]">
                  <div className="mb-2 grid grid-cols-[2fr_100px_130px_140px_140px_110px] gap-2 px-2 text-xs text-app-faint">
                    <div>Übung</div>
                    <div>Sätze</div>
                    <div>Wdh./Zeit</div>
                    <div>Material</div>
                    <div>Intensität</div>
                    <div></div>
                  </div>

                  <div className="space-y-2">
                    {warmUpLand.map(
                      (row) => (
                        <div
                          key={
                            row.id
                          }
                          className="grid grid-cols-[2fr_100px_130px_140px_140px_110px] gap-2 rounded-xl border border-app-border bg-app-bg p-2"
                        >
                          <input
                            value={
                              row.exercise
                            }
                            onChange={(
                              event
                            ) =>
                              updateWarmUpLand(
                                row.id,
                                "exercise",
                                event
                                  .target
                                  .value
                              )
                            }
                            placeholder="z. B. Mobilisation Schulter"
                            className="rounded-lg border border-app-border bg-app-surface px-3 py-2 text-sm"
                          />

                          <input
                            value={
                              row.sets
                            }
                            onChange={(
                              event
                            ) =>
                              updateWarmUpLand(
                                row.id,
                                "sets",
                                event
                                  .target
                                  .value
                              )
                            }
                            placeholder="2"
                            className="rounded-lg border border-app-border bg-app-surface px-3 py-2 text-sm"
                          />

                          <input
                            value={
                              row.repetitions
                            }
                            onChange={(
                              event
                            ) =>
                              updateWarmUpLand(
                                row.id,
                                "repetitions",
                                event
                                  .target
                                  .value
                              )
                            }
                            placeholder="10"
                            className="rounded-lg border border-app-border bg-app-surface px-3 py-2 text-sm"
                          />

                          <input
                            value={
                              row.material
                            }
                            onChange={(
                              event
                            ) =>
                              updateWarmUpLand(
                                row.id,
                                "material",
                                event
                                  .target
                                  .value
                              )
                            }
                            placeholder="Band"
                            className="rounded-lg border border-app-border bg-app-surface px-3 py-2 text-sm"
                          />

                          <input
                            value={
                              row.intensity
                            }
                            onChange={(
                              event
                            ) =>
                              updateWarmUpLand(
                                row.id,
                                "intensity",
                                event
                                  .target
                                  .value
                              )
                            }
                            placeholder="locker"
                            className="rounded-lg border border-app-border bg-app-surface px-3 py-2 text-sm"
                          />

                          <button
                            type="button"
                            onClick={() =>
                              removeWarmUpLandRow(
                                row.id
                              )
                            }
                            className="rounded-lg border border-app-bad/40 px-2 text-xs text-app-bad"
                          >
                            Löschen
                          </button>
                        </div>
                      )
                    )}
                  </div>
                </div>
              </div>
            </section>

            {waterSections.map(
              (section) => (
                <section
                  key={section.id}
                  className="mt-6 rounded-3xl border border-app-border bg-app-surface shadow-app"
                >
                  <div className="flex flex-col gap-3 border-b border-app-border p-5 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h2 className="text-xl font-semibold">
                        {
                          section.name
                        }
                      </h2>

                      <p className="mt-1 text-sm text-app-muted">
                        {getSectionMeters(
                          section
                        ).toLocaleString(
                          "de-DE"
                        )}{" "}
                        m
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <div
                        className="flex overflow-hidden rounded-xl border border-app-border"
                        role="group"
                        aria-label="Abschnitt kennzeichnen"
                      >
                        {(
                          [
                            "ueben",
                            "training",
                          ] as PracticeMode[]
                        ).map((mode) => (
                          <button
                            key={mode}
                            type="button"
                            title={
                              PRACTICE_MODE_HINT[
                                mode
                              ]
                            }
                            onClick={() =>
                              setSectionMode(
                                section.id,
                                mode
                              )
                            }
                            className={`px-3 py-2 text-xs transition ${
                              section.mode ===
                              mode
                                ? PRACTICE_MODE_CLASS[
                                    mode
                                  ]
                                : "text-app-muted hover:bg-app-elevated"
                            }`}
                          >
                            {
                              PRACTICE_MODE_LABEL[
                                mode
                              ]
                            }
                          </button>
                        ))}
                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          addWaterRow(
                            section.id
                          )
                        }
                        className="rounded-xl border border-app-border px-4 py-2 text-sm hover:bg-app-elevated"
                      >
                        + Serie
                      </button>
                    </div>
                  </div>

                  <div className="overflow-x-auto p-4">
                    <div className="min-w-[1500px]">
                      <div className="grid grid-cols-[80px_105px_2fr_140px_170px_130px_180px_110px_85px] gap-2 px-2 pb-2 text-xs font-medium text-app-faint">
                        <div>Wdh.</div>
                        <div>Distanz</div>
                        <div>
                          Aufgabe / Serie
                        </div>
                        <div>Lage</div>
                        <div>Material</div>
                        <div>Belastung</div>
                        <div>
                          Pause / Abgang
                        </div>
                        <div>Meter</div>
                        <div></div>
                      </div>

                      <div className="space-y-2">
                        {section.rows.map(
                          (row) => (
                            <div
                              key={
                                row.id
                              }
                              className="grid grid-cols-[80px_105px_2fr_140px_170px_130px_180px_110px_85px] gap-2 rounded-xl border border-app-border bg-app-bg p-2"
                            >
                              <input
                                type="number"
                                min="1"
                                value={
                                  row.repetitions
                                }
                                onChange={(
                                  event
                                ) =>
                                  updateWaterRow(
                                    section.id,
                                    row.id,
                                    "repetitions",
                                    Number(
                                      event
                                        .target
                                        .value
                                    )
                                  )
                                }
                                className="rounded-lg border border-app-border bg-app-surface px-2 py-2 text-sm"
                              />

                              <select
                                value={
                                  row.distance
                                }
                                onChange={(
                                  event
                                ) =>
                                  updateWaterRow(
                                    section.id,
                                    row.id,
                                    "distance",
                                    Number(
                                      event
                                        .target
                                        .value
                                    )
                                  )
                                }
                                className="rounded-lg border border-app-border bg-app-surface px-2 py-2 text-sm"
                              >
                                {distanceOptions.map(
                                  (
                                    distance
                                  ) => (
                                    <option
                                      key={
                                        distance
                                      }
                                      value={
                                        distance
                                      }
                                    >
                                      {
                                        distance
                                      }{" "}
                                      m
                                    </option>
                                  )
                                )}
                              </select>

                              <input
                                value={
                                  row.exercise
                                }
                                onChange={(
                                  event
                                ) =>
                                  updateWaterRow(
                                    section.id,
                                    row.id,
                                    "exercise",
                                    event
                                      .target
                                      .value
                                  )
                                }
                                placeholder="z. B. technisch sauber, lange Züge"
                                className="min-w-0 rounded-lg border border-app-border bg-app-surface px-3 py-2 text-sm"
                              />

                              <select
                                value={
                                  row.style
                                }
                                onChange={(
                                  event
                                ) =>
                                  updateWaterRow(
                                    section.id,
                                    row.id,
                                    "style",
                                    event
                                      .target
                                      .value
                                  )
                                }
                                className="rounded-lg border border-app-border bg-app-surface px-2 py-2 text-sm"
                              >
                                {styleOptions.map(
                                  (
                                    style
                                  ) => (
                                    <option
                                      key={
                                        style
                                      }
                                    >
                                      {
                                        style
                                      }
                                    </option>
                                  )
                                )}
                              </select>

                              <button
                                type="button"
                                onClick={() =>
                                  setMaterialPicker(
                                    {
                                      sectionId:
                                        section.id,
                                      rowId:
                                        row.id,
                                    }
                                  )
                                }
                                className={`rounded-lg border px-3 py-2 text-left text-xs transition ${
                                  row
                                    .materials
                                    .length >
                                  0
                                    ? "border-app-accent/40 bg-app-accent/10 text-app-accent"
                                    : "border-app-border bg-app-surface text-app-muted hover:bg-app-elevated"
                                }`}
                              >
                                {row
                                  .materials
                                  .length ===
                                0
                                  ? "Material wählen"
                                  : row
                                      .materials
                                      .length ===
                                    1
                                  ? row
                                      .materials[0]
                                  : `${row.materials.length} Materialien`}
                              </button>

                              <select
                                value={
                                  row.zone
                                }
                                onChange={(
                                  event
                                ) =>
                                  updateWaterRow(
                                    section.id,
                                    row.id,
                                    "zone",
                                    event
                                      .target
                                      .value
                                  )
                                }
                                className="rounded-lg border border-app-border bg-app-surface px-2 py-2 text-sm"
                              >
                                {zoneOptions.map(
                                  (
                                    zone
                                  ) => (
                                    <option
                                      key={
                                        zone
                                      }
                                    >
                                      {
                                        zone
                                      }
                                    </option>
                                  )
                                )}
                              </select>

                              <div className="flex gap-2">
                                <select
                                  value={
                                    row.intervalType
                                  }
                                  onChange={(
                                    event
                                  ) =>
                                    updateWaterRow(
                                      section.id,
                                      row.id,
                                      "intervalType",
                                      event
                                        .target
                                        .value as IntervalType
                                    )
                                  }
                                  className="w-16 rounded-lg border border-app-border bg-app-surface px-2 py-2 text-sm"
                                >
                                  <option value="P">
                                    P
                                  </option>

                                  <option value="@">
                                    @
                                  </option>
                                </select>

                                <input
                                  value={
                                    row.intervalTime
                                  }
                                  onChange={(
                                    event
                                  ) =>
                                    updateWaterRow(
                                      section.id,
                                      row.id,
                                      "intervalTime",
                                      event
                                        .target
                                        .value
                                    )
                                  }
                                  placeholder="30s / 1:30"
                                  className="min-w-0 flex-1 rounded-lg border border-app-border bg-app-surface px-2 py-2 text-sm"
                                />
                              </div>

                              <div className="flex items-center justify-center rounded-lg bg-app-surface px-2 text-sm font-semibold">
                                {(
                                  row.repetitions *
                                  row.distance
                                ).toLocaleString(
                                  "de-DE"
                                )}{" "}
                                m
                              </div>

                              <button
                                type="button"
                                onClick={() =>
                                  removeWaterRow(
                                    section.id,
                                    row.id
                                  )
                                }
                                className="rounded-lg border border-app-bad/40 px-2 text-xs text-app-bad hover:bg-app-bad/10"
                              >
                                Löschen
                              </button>
                            </div>
                          )
                        )}
                      </div>
                    </div>
                  </div>
                </section>
              )
            )}

            <section className="mt-6 flex flex-col gap-4 rounded-3xl border border-app-border bg-app-surface shadow-app p-6 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-sm text-app-muted">
                  Gesamtumfang Wassertraining
                </p>

                <p className="mt-2 text-4xl font-bold">
                  {totalWaterMeters.toLocaleString(
                    "de-DE"
                  )}{" "}
                  m
                </p>
              </div>

              <div className="rounded-xl border border-app-border bg-app-bg px-5 py-3">
                <p className="text-xs text-app-faint">
                  Becken
                </p>

                <p className="mt-1 font-semibold">
                  {poolLength} m
                </p>
              </div>
            </section>
          </>
        ) : (
          <section className="mt-6 rounded-3xl border border-app-border bg-app-surface shadow-app">
            <div className="flex items-center justify-between border-b border-app-border p-5">
              <div>
                <h2 className="text-xl font-semibold">
                  Landtraining
                </h2>

                <p className="mt-1 text-sm text-app-muted">
                  Kraft, Athletik und Stabilisation
                </p>
              </div>

              <button
                type="button"
                onClick={addLandRow}
                className="rounded-xl border border-app-border px-4 py-2 text-sm hover:bg-app-elevated"
              >
                + Übung
              </button>
            </div>

            <div className="overflow-x-auto p-5">
              <div className="min-w-[1200px]">
                <div className="mb-2 grid grid-cols-[2fr_100px_140px_130px_170px_140px_100px] gap-2 px-2 text-xs text-app-faint">
                  <div>Übung</div>
                  <div>Sätze</div>
                  <div>Wdh./Zeit</div>
                  <div>Gewicht</div>
                  <div>Material</div>
                  <div>Intensität</div>
                  <div></div>
                </div>

                <div className="space-y-2">
                  {landRows.map(
                    (row) => (
                      <div
                        key={row.id}
                        className="grid grid-cols-[2fr_100px_140px_130px_170px_140px_100px] gap-2 rounded-xl border border-app-border bg-app-bg p-2"
                      >
                        <input
                          value={
                            row.exercise
                          }
                          onChange={(
                            event
                          ) =>
                            updateLandRow(
                              row.id,
                              "exercise",
                              event
                                .target
                                .value
                            )
                          }
                          placeholder="Kniebeuge"
                          className="rounded-lg border border-app-border bg-app-surface px-3 py-2 text-sm"
                        />

                        <input
                          value={
                            row.sets
                          }
                          onChange={(
                            event
                          ) =>
                            updateLandRow(
                              row.id,
                              "sets",
                              event
                                .target
                                .value
                            )
                          }
                          placeholder="3"
                          className="rounded-lg border border-app-border bg-app-surface px-3 py-2 text-sm"
                        />

                        <input
                          value={
                            row.repetitions
                          }
                          onChange={(
                            event
                          ) =>
                            updateLandRow(
                              row.id,
                              "repetitions",
                              event
                                .target
                                .value
                            )
                          }
                          placeholder="8"
                          className="rounded-lg border border-app-border bg-app-surface px-3 py-2 text-sm"
                        />

                        <input
                          value={
                            row.weight
                          }
                          onChange={(
                            event
                          ) =>
                            updateLandRow(
                              row.id,
                              "weight",
                              event
                                .target
                                .value
                            )
                          }
                          placeholder="80 kg"
                          className="rounded-lg border border-app-border bg-app-surface px-3 py-2 text-sm"
                        />

                        <input
                          value={
                            row.material
                          }
                          onChange={(
                            event
                          ) =>
                            updateLandRow(
                              row.id,
                              "material",
                              event
                                .target
                                .value
                            )
                          }
                          placeholder="Langhantel"
                          className="rounded-lg border border-app-border bg-app-surface px-3 py-2 text-sm"
                        />

                        <input
                          value={
                            row.intensity
                          }
                          onChange={(
                            event
                          ) =>
                            updateLandRow(
                              row.id,
                              "intensity",
                              event
                                .target
                                .value
                            )
                          }
                          placeholder="RPE 7"
                          className="rounded-lg border border-app-border bg-app-surface px-3 py-2 text-sm"
                        />

                        <button
                          type="button"
                          onClick={() =>
                            removeLandRow(
                              row.id
                            )
                          }
                          className="rounded-lg border border-app-bad/40 px-2 text-xs text-app-bad"
                        >
                          Löschen
                        </button>
                      </div>
                    )
                  )}
                </div>
              </div>
            </div>
          </section>
        )}

        <section className="mt-8 flex flex-col gap-4 rounded-3xl border border-app-border bg-app-surface shadow-app p-5 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="font-semibold">
              {isEditing
                ? "Änderungen fertig?"
                : "Training fertig?"}
            </p>

            <p className="mt-1 text-sm text-app-muted">
              {isEditing
                ? "Beim Speichern wird die bestehende Trainingseinheit aktualisiert."
                : "Wasser- und Landtraining werden inklusive ihrer einzelnen Serien bzw. Übungen dauerhaft gespeichert."}
            </p>

            {/* Meldung auch hier unten anzeigen - oben sieht man sie beim Speichern nicht */}
            {message && (
              <p
                role="status"
                className={`mt-3 rounded-lg px-3 py-2 text-sm font-semibold ${
                  message.includes("✅") ? "bg-app-good/10 text-app-good" : "bg-app-bad/10 text-app-bad"
                }`}
              >
                {message}
              </p>
            )}
            {teams.length === 0 && !loadingTeams && (
              <p className="mt-3 text-sm text-app-bad">Kein Team gefunden – Speichern ist erst mit einem Team möglich.</p>
            )}
          </div>

          <div className="flex gap-3">
            <Link
              href="/coach/training"
              className="rounded-xl border border-app-border px-5 py-3 text-sm hover:bg-app-elevated"
            >
              Abbrechen
            </Link>

            <button
              type="button"
              onClick={
                handleSaveTraining
              }
              disabled={
                saving ||
                loadingTeams ||
                loadingTraining ||
                teams.length === 0
              }
              className="rounded-xl bg-app-accent px-5 py-3 text-sm font-medium text-app-accent-ink hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving
                ? "Wird gespeichert..."
                : isEditing
                ? "Änderungen speichern"
                : "Training speichern"}
            </button>
          </div>
        </section>
      </div>
    </main>
  );
}

export default function NewTrainingPage() {
  return (
    <Suspense
      fallback={
        <main>
          Trainingseditor wird geladen...
        </main>
      }
    >
      <TrainingEditor />
    </Suspense>
  );
}