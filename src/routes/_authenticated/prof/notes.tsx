import { ActivityIcon } from "@/components/eps/ActivityIcon";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Search, Trash2 } from "lucide-react";
import { toast } from "sonner";

import {
  listActivities,
  listStudentMarks,
  listTeacherStudents,
} from "@/lib/competencies.functions";
import { deleteStudentGrade, listStudentGrades, saveStudentGrade } from "@/lib/grades.functions";
import { DEFAULT_AFL_ITEMS, formatPoints, gradeTotals } from "@/lib/grades";
import { LevelHintPanel } from "@/components/eps/LevelHintPanel";
import { NumberField } from "@/components/eps/NumberField";
import { NumericButtons } from "@/components/eps/NumericButtons";


export const Route = createFileRoute("/_authenticated/prof/notes")({
  head: () => ({
    meta: [
      { title: "Attribuer les résultats — EPS Progress" },
      {
        name: "description",
        content:
          "Notez un élève sur une activité : sélectionnez sous AFL1, AFL2, AFL3 les compétences réellement évaluées, saisissez les points, le résultat global se calcule automatiquement.",
      },
      { property: "og:title", content: "Attribuer les résultats — EPS Progress" },
      {
        property: "og:description",
        content:
          "Saisie rapide des résultats AFL1, AFL2, AFL3 à partir des compétences déjà créées dans l'onglet Compétences.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: TeacherGrades,
});

type Score = { points: string; maxPoints: string };
/** Par AFL : compétences cochées et points saisis. */
type AflState = Record<string, Record<string, Score>>;

const AFL_LABELS = DEFAULT_AFL_ITEMS.map((item) => item.label);

function initialAflState(): AflState {
  return AFL_LABELS.reduce<AflState>((acc, label) => {
    acc[label] = {};
    return acc;
  }, {});
}

function defaultMax(afl: string): string {
  const found = DEFAULT_AFL_ITEMS.find((item) => item.label === afl);
  return String(found?.maxPoints ?? 5);
}

function TeacherGrades() {
  const queryClient = useQueryClient();
  const fetchStudents = useServerFn(listTeacherStudents);
  const fetchActivities = useServerFn(listActivities);
  const fetchGrades = useServerFn(listStudentGrades);
  const fetchMarks = useServerFn(listStudentMarks);
  const saveGrade = useServerFn(saveStudentGrade);
  const removeGrade = useServerFn(deleteStudentGrade);

  const [query, setQuery] = useState("");
  const [selectedClass, setSelectedClass] = useState<string | null>(null);
  const [studentId, setStudentId] = useState<string | null>(null);
  const [activityId, setActivityId] = useState("");
  const [afl, setAfl] = useState<AflState>(initialAflState);
  const [activeAfl, setActiveAfl] = useState<string>(AFL_LABELS[0] ?? "AFL1");
  const [comment, setComment] = useState("");
  const [saving, setSaving] = useState(false);
  /** Dernière compétence saisie : alimente le panneau de niveau à droite. */
  const [focused, setFocused] = useState<{ afl: string; competencyId: string } | null>(null);

  const students = useQuery({ queryKey: ["teacher-students"], queryFn: () => fetchStudents() });
  const activities = useQuery({ queryKey: ["activities"], queryFn: () => fetchActivities() });
  const grades = useQuery({
    queryKey: ["student-grades", studentId],
    queryFn: () => fetchGrades({ data: { studentId: studentId! } }),
    enabled: Boolean(studentId),
  });
  /** Niveaux réellement attribués dans « Évaluer compétences » (source de vérité). */
  const marks = useQuery({
    queryKey: ["student-marks", studentId],
    queryFn: () => fetchMarks({ data: { studentId: studentId! } }),
    enabled: Boolean(studentId),
  });

  const student = (students.data ?? []).find((row) => row.id === studentId) ?? null;
  const activity = (activities.data ?? []).find((row) => row.id === activityId) ?? null;
  const competencies = activity?.competencies ?? [];
  /** Compétences classées dans l'AFL actif (catégorie choisie à la création). */
  const aflCompetencies = competencies.filter((competency) => competency.afl === activeAfl);

  const classNames = useMemo(() => {
    const set = new Set<string>();
    for (const row of students.data ?? []) {
      for (const name of row.class_names) set.add(name);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b, "fr"));
  }, [students.data]);

  useEffect(() => {
    if (selectedClass) return;
    const first = classNames[0];
    if (first) setSelectedClass(first);
  }, [classNames, selectedClass]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    let rows = students.data ?? [];
    if (selectedClass) {
      rows = rows.filter((row) => row.class_names.includes(selectedClass));
    }
    if (!needle) return rows.slice(0, 80);
    return rows
      .filter((row) =>
        `${row.first_name} ${row.last_name} ${row.student_code}`.toLowerCase().includes(needle),
      )
      .slice(0, 80);
  }, [query, selectedClass, students.data]);

  const flatItems = useMemo(
    () =>
      AFL_LABELS.flatMap((label) =>
        Object.entries(afl[label] ?? {}).map(([competencyId, score]) => ({
          label,
          competencyId,
          points: Number(score.points.replace(",", ".")) || 0,
          maxPoints: Number(score.maxPoints.replace(",", ".")) || 0,
        })),
      ),
    [afl],
  );

  const totals = gradeTotals(
    flatItems.map((item) => ({ points: item.points, max_points: item.maxPoints })),
  );

  /** Ligne active du panneau de niveau : dernière saisie, sinon première compétence cochée. */
  const focusedEntry = useMemo(() => {
    if (focused) {
      const score = afl[focused.afl]?.[focused.competencyId];
      if (score) {
        return {
          afl: focused.afl,
          competencyId: focused.competencyId,
          points: Number(score.points.replace(",", ".")) || 0,
          maxPoints: Number(score.maxPoints.replace(",", ".")) || 0,
        };
      }
    }
    const first = flatItems[0];
    if (!first) return null;
    return {
      afl: first.label,
      competencyId: first.competencyId,
      points: first.points,
      maxPoints: first.maxPoints,
    };
  }, [afl, flatItems, focused]);

  const focusedCompetency =
    competencies.find((row) => row.id === focusedEntry?.competencyId) ?? null;

  const focusedAssignedLevelId =
    (marks.data ?? []).find((mark) => mark.competency_id === focusedCompetency?.id)?.level_id ??
    null;

  function toggleCompetency(aflLabel: string, competencyId: string) {
    setAfl((current) => {
      const group = { ...(current[aflLabel] ?? {}) };
      if (group[competencyId]) delete group[competencyId];
      else group[competencyId] = { points: "0", maxPoints: defaultMax(aflLabel) };
      return { ...current, [aflLabel]: group };
    });
    setFocused({ afl: aflLabel, competencyId });
  }

  function patchScore(aflLabel: string, competencyId: string, patch: Partial<Score>) {
    setFocused({ afl: aflLabel, competencyId });
    setAfl((current) => {
      const group = current[aflLabel] ?? {};
      const score = group[competencyId];
      if (!score) return current;
      return { ...current, [aflLabel]: { ...group, [competencyId]: { ...score, ...patch } } };
    });
  }

  function resetForm() {
    setActivityId("");
    setAfl(initialAflState());
    setComment("");
  }

  async function handleSave() {
    if (!studentId) {
      toast.error("Sélectionne un élève.");
      return;
    }
    if (!activityId) {
      toast.error("Sélectionne une activité.");
      return;
    }
    if (flatItems.length === 0) {
      toast.error("Coche au moins une compétence évaluée sous un AFL.");
      return;
    }
    if (flatItems.length > 10) {
      toast.error("10 compétences évaluées maximum par activité.");
      return;
    }

    setSaving(true);
    try {
      await saveGrade({
        data: {
          studentIds: [studentId],
          activityId,
          comment: comment.trim() || null,
          evaluatedOn: null,
          items: flatItems,
        },
      });
      toast.success("Résultat enregistré");
      await queryClient.invalidateQueries({ queryKey: ["student-grades", studentId] });
      resetForm();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Enregistrement impossible");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    try {
      await removeGrade({ data: { id } });
      await queryClient.invalidateQueries({ queryKey: ["student-grades", studentId] });
      toast.success("Résultat supprimé");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Suppression impossible");
    }
  }

  const activeGroup = afl[activeAfl] ?? {};

  return (
    <div className="space-y-8 p-6 lg:p-10">
      <header className="space-y-1">
        <h1 className="display-title text-3xl italic tracking-tighter">Résultats</h1>
        <p className="text-sm text-muted-foreground">
          Élève → activité → AFL1 / AFL2 / AFL3 → coche les compétences évaluées (créées dans
          « Compétences ») → points. Le total se calcule automatiquement.
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[300px_1fr] xl:grid-cols-[300px_1fr_320px]">
        {/* Élèves */}
        <section className="space-y-3 rounded-2xl border border-border bg-surface p-5">
          <h2 className="mono-label text-muted-foreground">1 · Classe puis élève</h2>

          <div
            role="tablist"
            aria-label="Classes"
            className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1"
          >
            {classNames.map((name) => (
              <button
                key={name}
                type="button"
                role="tab"
                aria-selected={selectedClass === name}
                onClick={() => setSelectedClass(name)}
                className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                  selectedClass === name
                    ? "bg-primary text-primary-foreground"
                    : "border border-border bg-background text-muted-foreground hover:bg-accent"
                }`}
              >
                {name}
              </button>
            ))}
            {classNames.length === 0 && (
              <span className="py-1.5 text-xs text-muted-foreground">Aucune classe</span>
            )}
          </div>

          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Rechercher un élève"
              aria-label="Rechercher un élève"
              className="w-full rounded-xl border border-border bg-background py-2 pl-9 pr-3 text-sm outline-none focus:border-primary"
            />
          </div>

          <p className="mono-label text-muted-foreground">
            {filtered.length} élève{filtered.length > 1 ? "s" : ""}
          </p>

          <ul className="max-h-72 space-y-1 overflow-y-auto">
            {filtered.map((row) => (
              <li key={row.id}>
                <button
                  type="button"
                  onClick={() => setStudentId(row.id)}
                  className={`w-full rounded-xl px-3 py-2 text-left text-sm transition-colors ${
                    studentId === row.id
                      ? "bg-primary font-bold text-primary-foreground"
                      : "hover:bg-accent"
                  }`}
                >
                  {row.first_name} {row.last_name}
                  <span className="ml-2 text-[10px] uppercase opacity-70">
                    {row.class_names[0] ?? "sans classe"}
                  </span>
                </button>
              </li>
            ))}
            {filtered.length === 0 && (
              <li className="px-1 py-2 text-sm text-muted-foreground">Aucun élève trouvé.</li>
            )}
          </ul>
        </section>

        {/* Saisie */}
        <section className="space-y-6">
          {!student ? (
            <div className="rounded-2xl border border-border/60 bg-surface/60 px-5 py-8 text-sm text-muted-foreground">
              Sélectionne un élève pour saisir une note.
            </div>
          ) : (
            <>
              <div className="space-y-5 rounded-2xl border border-border bg-surface p-5">
                <div className="flex flex-wrap items-baseline justify-between gap-3">
                  <h2 className="text-lg font-semibold">
                    Évaluation de {student.first_name} {student.last_name}
                  </h2>
                  <p className="display-title text-3xl text-primary">
                    {formatPoints(totals.points)} / {formatPoints(totals.max)}
                    {totals.max > 0 && (
                      <span className="ml-2 text-sm font-normal text-muted-foreground">
                        {((totals.points / totals.max) * 100).toLocaleString("fr-FR", {
                          maximumFractionDigits: 1,
                        })}{" "}
                        %
                      </span>
                    )}
                  </p>
                </div>

                <label className="block space-y-1">
                  <span className="mono-label text-muted-foreground">Activité</span>
                  <select
                    value={activityId}
                    onChange={(event) => {
                      setActivityId(event.target.value);
                      setAfl(initialAflState());
                    }}
                    className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                  >
                    <option value="">Choisir une activité…</option>
                    {(activities.data ?? []).map((row) => (
                      <option key={row.id} value={row.id}>
                        {row.name}
                      </option>
                    ))}
                  </select>
                </label>

                {activityId && competencies.length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    Cette activité n'a pas encore de compétence enregistrée. Crée-les dans l'onglet
                    « Compétences » (ou « Activités & compétences ») : elles apparaîtront ensuite
                    ici.
                  </p>
                )}

                {activityId && competencies.length > 0 && (
                  <div className="space-y-4">
                    <div
                      role="tablist"
                      aria-label="AFL"
                      className="flex gap-2 rounded-xl border border-border bg-background p-1"
                    >
                      {AFL_LABELS.map((label) => {
                        const count = Object.keys(afl[label] ?? {}).length;
                        return (
                          <button
                            key={label}
                            type="button"
                            role="tab"
                            aria-selected={activeAfl === label}
                            onClick={() => setActiveAfl(label)}
                            className={`flex-1 rounded-lg px-3 py-2 font-mono text-xs uppercase tracking-tight transition-colors ${
                              activeAfl === label
                                ? "bg-primary font-bold text-primary-foreground"
                                : "text-muted-foreground hover:bg-accent"
                            }`}
                          >
                            {label}
                            {count > 0 && <span className="ml-1 opacity-80">({count})</span>}
                          </button>
                        );
                      })}
                    </div>

                    <div className="space-y-3 rounded-xl border border-border/70 bg-background p-4">
                      <p className="mono-label text-muted-foreground">
                        Compétences évaluées dans {activeAfl}
                      </p>
                      <ul className="space-y-2">
                        {aflCompetencies.map((competency) => {
                          const score = activeGroup[competency.id];
                          const checked = Boolean(score);
                          return (
                            <li
                              key={competency.id}
                              className={`rounded-lg border px-3 py-2 transition-colors ${
                                checked ? "border-primary/60 bg-surface" : "border-border/60"
                              }`}
                            >
                              <label className="flex cursor-pointer items-center gap-3 text-sm">
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  onChange={() => toggleCompetency(activeAfl, competency.id)}
                                  className="size-4 accent-primary"
                                />
                                <span className={checked ? "font-semibold" : ""}>
                                  {competency.label}
                                </span>
                              </label>

                              {score && (
                                <div className="mt-3 flex flex-wrap items-end gap-5 pl-7">
                                  <div className="space-y-1">
                                    <span className="text-xs text-muted-foreground">
                                      Points obtenus
                                    </span>
                                    <NumericButtons
                                      value={score.points}
                                      max={Number(score.maxPoints.replace(",", ".")) || 20}
                                      step={1}
                                      onValueChange={(points: string) =>
                                        patchScore(activeAfl, competency.id, { points })
                                      }
                                      aria-label={`Points ${activeAfl} — ${competency.label}`}
                                    />
                                  </div>
                                  <label className="block space-y-1">
                                    <span className="text-xs text-muted-foreground">Barème</span>
                                    <NumberField
                                      value={score.maxPoints}
                                      min={1}
                                      max={100}
                                      step={1}
                                      onValueChange={(maxPoints) =>
                                        patchScore(activeAfl, competency.id, { maxPoints })
                                      }
                                      aria-label={`Barème ${activeAfl} — ${competency.label}`}
                                      className="w-24 rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                                    />
                                  </label>
                                </div>
                              )}

                            </li>
                          );
                        })}
                      </ul>
                      {aflCompetencies.length === 0 && (
                        <p className="text-xs text-muted-foreground">
                          Aucune compétence classée dans {activeAfl} pour cette activité. Choisis la
                          catégorie AFL de tes compétences dans Activités &amp; compétences.
                        </p>
                      )}
                      {aflCompetencies.length > 0 && Object.keys(activeGroup).length === 0 && (
                        <p className="text-xs text-muted-foreground">
                          Coche les compétences réellement évaluées dans {activeAfl}.
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {activityId && competencies.length > 0 && (
                  <>
                    <label className="block space-y-1">
                      <span className="mono-label text-muted-foreground">
                        Commentaire (optionnel)
                      </span>
                      <textarea
                        value={comment}
                        onChange={(event) => setComment(event.target.value)}
                        rows={2}
                        className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                      />
                    </label>
                    <button
                      type="button"
                      onClick={() => void handleSave()}
                      disabled={saving}
                      className="w-full rounded-xl bg-primary px-4 py-3 text-sm font-bold uppercase text-primary-foreground disabled:opacity-60"
                    >
                      {saving ? "Enregistrement…" : "Enregistrer la note"}
                    </button>
                  </>
                )}
              </div>

              {/* Historique */}
              <div className="space-y-3">
                <h2 className="mono-label text-muted-foreground">Résultats déjà enregistrés</h2>
                {grades.isPending ? (
                  <div className="h-20 animate-pulse rounded-2xl border border-border bg-surface" />
                ) : (grades.data ?? []).length === 0 ? (
                  <p className="rounded-2xl border border-border/60 bg-surface/60 px-5 py-4 text-sm text-muted-foreground">
                    Aucune note pour cet élève.
                  </p>
                ) : (
                  <ul className="space-y-3">
                    {(grades.data ?? []).map((grade) => {
                      const rowTotals = gradeTotals(grade.items);
                      return (
                        <li
                          key={grade.id}
                          className="rounded-2xl border border-border bg-surface p-5"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <p className="flex items-center gap-2 font-semibold">
                              <ActivityIcon name={grade.activity_name} className="size-4 text-primary" />
                              {grade.activity_name}
                            </p>
                            <div className="flex items-center gap-3">
                              <span className="display-title text-xl text-primary">
                                {formatPoints(rowTotals.points)} / {formatPoints(rowTotals.max)}
                              </span>
                              <button
                                type="button"
                                onClick={() => void handleDelete(grade.id)}
                                aria-label={`Supprimer le résultat de ${grade.activity_name}`}
                                className="text-muted-foreground hover:text-destructive"
                              >
                                <Trash2 className="size-4" />
                              </button>
                            </div>
                          </div>
                          <ul className="mt-3 space-y-1 text-sm">
                            {grade.items.map((item) => (
                              <li key={item.id} className="flex justify-between gap-3">
                                <span className="text-muted-foreground">
                                  <span className="font-mono text-xs uppercase text-primary">
                                    {item.label}
                                  </span>{" "}
                                  {item.competency_label ?? "—"}
                                </span>
                                <span className="shrink-0 font-medium">
                                  {formatPoints(item.points)} / {formatPoints(item.max_points)}
                                </span>
                              </li>
                            ))}
                          </ul>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </>
          )}
        </section>

        {student && activityId && (
          <LevelHintPanel
            studentName={`${student.first_name} ${student.last_name}`}
            competency={focusedCompetency}
            activityName={activity?.name ?? null}
            assignedLevelId={focusedAssignedLevelId}
            aflLabel={focusedEntry?.afl ?? null}
            points={focusedEntry?.points ?? 0}
            maxPoints={focusedEntry?.maxPoints ?? 0}
          />
        )}
      </div>
    </div>
  );
}
