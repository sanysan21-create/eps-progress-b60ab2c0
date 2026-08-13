import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Plus, Search, Trash2, X } from "lucide-react";
import { toast } from "sonner";

import { listActivities, listTeacherStudents } from "@/lib/competencies.functions";
import { deleteStudentGrade, listStudentGrades, saveStudentGrade } from "@/lib/grades.functions";
import { DEFAULT_AFL_ITEMS, formatPoints, gradeTotals } from "@/lib/grades";
import { activityEmoji } from "@/lib/activity-emoji";

export const Route = createFileRoute("/_authenticated/prof/notes")({
  head: () => ({
    meta: [
      { title: "Attribuer les notes — EPS Progress" },
      {
        name: "description",
        content:
          "Notez un élève sur une activité : choisissez la compétence de chaque AFL, saisissez les points, la note globale se calcule automatiquement.",
      },
      { property: "og:title", content: "Attribuer les notes — EPS Progress" },
      {
        property: "og:description",
        content: "Saisie rapide des notes AFL1, AFL2, AFL3 avec barème personnalisable.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: TeacherGrades,
});

type FormItem = {
  label: string;
  competencyId: string | null;
  points: string;
  maxPoints: string;
};

function initialItems(): FormItem[] {
  return DEFAULT_AFL_ITEMS.map((item) => ({
    label: item.label,
    competencyId: null,
    points: "0",
    maxPoints: String(item.maxPoints),
  }));
}

function TeacherGrades() {
  const queryClient = useQueryClient();
  const fetchStudents = useServerFn(listTeacherStudents);
  const fetchActivities = useServerFn(listActivities);
  const fetchGrades = useServerFn(listStudentGrades);
  const saveGrade = useServerFn(saveStudentGrade);
  const removeGrade = useServerFn(deleteStudentGrade);

  const [query, setQuery] = useState("");
  const [studentId, setStudentId] = useState<string | null>(null);
  const [activityId, setActivityId] = useState("");
  const [items, setItems] = useState<FormItem[]>(initialItems);
  const [comment, setComment] = useState("");
  const [saving, setSaving] = useState(false);

  const students = useQuery({ queryKey: ["teacher-students"], queryFn: () => fetchStudents() });
  const activities = useQuery({ queryKey: ["activities"], queryFn: () => fetchActivities() });
  const grades = useQuery({
    queryKey: ["student-grades", studentId],
    queryFn: () => fetchGrades({ data: { studentId: studentId! } }),
    enabled: Boolean(studentId),
  });

  const student = (students.data ?? []).find((row) => row.id === studentId) ?? null;
  const activity = (activities.data ?? []).find((row) => row.id === activityId) ?? null;
  const competencies = activity?.competencies ?? [];

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const rows = students.data ?? [];
    if (!needle) return rows.slice(0, 40);
    return rows
      .filter((row) =>
        `${row.first_name} ${row.last_name} ${row.student_code}`.toLowerCase().includes(needle),
      )
      .slice(0, 40);
  }, [query, students.data]);

  const totals = gradeTotals(
    items.map((item) => ({
      points: Number(item.points.replace(",", ".")) || 0,
      max_points: Number(item.maxPoints.replace(",", ".")) || 0,
    })),
  );

  function patchItem(index: number, patch: Partial<FormItem>) {
    setItems((current) =>
      current.map((item, i) => (i === index ? { ...item, ...patch } : item)),
    );
  }

  function resetForm() {
    setActivityId("");
    setItems(initialItems());
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

    setSaving(true);
    try {
      await saveGrade({
        data: {
          studentIds: [studentId],
          activityId,
          comment: comment.trim() || null,
          evaluatedOn: null,
          items: items.map((item) => ({
            label: item.label.trim() || "AFL",
            competencyId: item.competencyId,
            points: Number(item.points.replace(",", ".")) || 0,
            maxPoints: Number(item.maxPoints.replace(",", ".")) || 0,
          })),
        },
      });
      toast.success("Note enregistrée");
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
      toast.success("Note supprimée");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Suppression impossible");
    }
  }

  return (
    <div className="space-y-8 p-6 lg:p-10">
      <header className="space-y-1">
        <h1 className="display-title text-3xl italic tracking-tighter">Notes</h1>
        <p className="text-sm text-muted-foreground">
          Élève → activité → AFL1 / AFL2 / AFL3 → points → enregistrer. Le total se calcule
          automatiquement.
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        {/* Élèves */}
        <section className="space-y-3 rounded-2xl border border-border bg-surface p-5">
          <h2 className="mono-label text-muted-foreground">1 · Élève</h2>
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
                    {totals.percent !== null && (
                      <span className="ml-2 text-sm font-normal text-muted-foreground">
                        {totals.percent} %
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
                      setItems((current) =>
                        current.map((item) => ({ ...item, competencyId: null })),
                      );
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
                    Cette activité n'a pas encore de compétence cible. Ajoute-les dans « Activités
                    & compétences ».
                  </p>
                )}

                {activityId && (
                  <ul className="space-y-4">
                    {items.map((item, index) => (
                      <li
                        key={index}
                        className="space-y-3 rounded-xl border border-border/70 bg-background p-4"
                      >
                        <div className="flex items-center gap-2">
                          <input
                            value={item.label}
                            onChange={(event) => patchItem(index, { label: event.target.value })}
                            aria-label={`Intitulé de l'AFL ${index + 1}`}
                            className="w-24 rounded-lg border border-border bg-surface px-2 py-1 font-mono text-xs uppercase tracking-tight text-primary outline-none focus:border-primary"
                          />
                          {items.length > 1 && (
                            <button
                              type="button"
                              onClick={() =>
                                setItems((current) => current.filter((_, i) => i !== index))
                              }
                              aria-label={`Supprimer ${item.label}`}
                              className="ml-auto text-muted-foreground hover:text-destructive"
                            >
                              <X className="size-4" />
                            </button>
                          )}
                        </div>

                        <label className="block space-y-1">
                          <span className="text-xs text-muted-foreground">
                            Compétence de cette activité
                          </span>
                          <select
                            value={item.competencyId ?? ""}
                            onChange={(event) =>
                              patchItem(index, { competencyId: event.target.value || null })
                            }
                            className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-primary"
                          >
                            <option value="">Choisir une compétence…</option>
                            {competencies.map((competency) => (
                              <option key={competency.id} value={competency.id}>
                                {competency.label}
                              </option>
                            ))}
                          </select>
                        </label>

                        <div className="flex items-end gap-3">
                          <label className="block space-y-1">
                            <span className="text-xs text-muted-foreground">Points obtenus</span>
                            <input
                              inputMode="decimal"
                              value={item.points}
                              onChange={(event) => patchItem(index, { points: event.target.value })}
                              className="w-24 rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-primary"
                            />
                          </label>
                          <span className="pb-2 text-muted-foreground">/</span>
                          <label className="block space-y-1">
                            <span className="text-xs text-muted-foreground">Barème</span>
                            <input
                              inputMode="decimal"
                              value={item.maxPoints}
                              onChange={(event) =>
                                patchItem(index, { maxPoints: event.target.value })
                              }
                              className="w-24 rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-primary"
                            />
                          </label>
                        </div>
                      </li>
                    ))}
                    <li>
                      <button
                        type="button"
                        onClick={() =>
                          setItems((current) => [
                            ...current,
                            {
                              label: `AFL${current.length + 1}`,
                              competencyId: null,
                              points: "0",
                              maxPoints: "0",
                            },
                          ])
                        }
                        className="flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-xs font-medium uppercase hover:bg-accent"
                      >
                        <Plus className="size-4" /> Ajouter un AFL
                      </button>
                    </li>
                  </ul>
                )}

                {activityId && (
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
                <h2 className="mono-label text-muted-foreground">Notes déjà enregistrées</h2>
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
                              <span aria-hidden>{activityEmoji(grade.activity_name)}</span>
                              {grade.activity_name}
                            </p>
                            <div className="flex items-center gap-3">
                              <span className="display-title text-xl text-primary">
                                {formatPoints(rowTotals.points)} / {formatPoints(rowTotals.max)}
                              </span>
                              <button
                                type="button"
                                onClick={() => void handleDelete(grade.id)}
                                aria-label={`Supprimer la note de ${grade.activity_name}`}
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
      </div>
    </div>
  );
}
