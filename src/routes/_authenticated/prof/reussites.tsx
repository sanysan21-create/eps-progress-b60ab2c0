import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Plus, Search, Trash2, Check } from "lucide-react";

import { listClasses } from "@/lib/classes.functions";
import {
  awardAchievement,
  createAchievement,
  deleteAchievement,
  listAchievements,
  listClassStudents,
} from "@/lib/achievements.functions";
import { MedalAssign } from "@/components/eps/MedalAssign";

export const Route = createFileRoute("/_authenticated/prof/reussites")({
  head: () => ({
    meta: [
      { title: "Réussites des élèves — EPS Progress" },
      {
        name: "description",
        content:
          "Créez les réussites possibles de votre enseignement et attribuez-les manuellement aux élèves de vos classes.",
      },
      { property: "og:title", content: "Réussites des élèves — EPS Progress" },
      {
        property: "og:description",
        content: "Créez et attribuez les réussites pédagogiques de vos élèves en EPS.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: TeacherAchievements,
});

const ICONS = [
  "🏅",
  "🧰",
  "🗣️",
  "📈",
  "🔥",
  "🤝",
  "🧭",
  "🧠",
  "🧗",
  "⭐",
  "🚀",
  "🎯",
  "💪",
  "🤸",
  "⏱️",
  "🫱",
];

function TeacherAchievements() {
  const queryClient = useQueryClient();

  const fetchAchievements = useServerFn(listAchievements);
  const fetchClasses = useServerFn(listClasses);
  const fetchClassStudents = useServerFn(listClassStudents);
  const create = useServerFn(createAchievement);
  const remove = useServerFn(deleteAchievement);
  const award = useServerFn(awardAchievement);

  const achievements = useQuery({ queryKey: ["achievements"], queryFn: () => fetchAchievements() });
  const classes = useQuery({ queryKey: ["classes"], queryFn: () => fetchClasses() });

  const [formOpen, setFormOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [icon, setIcon] = useState("🏅");

  const [classId, setClassId] = useState("");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [achievementId, setAchievementId] = useState("");
  const [confirming, setConfirming] = useState(false);

  const students = useQuery({
    queryKey: ["class-students", classId],
    queryFn: () => fetchClassStudents({ data: { classId } }),
    enabled: Boolean(classId),
  });

  const visibleStudents = useMemo(() => {
    const rows = students.data ?? [];
    const term = search.trim().toLowerCase();
    if (!term) return rows;
    return rows.filter((student) =>
      `${student.first_name} ${student.last_name}`.toLowerCase().includes(term),
    );
  }, [students.data, search]);

  const chosenAchievement = (achievements.data ?? []).find((row) => row.id === achievementId);
  const selectedStudents = (students.data ?? []).filter((student) =>
    selected.includes(student.id),
  );

  const createMutation = useMutation({
    mutationFn: () => create({ data: { name, description, icon } }),
    onSuccess: () => {
      toast.success("Réussite créée");
      setName("");
      setDescription("");
      setIcon("🏅");
      setFormOpen(false);
      queryClient.invalidateQueries({ queryKey: ["achievements"] });
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "Création impossible"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => remove({ data: { achievementId: id } }),
    onSuccess: () => {
      toast.success("Réussite supprimée");
      queryClient.invalidateQueries({ queryKey: ["achievements"] });
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "Suppression impossible"),
  });

  const awardMutation = useMutation({
    mutationFn: () => award({ data: { achievementId, studentIds: selected } }),
    onSuccess: () => {
      toast.success("✓ Réussite attribuée avec succès.");
      setConfirming(false);
      setSelected([]);
      queryClient.invalidateQueries({ queryKey: ["achievements"] });
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "Attribution impossible"),
  });

  function toggleStudent(id: string) {
    setSelected((prev) => (prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]));
  }

  return (
    <div className="space-y-10">
      <header className="space-y-1">
        <h1 className="display-title text-3xl">🏅 Réussites</h1>
        <p className="text-sm text-muted-foreground">
          Tu observes, tu choisis, tu valides : la réussite apparaît alors dans le parcours de
          l'élève.
        </p>
      </header>

      {/* Réussites possibles */}
      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">Réussites possibles</h2>
          <button
            onClick={() => setFormOpen((open) => !open)}
            className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-xs font-bold uppercase text-primary-foreground"
          >
            <Plus className="size-4" />
            Inscrire une réussite
          </button>
        </div>

        {formOpen && (
          <form
            onSubmit={(event) => {
              event.preventDefault();
              if (!name.trim()) {
                toast.error("Donne un nom à la réussite.");
                return;
              }
              createMutation.mutate();
            }}
            className="space-y-4 rounded-2xl border border-border bg-surface p-5"
          >
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">
                Nom de la réussite
              </label>
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Coach affirmé"
                className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Description</label>
              <textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                rows={2}
                placeholder="Tu sais accompagner et conseiller tes partenaires."
                className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">Icône</label>
              <div className="flex flex-wrap gap-2">
                {ICONS.map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setIcon(option)}
                    aria-pressed={icon === option}
                    className={`grid size-11 place-items-center rounded-xl border text-lg transition-colors ${
                      icon === option
                        ? "border-primary bg-primary/10"
                        : "border-border bg-background hover:bg-accent"
                    }`}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>
            <button
              type="submit"
              disabled={createMutation.isPending}
              className="rounded-full bg-primary px-5 py-2.5 text-xs font-bold uppercase text-primary-foreground disabled:opacity-60"
            >
              Créer la réussite
            </button>
          </form>
        )}

        {achievements.data && achievements.data.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-border/70 bg-surface/50 p-5 text-sm text-muted-foreground">
            Aucune réussite pour le moment. Inscris la première réussite de ton enseignement.
          </p>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {(achievements.data ?? []).map((achievement) => (
              <li
                key={achievement.id}
                className="flex items-start gap-3 rounded-2xl border border-border bg-surface p-4"
              >
                <span aria-hidden className="grid size-11 shrink-0 place-items-center rounded-xl bg-primary/10 text-lg">
                  {achievement.icon}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold leading-snug">{achievement.name}</p>
                  {achievement.description && (
                    <p className="text-xs leading-relaxed text-muted-foreground">
                      {achievement.description}
                    </p>
                  )}
                  <p className="mono-label mt-1 text-muted-foreground">
                    Attribuée à {achievement.awarded_count} élève
                    {achievement.awarded_count > 1 ? "s" : ""}
                  </p>
                </div>
                <button
                  onClick={() => deleteMutation.mutate(achievement.id)}
                  aria-label={`Supprimer la réussite ${achievement.name}`}
                  className="rounded-lg p-2 text-muted-foreground hover:bg-accent hover:text-foreground"
                >
                  <Trash2 className="size-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Attribuer une réussite */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Attribuer une réussite</h2>

        <div className="space-y-5 rounded-2xl border border-border bg-surface p-5">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Classe</label>
            <select
              value={classId}
              onChange={(event) => {
                setClassId(event.target.value);
                setSelected([]);
              }}
              className="w-full max-w-xs rounded-xl border border-border bg-background px-4 py-2.5 text-sm"
            >
              <option value="">Sélectionner une classe…</option>
              {(classes.data ?? []).map((row) => (
                <option key={row.id} value={row.id}>
                  {row.name} · {row.school_year}
                </option>
              ))}
            </select>
          </div>

          {classId && (
            <>
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">
                  Réussite à attribuer
                </label>
                <div className="flex flex-wrap gap-2">
                  {(achievements.data ?? []).map((achievement) => (
                    <button
                      key={achievement.id}
                      onClick={() => setAchievementId(achievement.id)}
                      aria-pressed={achievementId === achievement.id}
                      className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-medium transition-colors ${
                        achievementId === achievement.id
                          ? "border-primary bg-primary/10 text-foreground"
                          : "border-border bg-background text-muted-foreground hover:bg-accent"
                      }`}
                    >
                      <span aria-hidden>{achievement.icon}</span>
                      {achievement.name}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-sm font-medium">
                    {(students.data ?? []).length} élève
                    {(students.data ?? []).length > 1 ? "s" : ""} dans cette classe
                  </p>
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <input
                      value={search}
                      onChange={(event) => setSearch(event.target.value)}
                      placeholder="Rechercher un élève"
                      className="rounded-full border border-border bg-background py-2 pl-9 pr-4 text-sm"
                    />
                  </div>
                </div>

                <ul className="grid gap-2 sm:grid-cols-2">
                  {visibleStudents.map((student) => {
                    const checked = selected.includes(student.id);
                    return (
                      <li key={student.id}>
                        <label
                          className={`flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 text-sm transition-colors ${
                            checked ? "border-primary bg-primary/5" : "border-border bg-background"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleStudent(student.id)}
                            className="size-4 accent-[oklch(var(--primary))]"
                          />
                          {student.first_name} {student.last_name}
                        </label>
                      </li>
                    );
                  })}
                </ul>
              </div>

              <div className="flex flex-wrap items-center gap-4">
                <p className="text-sm text-muted-foreground">
                  {selected.length} élève{selected.length > 1 ? "s" : ""} sélectionné
                  {selected.length > 1 ? "s" : ""}
                </p>
                <button
                  onClick={() => {
                    if (!achievementId) {
                      toast.error("Choisis une réussite.");
                      return;
                    }
                    if (selected.length === 0) {
                      toast.error("Sélectionne au moins un élève.");
                      return;
                    }
                    setConfirming(true);
                  }}
                  className="rounded-full bg-primary px-5 py-2.5 text-xs font-bold uppercase text-primary-foreground"
                >
                  Attribuer la réussite
                </button>
              </div>
            </>
          )}
        </div>
      </section>

      <MedalAssign />

      {confirming && chosenAchievement && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-background/80 p-4">
          <div className="w-full max-w-md space-y-4 rounded-2xl border border-border bg-surface p-6">
            <h3 className="text-base font-semibold">
              Attribuer « {chosenAchievement.name} » à {selectedStudents.length} élève
              {selectedStudents.length > 1 ? "s" : ""} ?
            </h3>
            <ul className="max-h-52 space-y-1 overflow-y-auto text-sm text-muted-foreground">
              {selectedStudents.map((student) => (
                <li key={student.id}>
                  {student.first_name} {student.last_name}
                </li>
              ))}
            </ul>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setConfirming(false)}
                className="rounded-full border border-border px-4 py-2 text-xs font-bold uppercase text-muted-foreground"
              >
                Annuler
              </button>
              <button
                onClick={() => awardMutation.mutate()}
                disabled={awardMutation.isPending}
                className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2 text-xs font-bold uppercase text-primary-foreground disabled:opacity-60"
              >
                <Check className="size-4" />
                Valider
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
