import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Check, Plus, Search, Trash2, Users } from "lucide-react";
import { toast } from "sonner";

import {
  listActivities,
  listStudentCompetencies,
  listTeacherStudents,
  saveCompetency,
  updateCompetency,
  deleteCompetency,
} from "@/lib/competencies.functions";
import { DEFAULT_LEVEL_OPTIONS, type LevelOption } from "@/lib/levels";

export const Route = createFileRoute("/_authenticated/prof/competences")({
  head: () => ({
    meta: [
      { title: "Saisie des compétences — EPS Progress" },
      {
        name: "description",
        content:
          "Renseignez une compétence et son niveau pour un élève ou pour plusieurs élèves en quelques clics.",
      },
      { property: "og:title", content: "Saisie des compétences — EPS Progress" },
      {
        property: "og:description",
        content: "Saisie rapide des compétences et des niveaux, élève par élève ou en groupe.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: QuickCompetencies,
});

const NOT_SET = "";

function QuickCompetencies() {
  const queryClient = useQueryClient();
  const fetchStudents = useServerFn(listTeacherStudents);
  const fetchActivities = useServerFn(listActivities);
  const fetchCompetencies = useServerFn(listStudentCompetencies);
  const save = useServerFn(saveCompetency);
  const update = useServerFn(updateCompetency);
  const remove = useServerFn(deleteCompetency);

  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [label, setLabel] = useState("");
  const [levelLabel, setLevelLabel] = useState(NOT_SET);
  const [activityId, setActivityId] = useState<string>("");
  const [saving, setSaving] = useState(false);

  const students = useQuery({ queryKey: ["teacher-students"], queryFn: () => fetchStudents() });
  const activities = useQuery({ queryKey: ["activities"], queryFn: () => fetchActivities() });

  const soloId = selected.length === 1 ? selected[0]! : null;
  const competencies = useQuery({
    queryKey: ["student-competencies", soloId],
    queryFn: () => fetchCompetencies({ data: { studentId: soloId! } }),
    enabled: Boolean(soloId),
  });

  const levelOptions: LevelOption[] = useMemo(() => {
    const list = activities.data ?? [];
    if (activityId) {
      const found = list.find((a) => a.id === activityId);
      if (found?.levels.length) return found.levels;
    }
    const seen = new Map<string, LevelOption>();
    for (const a of list) {
      for (const l of a.levels) if (!seen.has(l.label)) seen.set(l.label, l);
    }
    return seen.size ? [...seen.values()].sort((a, b) => a.position - b.position) : DEFAULT_LEVEL_OPTIONS;
  }, [activities.data, activityId]);

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
    await queryClient.invalidateQueries({ queryKey: ["student-competencies"] });
  }

  async function handleAdd() {
    if (!selected.length) return toast.error("Sélectionne au moins un élève");
    if (!label.trim()) return toast.error("Écris l'intitulé de la compétence");
    if (!levelLabel) return toast.error("Choisis un niveau — « Non renseigné » n'enregistre rien");

    const option = levelOptions.find((l) => l.label === levelLabel);
    setSaving(true);
    try {
      await save({
        data: {
          studentIds: selected,
          label: label.trim(),
          levelLabel,
          levelPosition: option?.position ?? 1,
          activityId: activityId || null,
        },
      });
      toast.success(
        selected.length > 1
          ? `Compétence enregistrée pour ${selected.length} élèves`
          : "Compétence enregistrée",
      );
      setLabel("");
      setLevelLabel(NOT_SET);
      await refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Échec de l'enregistrement");
    } finally {
      setSaving(false);
    }
  }

  async function handleLevelChange(id: string, value: string) {
    if (!value) return;
    const option = levelOptions.find((l) => l.label === value);
    try {
      await update({
        data: { id, levelLabel: value, levelPosition: option?.position ?? 1 },
      });
      await refresh();
      toast.success("Niveau mis à jour");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Échec de la mise à jour");
    }
  }

  async function handleDelete(id: string) {
    try {
      await remove({ data: { id } });
      await refresh();
      toast.success("Compétence supprimée");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Échec de la suppression");
    }
  }

  const selectedNames = (students.data ?? [])
    .filter((s) => selected.includes(s.id))
    .map((s) => s.first_name);

  return (
    <div className="animate-slide-up space-y-8">
      <header className="space-y-1">
        <p className="mono-label text-primary">Saisie rapide</p>
        <h1 className="display-title text-3xl lg:text-4xl">Compétences des élèves</h1>
        <p className="text-sm text-muted-foreground">
          Choisis un élève (ou plusieurs), écris la compétence, sélectionne le niveau, enregistre.
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        {/* Élèves */}
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

          <div className="max-h-[420px] space-y-1.5 overflow-y-auto pr-1">
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

        {/* Saisie */}
        <div className="space-y-6">
          <section className="rounded-3xl border border-border bg-surface p-5">
            <div className="mb-4 flex items-center gap-2">
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

            <div className="grid gap-3 lg:grid-cols-[1fr_200px_200px_auto] lg:items-end">
              <label className="space-y-1.5">
                <span className="mono-label text-muted-foreground">Compétence</span>
                <input
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") void handleAdd();
                  }}
                  placeholder="Ex. Course longue distance"
                  className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary"
                />
              </label>

              <label className="space-y-1.5">
                <span className="mono-label text-muted-foreground">Niveau</span>
                <select
                  value={levelLabel}
                  onChange={(e) => setLevelLabel(e.target.value)}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary"
                >
                  <option value="">Non renseigné</option>
                  {levelOptions.map((l) => (
                    <option key={l.label} value={l.label}>
                      {l.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="space-y-1.5">
                <span className="mono-label text-muted-foreground">Activité (optionnel)</span>
                <select
                  value={activityId}
                  onChange={(e) => setActivityId(e.target.value)}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary"
                >
                  <option value="">Aucune</option>
                  {(activities.data ?? []).map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </select>
              </label>

              <button
                onClick={() => void handleAdd()}
                disabled={saving}
                className="flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-xs font-bold uppercase text-primary-foreground disabled:opacity-60"
              >
                <Plus className="size-3.5" /> Ajouter
              </button>
            </div>
            <p className="mono-label mt-3 text-muted-foreground">
              « Non renseigné » n'enregistre aucune compétence dans le profil élève.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="display-title text-xl italic">
              {soloId ? `Compétences de ${selectedNames[0]}` : "Compétences enregistrées"}
            </h2>
            {!soloId && (
              <p className="text-sm text-muted-foreground">
                Sélectionne un seul élève pour voir et modifier ses compétences.
              </p>
            )}
            {soloId && competencies.isLoading && (
              <p className="text-sm text-muted-foreground">Chargement…</p>
            )}
            {soloId && competencies.data?.length === 0 && (
              <p className="text-sm text-muted-foreground">Aucune compétence pour le moment.</p>
            )}
            {soloId &&
              (competencies.data ?? []).map((c) => (
                <article
                  key={c.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-surface p-4"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-bold">{c.label}</p>
                    <p className="mono-label text-muted-foreground">
                      {c.activity_name ?? "Sans activité"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <select
                      value={c.level_label}
                      onChange={(e) => void handleLevelChange(c.id, e.target.value)}
                      className="rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                    >
                      {!levelOptions.some((l) => l.label === c.level_label) && (
                        <option value={c.level_label}>{c.level_label}</option>
                      )}
                      {levelOptions.map((l) => (
                        <option key={l.label} value={l.label}>
                          {l.label}
                        </option>
                      ))}
                    </select>
                    <button
                      onClick={() => void handleDelete(c.id)}
                      aria-label="Supprimer la compétence"
                      className="rounded-xl border border-border p-2 text-muted-foreground hover:text-primary"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                </article>
              ))}
          </section>
        </div>
      </div>
    </div>
  );
}
