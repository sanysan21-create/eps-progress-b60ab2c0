import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Check, Search, Users, X } from "lucide-react";
import { toast } from "sonner";

import {
  listActivities,
  listStudentMarks,
  listTeacherStudents,
  setStudentLevel,
  clearStudentLevel,
} from "@/lib/competencies.functions";
import {
  listStudentEngagement,
  getStudentStrengthChoices,
  getStudentGoalChoice,
  setStudentEngagement,
  clearStudentEngagement,
} from "@/lib/engagement.functions";
import {
  ENGAGEMENT_INDICATORS,
  ENGAGEMENT_LEVELS,
  strength as findStrength,
  goal as findGoal,
} from "@/lib/engagement";

export const Route = createFileRoute("/_authenticated/prof/competences")({
  head: () => ({
    meta: [
      { title: "Évaluer les compétences — EPS Progress" },
      {
        name: "description",
        content:
          "Attribuez à chaque élève un niveau pour chaque compétence cible d'une activité, en un seul clic.",
      },
      { property: "og:title", content: "Évaluer les compétences — EPS Progress" },
      {
        property: "og:description",
        content:
          "Attribution rapide des niveaux par compétence cible, élève par élève ou en groupe.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: QuickCompetencies,
});

function QuickCompetencies() {
  const queryClient = useQueryClient();
  const fetchStudents = useServerFn(listTeacherStudents);
  const fetchActivities = useServerFn(listActivities);
  const fetchMarks = useServerFn(listStudentMarks);
  const setLevel = useServerFn(setStudentLevel);
  const clearLevel = useServerFn(clearStudentLevel);
  const fetchEngagement = useServerFn(listStudentEngagement);
  const fetchStrengthChoices = useServerFn(getStudentStrengthChoices);
  const fetchGoalChoice = useServerFn(getStudentGoalChoice);
  const saveEngagement = useServerFn(setStudentEngagement);
  const removeEngagement = useServerFn(clearStudentEngagement);

  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [activityId, setActivityId] = useState<string>("");

  const students = useQuery({ queryKey: ["teacher-students"], queryFn: () => fetchStudents() });
  const activities = useQuery({ queryKey: ["activities"], queryFn: () => fetchActivities() });

  const soloId = selected.length === 1 ? selected[0]! : null;
  const marks = useQuery({
    queryKey: ["student-marks", soloId],
    queryFn: () => fetchMarks({ data: { studentId: soloId! } }),
    enabled: Boolean(soloId),
  });
  const engagement = useQuery({
    queryKey: ["student-engagement", soloId],
    queryFn: () => fetchEngagement({ data: { studentId: soloId! } }),
    enabled: Boolean(soloId),
  });
  const strengthChoices = useQuery({
    queryKey: ["student-strength-choices", soloId],
    queryFn: () => fetchStrengthChoices({ data: { studentId: soloId! } }),
    enabled: Boolean(soloId),
  });
  const goalChoice = useQuery({
    queryKey: ["student-goal-choice", soloId],
    queryFn: () => fetchGoalChoice({ data: { studentId: soloId! } }),
    enabled: Boolean(soloId),
  });

  const engagementByCode = useMemo(() => {
    const map = new Map<string, number>();
    for (const mark of engagement.data ?? []) map.set(mark.indicator_code, mark.level);
    return map;
  }, [engagement.data]);

  const chosenStrengths = (strengthChoices.data ?? [])
    .map((code) => findStrength(code))
    .filter((item): item is NonNullable<typeof item> => Boolean(item));
  const chosenGoal = goalChoice.data ? findGoal(goalChoice.data) : undefined;

  async function handleEngagementChange(indicatorCode: string, value: string) {
    if (!selected.length) {
      toast.error("Sélectionne au moins un élève");
      return;
    }
    try {
      if (value) {
        await saveEngagement({
          data: { studentIds: selected, indicatorCode, level: Number(value) },
        });
        toast.success("Implication enregistrée");
      } else {
        await removeEngagement({ data: { studentIds: selected, indicatorCode } });
        toast.success("Indicateur retiré");
      }
      await queryClient.invalidateQueries({ queryKey: ["student-engagement"] });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Échec de l'enregistrement");
    }
  }

  const activityList = activities.data ?? [];
  const activity = activityList.find((a) => a.id === activityId) ?? activityList[0] ?? null;

  const markByCompetency = useMemo(() => {
    const map = new Map<string, string>();
    for (const mark of marks.data ?? []) map.set(mark.competency_id, mark.level_id);
    return map;
  }, [marks.data]);

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    const list = students.data ?? [];
    if (!term) return list;
    return list.filter((s) =>
      `${s.first_name} ${s.last_name} ${s.student_code} ${s.class_names.join(" ")}`
        .toLowerCase()
        .includes(term),
    );
  }, [students.data, query]);

  function toggle(id: string) {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  async function refresh() {
    await queryClient.invalidateQueries({ queryKey: ["student-marks"] });
  }

  async function handleChange(competencyId: string, levelId: string) {
    if (!selected.length) {
      toast.error("Sélectionne au moins un élève");
      return;
    }
    try {
      if (levelId) {
        await setLevel({ data: { studentIds: selected, competencyId, levelId } });
        toast.success(
          selected.length > 1 ? `Niveau attribué à ${selected.length} élèves` : "Niveau attribué",
        );
      } else {
        await clearLevel({ data: { studentIds: selected, competencyId } });
        toast.success("Niveau retiré");
      }
      await refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Échec de l'enregistrement");
    }
  }

  const selectedNames = (students.data ?? [])
    .filter((s) => selected.includes(s.id))
    .map((s) => s.first_name);

  return (
    <div className="animate-slide-up space-y-8">
      <header className="space-y-1">
        <p className="mono-label text-primary">Attribution des niveaux</p>
        <h1 className="display-title text-3xl lg:text-4xl">Évaluer les compétences</h1>
        <p className="text-sm text-muted-foreground">
          Choisis un élève (ou plusieurs), une activité, puis le niveau de chaque compétence cible.
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <section className="space-y-3 rounded-3xl border border-border bg-surface p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Rechercher un élève ou une classe"
              className="w-full rounded-xl border border-border bg-background py-2.5 pl-9 pr-3 text-sm outline-none focus:border-primary"
            />
          </div>

          <div className="flex items-center justify-between">
            <p className="mono-label text-muted-foreground">
              {selected.length} sélectionné{selected.length > 1 ? "s" : ""}
            </p>
            {selected.length > 0 && (
              <button
                onClick={() => setSelected([])}
                className="mono-label text-muted-foreground hover:text-primary"
              >
                Tout désélectionner
              </button>
            )}
          </div>

          <div className="max-h-[460px] space-y-1.5 overflow-y-auto pr-1">
            {students.isLoading && <p className="text-sm text-muted-foreground">Chargement…</p>}
            {!students.isLoading && filtered.length === 0 && (
              <p className="text-sm text-muted-foreground">
                Aucun élève. Ajoute-les depuis « Gestion classes ».
              </p>
            )}
            {filtered.map((s) => {
              const active = selected.includes(s.id);
              return (
                <button
                  key={s.id}
                  onClick={() => toggle(s.id)}
                  className={`flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition-colors ${
                    active
                      ? "border-primary bg-primary/10"
                      : "border-border bg-background hover:border-primary/40"
                  }`}
                >
                  <span
                    className={`grid size-6 shrink-0 place-items-center rounded-md border ${
                      active ? "border-primary bg-primary text-primary-foreground" : "border-border"
                    }`}
                  >
                    {active && <Check className="size-3.5" />}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-bold">
                      {s.first_name} {s.last_name}
                    </span>
                    <span className="mono-label block text-muted-foreground">
                      {s.class_names.join(" · ") || "Sans classe"}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        <div className="space-y-6">
          <section className="space-y-4 rounded-3xl border border-border bg-surface p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Users className="size-4 text-primary" />
                <p className="text-sm font-bold uppercase">
                  {selected.length === 0
                    ? "Aucun élève sélectionné"
                    : selected.length === 1
                      ? `Élève : ${selectedNames[0]}`
                      : `${selected.length} élèves : ${selectedNames.slice(0, 3).join(", ")}${
                          selectedNames.length > 3 ? "…" : ""
                        }`}
                </p>
              </div>
              <select
                value={activity?.id ?? ""}
                onChange={(e) => setActivityId(e.target.value)}
                className="rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
              >
                {activityList.length === 0 && <option value="">Aucune activité</option>}
                {activityList.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
            </div>

            {activityList.length === 0 && (
              <p className="text-sm text-muted-foreground">
                Crée d'abord une activité et ses compétences cibles dans{" "}
                <Link to="/prof/activites" className="text-primary underline">
                  Activités & compétences cibles
                </Link>
                .
              </p>
            )}

            {activity && activity.competencies.length === 0 && (
              <p className="text-sm text-muted-foreground">
                Cette activité n'a pas encore de compétence cible.
              </p>
            )}

            <div className="space-y-3">
              {activity?.competencies.map((competency) => {
                const currentLevelId = soloId ? (markByCompetency.get(competency.id) ?? "") : "";
                return (
                  <article
                    key={competency.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-background p-4"
                  >
                    <div className="min-w-[200px] flex-1">
                      <p className="text-sm font-bold">{competency.label}</p>
                      <p className="mono-label text-muted-foreground">
                        {competency.levels.length} niveaux
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <select
                        value={currentLevelId}
                        onChange={(e) => void handleChange(competency.id, e.target.value)}
                        disabled={competency.levels.length === 0}
                        className="min-w-[220px] rounded-xl border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-primary disabled:opacity-50"
                      >
                        <option value="">Non renseigné</option>
                        {competency.levels.map((level, index) => (
                          <option key={level.id} value={level.id}>
                            Niveau {index + 1} — {level.label}
                          </option>
                        ))}
                      </select>
                      {soloId && currentLevelId && (
                        <button
                          onClick={() => void handleChange(competency.id, "")}
                          aria-label="Retirer le niveau attribué"
                          className="rounded-xl border border-border p-2 text-muted-foreground hover:text-primary"
                        >
                          <X className="size-4" />
                        </button>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>

            <p className="mono-label text-muted-foreground">
              « Non renseigné » n'attribue rien : la compétence n'apparaît pas dans le profil élève.
            </p>
          </section>

          <section className="space-y-4 rounded-3xl border border-border bg-surface p-5">
            <div>
              <h2 className="text-sm font-bold uppercase">Implication en EPS</h2>
              <p className="text-xs text-muted-foreground">
                Échelle positive de valorisation, sans note. « Non renseigné » n'affiche rien dans
                le profil élève.
              </p>
            </div>

            <div className="space-y-3">
              {ENGAGEMENT_INDICATORS.map((indicator) => {
                const current = soloId ? (engagementByCode.get(indicator.code) ?? "") : "";
                return (
                  <article
                    key={indicator.code}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-background p-4"
                  >
                    <div className="min-w-[200px] flex-1">
                      <p className="text-sm font-bold">
                        <span aria-hidden>{indicator.emoji}</span> {indicator.label}
                      </p>
                      <p className="text-xs text-muted-foreground">{indicator.hint}</p>
                    </div>
                    <select
                      value={String(current)}
                      onChange={(e) => void handleEngagementChange(indicator.code, e.target.value)}
                      className="min-w-[220px] rounded-xl border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-primary"
                    >
                      <option value="">Non renseigné</option>
                      {ENGAGEMENT_LEVELS.map((level) => (
                        <option key={level.value} value={level.value}>
                          {level.label}
                        </option>
                      ))}
                    </select>
                  </article>
                );
              })}
            </div>
          </section>

          <section className="space-y-3 rounded-3xl border border-border bg-surface p-5">
            <div>
              <h2 className="text-sm font-bold uppercase">Point fort choisi par l'élève</h2>
              <p className="text-xs text-muted-foreground">
                Consultation uniquement : c'est l'élève qui choisit son point fort depuis son
                profil.
              </p>
            </div>

            {!soloId ? (
              <p className="text-sm text-muted-foreground">
                Sélectionne un seul élève pour voir son point fort.
              </p>
            ) : chosenStrength ? (
              <div className="flex items-center gap-3 rounded-2xl border border-border bg-background p-4">
                <span className="text-2xl" aria-hidden>
                  {chosenStrength.emoji}
                </span>
                <p className="text-base font-semibold">{chosenStrength.label}</p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                L'élève n'a pas encore choisi son point fort.
              </p>
            )}
          </section>

          {selected.length > 1 && (
            <p className="text-sm text-muted-foreground">
              En sélection multiple, le niveau choisi est appliqué à tous les élèves sélectionnés.
              Sélectionne un seul élève pour voir ses niveaux actuels.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
