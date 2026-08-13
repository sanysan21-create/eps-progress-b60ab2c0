import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import {
  listActivities,
  createActivity,
  renameActivity,
  deleteActivity,
  addActivityLevel,
  updateActivityLevel,
  deleteActivityLevel,
} from "@/lib/competencies.functions";

export const Route = createFileRoute("/_authenticated/prof/activites")({
  head: () => ({
    meta: [
      { title: "Activités et niveaux — EPS Progress" },
      {
        name: "description",
        content:
          "Créez vos activités EPS et définissez librement les intitulés de niveaux utilisés pour évaluer vos élèves.",
      },
      { property: "og:title", content: "Activités et niveaux — EPS Progress" },
      {
        property: "og:description",
        content: "Configurateur d'activités et de niveaux personnalisables.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: TeacherActivities,
});

function TeacherActivities() {
  const queryClient = useQueryClient();
  const fetchActivities = useServerFn(listActivities);
  const create = useServerFn(createActivity);
  const rename = useServerFn(renameActivity);
  const removeActivity = useServerFn(deleteActivity);
  const addLevel = useServerFn(addActivityLevel);
  const renameLevel = useServerFn(updateActivityLevel);
  const removeLevel = useServerFn(deleteActivityLevel);

  const [newActivity, setNewActivity] = useState("");
  const [newLevel, setNewLevel] = useState<Record<string, string>>({});

  const activities = useQuery({ queryKey: ["activities"], queryFn: () => fetchActivities() });

  async function refresh() {
    await queryClient.invalidateQueries({ queryKey: ["activities"] });
  }

  function fail(error: unknown) {
    toast.error(error instanceof Error ? error.message : "Une erreur est survenue");
  }

  async function handleCreate() {
    if (!newActivity.trim()) {
      toast.error("Donne un nom à l'activité");
      return;
    }
    try {
      await create({ data: { name: newActivity.trim() } });
      setNewActivity("");
      await refresh();
      toast.success("Activité créée avec ses niveaux par défaut");
    } catch (error) {
      fail(error);
    }
  }

  return (
    <div className="animate-slide-up space-y-8">
      <header className="space-y-1">
        <p className="mono-label text-primary">Référentiel EPS</p>
        <h1 className="display-title text-3xl lg:text-4xl">Activités & niveaux</h1>
        <p className="text-sm text-muted-foreground">
          Les niveaux définis ici alimentent le menu de sélection lors de la saisie des compétences.
        </p>
      </header>

      <div className="flex flex-wrap gap-3 rounded-3xl border border-border bg-surface p-4">
        <input
          value={newActivity}
          onChange={(e) => setNewActivity(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") void handleCreate();
          }}
          placeholder="Nouvelle activité (ex. Badminton)"
          className="min-w-[220px] flex-1 rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary"
        />
        <button
          onClick={() => void handleCreate()}
          className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-xs font-bold uppercase text-primary-foreground"
        >
          <Plus className="size-3.5" /> Créer l'activité
        </button>
      </div>

      {activities.isLoading && <p className="text-sm text-muted-foreground">Chargement…</p>}
      {!activities.isLoading && (activities.data ?? []).length === 0 && (
        <p className="text-sm text-muted-foreground">
          Aucune activité pour le moment. Crée ta première activité ci-dessus.
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {(activities.data ?? []).map((activity) => (
          <section
            key={activity.id}
            className="space-y-4 rounded-3xl border border-border bg-surface-2/40 p-5"
          >
            <div className="flex items-center gap-2">
              <input
                defaultValue={activity.name}
                onBlur={async (e) => {
                  const value = e.target.value.trim();
                  if (!value || value === activity.name) return;
                  try {
                    await rename({ data: { id: activity.id, name: value } });
                    await refresh();
                    toast.success("Activité renommée");
                  } catch (error) {
                    fail(error);
                  }
                }}
                className="display-title flex-1 rounded-xl border border-transparent bg-transparent px-2 py-1 text-xl outline-none focus:border-border focus:bg-background"
              />
              <button
                onClick={async () => {
                  if (!window.confirm(`Supprimer l'activité « ${activity.name} » ?`)) return;
                  try {
                    await removeActivity({ data: { id: activity.id } });
                    await refresh();
                    toast.success("Activité supprimée");
                  } catch (error) {
                    fail(error);
                  }
                }}
                aria-label="Supprimer l'activité"
                className="rounded-xl border border-border p-2 text-muted-foreground hover:text-primary"
              >
                <Trash2 className="size-4" />
              </button>
            </div>

            <div className="space-y-2">
              <p className="mono-label text-muted-foreground">Niveaux disponibles</p>
              {activity.levels.map((level) => (
                <div key={level.id} className="flex items-center gap-3">
                  <span
                    className="grid size-8 shrink-0 place-items-center rounded-full text-xs font-bold text-primary"
                    style={{
                      backgroundColor: `color-mix(in oklab, var(--primary) ${level.position * 16}%, transparent)`,
                    }}
                  >
                    {level.position}
                  </span>
                  <input
                    defaultValue={level.label}
                    onBlur={async (e) => {
                      const value = e.target.value.trim();
                      if (!value || value === level.label) return;
                      try {
                        await renameLevel({ data: { id: level.id, label: value } });
                        await refresh();
                        toast.success("Niveau mis à jour");
                      } catch (error) {
                        fail(error);
                      }
                    }}
                    className="flex-1 rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                  />
                  <button
                    onClick={async () => {
                      try {
                        await removeLevel({ data: { id: level.id } });
                        await refresh();
                      } catch (error) {
                        fail(error);
                      }
                    }}
                    aria-label="Supprimer le niveau"
                    className="rounded-xl border border-border p-2 text-muted-foreground hover:text-primary"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              ))}

              <div className="flex gap-2 pt-1">
                <input
                  value={newLevel[activity.id] ?? ""}
                  onChange={(e) =>
                    setNewLevel((prev) => ({ ...prev, [activity.id]: e.target.value }))
                  }
                  placeholder="Nouveau niveau"
                  className="flex-1 rounded-xl border border-dashed border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                />
                <button
                  onClick={async () => {
                    const value = (newLevel[activity.id] ?? "").trim();
                    if (!value) return;
                    try {
                      await addLevel({ data: { activityId: activity.id, label: value } });
                      setNewLevel((prev) => ({ ...prev, [activity.id]: "" }));
                      await refresh();
                    } catch (error) {
                      fail(error);
                    }
                  }}
                  className="rounded-xl border border-border px-3 py-2 text-xs font-bold uppercase text-primary"
                >
                  + Ajouter
                </button>
              </div>
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
