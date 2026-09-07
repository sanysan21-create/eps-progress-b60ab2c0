import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Plus, Search, Trash2, Check, Pencil, Star } from "lucide-react";

import { listClasses } from "@/lib/classes.functions";
import {
  awardAchievement,
  createAchievement,
  deleteAchievement,
  listAchievements,
  listClassStudents,
  updateAchievement,
  type AchievementRow,
} from "@/lib/achievements.functions";
import { listStudentMedals } from "@/lib/medals.functions";
import { MEDALS, requiredCount, type MedalCode } from "@/lib/medals";
import { MedalBadge } from "@/components/eps/MedalBadge";

export const Route = createFileRoute("/_authenticated/prof/reussites")({
  head: () => ({
    meta: [
      { title: "Réussites et parcours des médailles — EPS Progress" },
      {
        name: "description",
        content:
          "Créez vos réussites, classez-les dans les parcours bronze, argent et or, rendez-en certaines obligatoires puis attribuez-les à vos élèves.",
      },
      { property: "og:title", content: "Réussites et parcours des médailles — EPS Progress" },
      {
        property: "og:description",
        content: "Parcours bronze, argent, or : 5 réussites nécessaires par médaille.",
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

type FormState = {
  id: string | null;
  name: string;
  description: string;
  icon: string;
  medalType: MedalCode | "";
  isRequired: boolean;
};

const EMPTY_FORM: FormState = {
  id: null,
  name: "",
  description: "",
  icon: "🏅",
  medalType: "bronze",
  isRequired: false,
};

function TeacherAchievements() {
  const queryClient = useQueryClient();

  const fetchAchievements = useServerFn(listAchievements);
  const fetchClasses = useServerFn(listClasses);
  const fetchClassStudents = useServerFn(listClassStudents);
  const fetchMedals = useServerFn(listStudentMedals);
  const create = useServerFn(createAchievement);
  const update = useServerFn(updateAchievement);
  const remove = useServerFn(deleteAchievement);
  const award = useServerFn(awardAchievement);

  const achievements = useQuery({ queryKey: ["achievements"], queryFn: () => fetchAchievements() });
  const classes = useQuery({ queryKey: ["classes"], queryFn: () => fetchClasses() });
  const medals = useQuery({ queryKey: ["student-medals"], queryFn: () => fetchMedals() });

  const [form, setForm] = useState<FormState | null>(null);

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

  const list = achievements.data ?? [];
  const unclassified = list.filter((row) => !row.medal_type);
  const byMedal = (code: MedalCode) => list.filter((row) => row.medal_type === code);

  const chosenAchievement = list.find((row) => row.id === achievementId);
  const selectedStudents = (students.data ?? []).filter((student) =>
    selected.includes(student.id),
  );
  const medalOf = (id: string) =>
    (medals.data ?? []).find((row) => row.student_id === id)?.medal ?? null;

  function refresh() {
    void queryClient.invalidateQueries({ queryKey: ["achievements"] });
    void queryClient.invalidateQueries({ queryKey: ["student-medals"] });
  }

  const saveMutation = useMutation({
    mutationFn: async (): Promise<void> => {
      const current = form!;
      const payload = {
        name: current.name,
        description: current.description,
        icon: current.icon,
        medalType: current.medalType === "" ? null : current.medalType,
        isRequired: current.isRequired,
      };
      if (current.id) {
        await update({ data: { achievementId: current.id, ...payload } });
      } else {
        await create({ data: payload });
      }
    },
    onSuccess: () => {
      toast.success(form?.id ? "Réussite modifiée" : "Réussite créée");
      setForm(null);
      refresh();
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "Enregistrement impossible"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => remove({ data: { achievementId: id } }),
    onSuccess: () => {
      toast.success("Réussite supprimée");
      refresh();
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "Suppression impossible"),
  });

  const awardMutation = useMutation({
    mutationFn: () => award({ data: { achievementId, studentIds: selected } }),
    onSuccess: () => {
      toast.success("✓ Réussite attribuée. Médailles recalculées.");
      setConfirming(false);
      setSelected([]);
      refresh();
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "Attribution impossible"),
  });

  function toggleStudent(id: string) {
    setSelected((prev) => (prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]));
  }

  function openCreate(medalType: MedalCode | "") {
    setForm({ ...EMPTY_FORM, medalType });
  }

  function openEdit(row: AchievementRow) {
    setForm({
      id: row.id,
      name: row.name,
      description: row.description,
      icon: row.icon,
      medalType: (row.medal_type as MedalCode | null) ?? "",
      isRequired: row.is_required,
    });
  }

  function AchievementCard({ row }: { row: AchievementRow }) {
    return (
      <li className="flex items-start gap-3 rounded-2xl border border-border bg-surface p-4">
        <span
          aria-hidden
          className="grid size-11 shrink-0 place-items-center rounded-xl bg-primary/10 text-lg"
        >
          {row.icon}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold leading-snug">{row.name}</p>
          {row.description && (
            <p className="text-xs leading-relaxed text-muted-foreground">{row.description}</p>
          )}
          <div className="mt-1.5 flex flex-wrap items-center gap-2">
            {row.is_required && (
              <span className="inline-flex items-center gap-1 rounded-full border border-primary/40 bg-primary/10 px-2 py-0.5 text-[11px] font-bold uppercase text-primary">
                <Star className="size-3" /> Obligatoire
              </span>
            )}
            <span className="mono-label text-muted-foreground">
              Attribuée à {row.awarded_count} élève{row.awarded_count > 1 ? "s" : ""}
            </span>
          </div>
        </div>
        <span className="flex shrink-0 flex-col gap-1">
          <button
            onClick={() => openEdit(row)}
            aria-label={`Modifier la réussite ${row.name}`}
            className="rounded-lg p-2 text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            <Pencil className="size-4" />
          </button>
          <button
            onClick={() => deleteMutation.mutate(row.id)}
            aria-label={`Supprimer la réussite ${row.name}`}
            className="rounded-lg p-2 text-muted-foreground hover:bg-accent hover:text-destructive"
          >
            <Trash2 className="size-4" />
          </button>
        </span>
      </li>
    );
  }

  return (
    <div className="space-y-10">
      <header className="space-y-1">
        <h1 className="display-title text-3xl">🏅 Réussites</h1>
        <p className="text-sm text-muted-foreground">
          Tu écris tes réussites, tu les classes dans un parcours de médaille et tu les valides :
          la médaille se débloque automatiquement.
        </p>
      </header>

      {/* Formulaire de création / modification */}
      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">Créer une réussite</h2>
          <button
            onClick={() => (form ? setForm(null) : openCreate("bronze"))}
            className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-xs font-bold uppercase text-primary-foreground"
          >
            <Plus className="size-4" />
            Inscrire une réussite
          </button>
        </div>

        {form && (
          <form
            onSubmit={(event) => {
              event.preventDefault();
              if (!form.name.trim()) {
                toast.error("Donne un nom à la réussite.");
                return;
              }
              saveMutation.mutate();
            }}
            className="space-y-4 rounded-2xl border border-border bg-surface p-5"
          >
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">
                Nom de la réussite
              </label>
              <input
                value={form.name}
                onChange={(event) => setForm({ ...form, name: event.target.value })}
                placeholder="Je m'investis"
                className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">
                Description / critère d'obtention
              </label>
              <textarea
                value={form.description}
                onChange={(event) => setForm({ ...form, description: event.target.value })}
                rows={2}
                placeholder="Tu participes activement du début à la fin de la séance."
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
                    onClick={() => setForm({ ...form, icon: option })}
                    aria-pressed={form.icon === option}
                    className={`grid size-11 place-items-center rounded-xl border text-lg transition-colors ${
                      form.icon === option
                        ? "border-primary bg-primary/10"
                        : "border-border bg-background hover:bg-accent"
                    }`}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">
                Médaille associée
              </label>
              <div className="flex flex-wrap gap-2">
                {MEDALS.map((item) => (
                  <button
                    key={item.code}
                    type="button"
                    onClick={() => setForm({ ...form, medalType: item.code })}
                    aria-pressed={form.medalType === item.code}
                    className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-semibold transition-colors ${
                      form.medalType === item.code
                        ? "border-primary bg-primary/10 text-foreground"
                        : "border-border bg-background text-muted-foreground hover:bg-accent"
                    }`}
                  >
                    <span aria-hidden>{item.emoji}</span> {item.label}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setForm({ ...form, medalType: "" })}
                  aria-pressed={form.medalType === ""}
                  className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-semibold transition-colors ${
                    form.medalType === ""
                      ? "border-primary bg-primary/10 text-foreground"
                      : "border-border bg-background text-muted-foreground hover:bg-accent"
                  }`}
                >
                  À classer
                </button>
              </div>
            </div>

            <label className="flex items-center gap-3 text-sm">
              <input
                type="checkbox"
                checked={form.isRequired}
                onChange={(event) => setForm({ ...form, isRequired: event.target.checked })}
                className="size-4 accent-[oklch(var(--primary))]"
              />
              ⭐ Réussite obligatoire pour obtenir cette médaille
            </label>

            <div className="flex flex-wrap gap-3">
              <button
                type="submit"
                disabled={saveMutation.isPending}
                className="rounded-full bg-primary px-5 py-2.5 text-xs font-bold uppercase text-primary-foreground disabled:opacity-60"
              >
                {form.id ? "Enregistrer" : "Créer la réussite"}
              </button>
              <button
                type="button"
                onClick={() => setForm(null)}
                className="rounded-full border border-border px-5 py-2.5 text-xs font-bold uppercase text-muted-foreground"
              >
                Annuler
              </button>
            </div>
          </form>
        )}
      </section>

      {/* Parcours des médailles */}
      <section className="space-y-4">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold">🏅 Parcours des médailles</h2>
          <p className="text-sm text-muted-foreground">
            Chaque médaille possède sa propre liste de réussites. L'élève doit en valider{" "}
            {requiredCount("bronze")} et obtenir toutes les réussites obligatoires du parcours.
          </p>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          {MEDALS.map((item) => {
            const rows = byMedal(item.code);
            const need = requiredCount(item.code);
            return (
              <div
                key={item.code}
                className="space-y-4 rounded-3xl border border-border bg-surface p-5"
              >
                <div className="flex items-center gap-3">
                  <MedalBadge code={item.code} size={44} />
                  <div>
                    <p className="font-display text-base uppercase tracking-wide">{item.label}</p>
                    <p className="mono-label text-muted-foreground">
                      {rows.length} réussite{rows.length > 1 ? "s" : ""} disponible
                      {rows.length > 1 ? "s" : ""} · {need} nécessaires
                    </p>
                  </div>
                </div>

                {rows.length < need && (
                  <p className="rounded-xl border border-dashed border-border/70 bg-surface-2/60 px-3 py-2 text-xs text-muted-foreground">
                    Il manque {need - rows.length} réussite{need - rows.length > 1 ? "s" : ""} pour
                    que ce parcours puisse être validé par un élève.
                  </p>
                )}

                {rows.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Aucune réussite dans ce parcours.</p>
                ) : (
                  <ul className="space-y-3">
                    {rows.map((row) => (
                      <AchievementCard key={row.id} row={row} />
                    ))}
                  </ul>
                )}

                <button
                  onClick={() => openCreate(item.code)}
                  className="inline-flex items-center gap-2 rounded-full border border-primary/50 px-4 py-2 text-xs font-bold uppercase text-primary"
                >
                  <Plus className="size-4" /> Ajouter une réussite
                </button>
              </div>
            );
          })}
        </div>

        {unclassified.length > 0 && (
          <div className="space-y-3 rounded-3xl border border-dashed border-border bg-surface/60 p-5">
            <div className="space-y-1">
              <h3 className="text-base font-semibold">Réussites à classer</h3>
              <p className="text-sm text-muted-foreground">
                Ces réussites existent déjà et restent attribuées aux élèves. Affecte-les à Bronze,
                Argent ou Or pour qu'elles comptent dans un parcours.
              </p>
            </div>
            <ul className="grid gap-3 sm:grid-cols-2">
              {unclassified.map((row) => (
                <AchievementCard key={row.id} row={row} />
              ))}
            </ul>
          </div>
        )}
      </section>

      {/* Attribuer des réussites */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Attribuer des réussites</h2>

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
              <div className="space-y-4">
                <label className="text-xs font-medium text-muted-foreground">
                  Réussite à attribuer
                </label>
                {[...MEDALS.map((item) => ({ ...item, rows: byMedal(item.code) })),
                  { code: "", label: "À classer", emoji: "•", rows: unclassified },
                ]
                  .filter((group) => group.rows.length > 0)
                  .map((group) => (
                    <div key={group.code || "unclassified"} className="space-y-2">
                      <p className="mono-label text-muted-foreground">
                        <span aria-hidden>{group.emoji}</span> {group.label}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {group.rows.map((achievement) => (
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
                            {achievement.is_required && <span aria-hidden>⭐</span>}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
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
                    const code = medalOf(student.id);
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
                          <span className="min-w-0 flex-1 truncate">
                            {student.first_name} {student.last_name}
                          </span>
                          {code && <MedalBadge code={code} size={24} />}
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
