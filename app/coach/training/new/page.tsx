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
};

type ExistingSection = {
  id: string;
  section_key: string;
  section_name: string;
  sort_order: number;
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
      rows: [createWaterRow(1)],
    },
    {
      id: "technik",
      name: "Technik",
      rows: [createWaterRow(2)],
    },
    {
      id: "hauptblock",
      name: "Hauptblock",
      rows: [createWaterRow(3)],
    },
    {
      id: "ausschwimmen",
      name: "Ausschwimmen",
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

  useEffect(() => {
    loadTeams();
  }, []);

  useEffect(() => {
    if (sessionFromUrl) {
      loadExistingTraining(sessionFromUrl);
    }
  }, [sessionFromUrl]);

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
          focus
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
          sort_order
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

    setSaving(false);
  }

  const hasPlanningContext =
    weekFromUrl ||
    dayFromUrl ||
    mesoFromUrl;

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      {materialPicker &&
        selectedMaterialRow && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4">
            <div className="w-full max-w-xl rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl">
              <div className="flex items-start justify-between border-b border-slate-800 p-5">
                <div>
                  <h2 className="text-xl font-semibold">
                    Material auswählen
                  </h2>

                  <p className="mt-1 text-sm text-slate-400">
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
                  className="rounded-lg border border-slate-700 px-3 py-2 text-sm hover:bg-slate-800"
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
                              ? "border-white bg-white text-slate-950"
                              : "border-slate-700 bg-slate-950 text-white hover:bg-slate-800"
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
                  <div className="mt-5 rounded-xl border border-slate-800 bg-slate-950 p-4">
                    <p className="text-xs text-slate-500">
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
                            className="rounded-full bg-slate-800 px-3 py-1 text-xs"
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
                    className="rounded-xl border border-slate-700 px-4 py-3 text-sm hover:bg-slate-800"
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
                    className="rounded-xl bg-white px-5 py-3 text-sm font-medium text-slate-950 hover:bg-slate-200"
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
              className="text-sm text-slate-400 hover:text-white"
            >
              ← Zurück zur Woche
            </Link>
          ) : (
            <Link
              href="/coach/training"
              className="text-sm text-slate-400 hover:text-white"
            >
              ← Zurück zur Trainingsübersicht
            </Link>
          )}
        </div>

        <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-sm text-slate-400">
              Trainingsplanung
            </p>

            <h1 className="mt-1 text-3xl font-bold">
              {isEditing
                ? "Training bearbeiten"
                : "Training erstellen"}
            </h1>

            <p className="mt-2 text-slate-400">
              {isEditing
                ? "Gespeicherte Trainingseinheit bearbeiten."
                : "Wasser- oder Landtraining planen."}
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/coach/training/season"
              className="rounded-xl border border-slate-700 px-4 py-3 text-sm hover:bg-slate-800"
            >
              Jahresplanung
            </Link>

            <Link
              href="/coach/training"
              className="rounded-xl border border-slate-700 px-4 py-3 text-sm hover:bg-slate-800"
            >
              Trainingsübersicht
            </Link>
          </div>
        </div>

        {loadingTraining && (
          <div className="mt-6 rounded-xl border border-slate-700 bg-slate-900 p-4 text-sm text-slate-300">
            Training wird geladen...
          </div>
        )}

        {message && (
          <div className="mt-6 rounded-xl border border-slate-700 bg-slate-900 p-4 text-sm text-slate-300">
            {message}
          </div>
        )}

        {hasPlanningContext && (
          <section className="mt-6 rounded-2xl border border-blue-900 bg-blue-950/30 p-5">
            <p className="text-xs font-medium uppercase tracking-wide text-blue-400">
              Zugeordnet zur Trainingsplanung
            </p>

            <div className="mt-4 flex flex-wrap gap-3">
              {mesoFromUrl && (
                <div className="rounded-xl border border-blue-900 bg-slate-950 px-4 py-3">
                  <p className="text-xs text-slate-500">
                    Mesozyklus
                  </p>

                  <p className="mt-1 font-semibold">
                    Meso {mesoFromUrl}
                  </p>
                </div>
              )}

              {weekFromUrl && (
                <div className="rounded-xl border border-blue-900 bg-slate-950 px-4 py-3">
                  <p className="text-xs text-slate-500">
                    Mikrozyklus
                  </p>

                  <p className="mt-1 font-semibold">
                    Woche {weekFromUrl}
                  </p>
                </div>
              )}

              {date && (
                <div className="rounded-xl border border-blue-900 bg-slate-950 px-4 py-3">
                  <p className="text-xs text-slate-500">
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

        <section className="mt-6 rounded-2xl border border-slate-800 bg-slate-900">
          <div className="border-b border-slate-800 p-5">
            <h2 className="text-xl font-semibold">
              Trainingsdaten
            </h2>
          </div>

          <div className="grid gap-5 p-5 md:grid-cols-2 xl:grid-cols-6">
            <div className="xl:col-span-2">
              <label className="mb-2 block text-sm text-slate-400">
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
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm text-slate-400">
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
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm text-slate-400">
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
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm text-slate-400">
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
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm text-slate-400">
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
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none disabled:opacity-60"
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

            <div className="md:col-span-2 xl:col-span-6">
              <label className="mb-2 block text-sm text-slate-400">
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
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none"
              />
            </div>
          </div>
        </section>

        <section className="mt-6 rounded-2xl border border-slate-800 bg-slate-900 p-5">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm text-slate-400">
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
                      ? "bg-white text-slate-950"
                      : "border border-slate-700 hover:bg-slate-800"
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
                      ? "bg-white text-slate-950"
                      : "border border-slate-700 hover:bg-slate-800"
                  }`}
                >
                  Landtraining
                </button>
              </div>
            </div>

            {trainingType ===
              "Wasser" && (
              <div>
                <p className="mb-2 text-sm text-slate-400">
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
                        ? "bg-white text-slate-950"
                        : "border border-slate-700"
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
                        ? "bg-white text-slate-950"
                        : "border border-slate-700"
                    }`}
                  >
                    50 m
                  </button>
                </div>
              </div>
            )}
          </div>
        </section>

        {trainingType ===
        "Wasser" ? (
          <>
            <section className="mt-6 rounded-2xl border border-slate-800 bg-slate-900">
              <div className="flex items-center justify-between border-b border-slate-800 p-5">
                <div>
                  <h2 className="text-lg font-semibold">
                    Warm Up am Land
                  </h2>

                  <p className="mt-1 text-sm text-slate-400">
                    Optional vor dem Wassertraining
                  </p>
                </div>

                <button
                  type="button"
                  onClick={
                    addWarmUpLandRow
                  }
                  className="rounded-xl border border-slate-700 px-4 py-2 text-sm hover:bg-slate-800"
                >
                  + Übung
                </button>
              </div>

              <div className="overflow-x-auto p-5">
                <div className="min-w-[1050px]">
                  <div className="mb-2 grid grid-cols-[2fr_100px_130px_140px_140px_110px] gap-2 px-2 text-xs text-slate-500">
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
                          className="grid grid-cols-[2fr_100px_130px_140px_140px_110px] gap-2 rounded-xl border border-slate-800 bg-slate-950 p-2"
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
                            className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm"
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
                            className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm"
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
                            className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm"
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
                            className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm"
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
                            className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm"
                          />

                          <button
                            type="button"
                            onClick={() =>
                              removeWarmUpLandRow(
                                row.id
                              )
                            }
                            className="rounded-lg border border-red-900 px-2 text-xs text-red-400"
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
                  className="mt-6 rounded-2xl border border-slate-800 bg-slate-900"
                >
                  <div className="flex flex-col gap-3 border-b border-slate-800 p-5 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h2 className="text-xl font-semibold">
                        {
                          section.name
                        }
                      </h2>

                      <p className="mt-1 text-sm text-slate-400">
                        {getSectionMeters(
                          section
                        ).toLocaleString(
                          "de-DE"
                        )}{" "}
                        m
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        addWaterRow(
                          section.id
                        )
                      }
                      className="rounded-xl border border-slate-700 px-4 py-2 text-sm hover:bg-slate-800"
                    >
                      + Serie
                    </button>
                  </div>

                  <div className="overflow-x-auto p-4">
                    <div className="min-w-[1500px]">
                      <div className="grid grid-cols-[80px_105px_2fr_140px_170px_130px_180px_110px_85px] gap-2 px-2 pb-2 text-xs font-medium text-slate-500">
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
                              className="grid grid-cols-[80px_105px_2fr_140px_170px_130px_180px_110px_85px] gap-2 rounded-xl border border-slate-800 bg-slate-950 p-2"
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
                                className="rounded-lg border border-slate-700 bg-slate-900 px-2 py-2 text-sm"
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
                                className="rounded-lg border border-slate-700 bg-slate-900 px-2 py-2 text-sm"
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
                                className="min-w-0 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm"
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
                                className="rounded-lg border border-slate-700 bg-slate-900 px-2 py-2 text-sm"
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
                                    ? "border-blue-700 bg-blue-950 text-blue-200"
                                    : "border-slate-700 bg-slate-900 text-slate-400 hover:bg-slate-800"
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
                                className="rounded-lg border border-slate-700 bg-slate-900 px-2 py-2 text-sm"
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
                                  className="w-16 rounded-lg border border-slate-700 bg-slate-900 px-2 py-2 text-sm"
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
                                  className="min-w-0 flex-1 rounded-lg border border-slate-700 bg-slate-900 px-2 py-2 text-sm"
                                />
                              </div>

                              <div className="flex items-center justify-center rounded-lg bg-slate-900 px-2 text-sm font-semibold">
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
                                className="rounded-lg border border-red-900 px-2 text-xs text-red-400 hover:bg-red-950"
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

            <section className="mt-6 flex flex-col gap-4 rounded-2xl border border-slate-700 bg-slate-900 p-6 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-sm text-slate-400">
                  Gesamtumfang Wassertraining
                </p>

                <p className="mt-2 text-4xl font-bold">
                  {totalWaterMeters.toLocaleString(
                    "de-DE"
                  )}{" "}
                  m
                </p>
              </div>

              <div className="rounded-xl border border-slate-700 bg-slate-950 px-5 py-3">
                <p className="text-xs text-slate-500">
                  Becken
                </p>

                <p className="mt-1 font-semibold">
                  {poolLength} m
                </p>
              </div>
            </section>
          </>
        ) : (
          <section className="mt-6 rounded-2xl border border-slate-800 bg-slate-900">
            <div className="flex items-center justify-between border-b border-slate-800 p-5">
              <div>
                <h2 className="text-xl font-semibold">
                  Landtraining
                </h2>

                <p className="mt-1 text-sm text-slate-400">
                  Kraft, Athletik und Stabilisation
                </p>
              </div>

              <button
                type="button"
                onClick={addLandRow}
                className="rounded-xl border border-slate-700 px-4 py-2 text-sm hover:bg-slate-800"
              >
                + Übung
              </button>
            </div>

            <div className="overflow-x-auto p-5">
              <div className="min-w-[1200px]">
                <div className="mb-2 grid grid-cols-[2fr_100px_140px_130px_170px_140px_100px] gap-2 px-2 text-xs text-slate-500">
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
                        className="grid grid-cols-[2fr_100px_140px_130px_170px_140px_100px] gap-2 rounded-xl border border-slate-800 bg-slate-950 p-2"
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
                          className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm"
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
                          className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm"
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
                          className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm"
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
                          className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm"
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
                          className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm"
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
                          className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm"
                        />

                        <button
                          type="button"
                          onClick={() =>
                            removeLandRow(
                              row.id
                            )
                          }
                          className="rounded-lg border border-red-900 px-2 text-xs text-red-400"
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

        <section className="mt-8 flex flex-col gap-4 rounded-2xl border border-slate-800 bg-slate-900 p-5 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="font-semibold">
              {isEditing
                ? "Änderungen fertig?"
                : "Training fertig?"}
            </p>

            <p className="mt-1 text-sm text-slate-400">
              {isEditing
                ? "Beim Speichern wird die bestehende Trainingseinheit aktualisiert."
                : "Wasser- und Landtraining werden inklusive ihrer einzelnen Serien bzw. Übungen dauerhaft gespeichert."}
            </p>
          </div>

          <div className="flex gap-3">
            <Link
              href="/coach/training"
              className="rounded-xl border border-slate-700 px-5 py-3 text-sm hover:bg-slate-800"
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
              className="rounded-xl bg-white px-5 py-3 text-sm font-medium text-slate-950 hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-50"
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
        <main className="min-h-screen bg-slate-950 p-8 text-white">
          Trainingseditor wird geladen...
        </main>
      }
    >
      <TrainingEditor />
    </Suspense>
  );
}