import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import {
  listActivities,
  createActivity,
  updateActivity,
  deleteActivity,
  createCompetency,
  updateCompetency,
  deleteCompetency,
  addCompetencyLevel,
  updateCompetencyLevel,
  deleteCompetencyLevel,
  swapCompetencyLevels,
  type ActivityTree,
  type Competency,
} from "@/lib/competencies.functions";
import { DEFAULT_LEVELS } from "@/lib/levels";
import { ActivityIconBadge } from "@/components/eps/ActivityIcon";

export const Route = createFileRoute("/_authenticated/prof/activites")({
  head: () => ({
    meta: [
      { title: "Activités et compétences cibles — EPS Progress" },
      {
        name: "description",
        content:
          "Construisez vos activités EPS : compétences cibles et niveaux propres à chaque compétence, entièrement personnalisables.",
      },
      { property: "og:title", content: "Activités et compétences cibles — EPS Progress" },
      {
        property: "og:description",
        content: "Activité → compétences cibles → niveaux : un référentiel construit en quelques clics.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: TeacherActivities,
});

function fail(error: unknown) {
  toast.error(error instanceof Error ? error.message : "Une erreur est survenue");
}

function TeacherActivities() {
  const queryClient = useQueryClient();
  const fetchActivities = useServerFn(listActivities);
  const create = useServerFn(createActivity);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const activities = useQuery({ queryKey: ["activities"], queryFn: () => fetchActivities() });

  async function refresh() {
    await queryClient.invalidateQueries({ queryKey: ["activities"] });
  }

  async function handleCreate() {
    if (!name.trim()) {
      toast.error("Donne un nom à l'activité");
      return;
    }
    try {
      await create({ data: { name: name.trim(), description: description.trim() || null } });
      setName("");
      setDescription("");
      await refresh();
      toast.success("Activité créée — ajoute ses compétences cibles");
    } catch (error) {
      fail(error);
    }
  }

  return (
    <div className="animate-slide-up space-y-8">
      <header className="space-y-1">
        <p className="mono-label text-primary">Référentiel EPS</p>
        <h1 className="display-title text-3xl lg:text-4xl">Activités & compétences cibles</h1>
        <p className="text-sm text-muted-foreground">
          Activité → compétences cibles → niveaux. Chaque compétence cible possède ses propres
          niveaux.
        </p>
      </header>

      <section className="space-y-3 rounded-3xl border border-border bg-surface p-5">
        <h2 className="display-title text-xl italic">Nouvelle activité</h2>
        <div className="grid gap-3 lg:grid-cols-[1fr_1fr_auto] lg:items-end">
          <label className="space-y-1.5">
            <span className="mono-label text-muted-foreground">Nom de l'activité</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") void handleCreate();
              }}
              placeholder="Ex. Natation"
              className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary"
            />
          </label>
          <label className="space-y-1.5">
            <span className="mono-label text-muted-foreground">Description (facultative)</span>
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Cycle, objectifs généraux…"
              className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary"
            />
          </label>
          <button
            onClick={() => void handleCreate()}
            className="flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-xs font-bold uppercase text-primary-foreground"
          >
            <Plus className="size-3.5" /> Créer l'activité
          </button>
        </div>
      </section>

      {activities.isLoading && <p className="text-sm text-muted-foreground">Chargement…</p>}
      {!activities.isLoading && (activities.data ?? []).length === 0 && (
        <p className="text-sm text-muted-foreground">
          Aucune activité pour le moment. Crée ta première activité ci-dessus.
        </p>
      )}

      <div className="space-y-6">
        {(activities.data ?? []).map((activity) => (
          <ActivityCard key={activity.id} activity={activity} onChanged={refresh} />
        ))}
      </div>
    </div>
  );
}

function ActivityCard({
  activity,
  onChanged,
}: {
  activity: ActivityTree;
  onChanged: () => Promise<void>;
}) {
  const patchActivity = useServerFn(updateActivity);
  const removeActivity = useServerFn(deleteActivity);
  const addCompetency = useServerFn(createCompetency);

  const [newCompetency, setNewCompetency] = useState("");

  async function handleAddCompetency() {
    const value = newCompetency.trim();
    if (!value) {
      toast.error("Écris l'intitulé de la compétence cible");
      return;
    }
    try {
      await addCompetency({
        data: { activityId: activity.id, label: value, levels: [...DEFAULT_LEVELS] },
      });
      setNewCompetency("");
      await onChanged();
      toast.success("Compétence cible ajoutée avec ses niveaux");
    } catch (error) {
      fail(error);
    }
  }

  return (
    <section className="space-y-5 rounded-3xl border border-border bg-surface-2/40 p-5 lg:p-6">
      <div className="flex flex-wrap items-start gap-3">
        <ActivityIconBadge name={activity.name} className="mt-1 size-12" />
        <div className="min-w-[240px] flex-1 space-y-2">
          <input
            defaultValue={activity.name}
            onBlur={async (e) => {
              const value = e.target.value.trim();
              if (!value || value === activity.name) return;
              try {
                await patchActivity({ data: { id: activity.id, name: value } });
                await onChanged();
                toast.success("Activité renommée");
              } catch (error) {
                fail(error);
              }
            }}
            className="display-title w-full rounded-xl border border-transparent bg-transparent px-2 py-1 text-2xl outline-none focus:border-border focus:bg-background"
          />
          <input
            defaultValue={activity.description ?? ""}
            placeholder="Description facultative"
            onBlur={async (e) => {
              const value = e.target.value.trim();
              if (value === (activity.description ?? "")) return;
              try {
                await patchActivity({ data: { id: activity.id, description: value || null } });
                await onChanged();
              } catch (error) {
                fail(error);
              }
            }}
            className="w-full rounded-xl border border-transparent bg-transparent px-2 py-1 text-sm text-muted-foreground outline-none focus:border-border focus:bg-background"
          />
        </div>
        <button
          onClick={async () => {
            if (!window.confirm(`Supprimer l'activité « ${activity.name} » et ses compétences ?`))
              return;
            try {
              await removeActivity({ data: { id: activity.id } });
              await onChanged();
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

      <div className="space-y-4">
        <p className="mono-label text-primary">Compétences cibles</p>
        {activity.competencies.length === 0 && (
          <p className="text-sm text-muted-foreground">
            Aucune compétence cible. Ajoute la première ci-dessous.
          </p>
        )}
        {activity.competencies.map((competency) => (
          <CompetencyCard key={competency.id} competency={competency} onChanged={onChanged} />
        ))}

        <div className="flex flex-wrap gap-2">
          <input
            value={newCompetency}
            onChange={(e) => setNewCompetency(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void handleAddCompetency();
            }}
            placeholder="Ex. Savoir nager 25 mètres sans s'arrêter"
            className="min-w-[240px] flex-1 rounded-xl border border-dashed border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary"
          />
          <button
            onClick={() => void handleAddCompetency()}
            className="flex items-center gap-2 rounded-xl border border-primary px-4 py-2.5 text-xs font-bold uppercase text-primary"
          >
            <Plus className="size-3.5" /> Ajouter une compétence cible
          </button>
        </div>
      </div>
    </section>
  );
}

function CompetencyCard({
  competency,
  onChanged,
}: {
  competency: Competency;
  onChanged: () => Promise<void>;
}) {
  const patchCompetency = useServerFn(updateCompetency);
  const removeCompetency = useServerFn(deleteCompetency);
  const addLevel = useServerFn(addCompetencyLevel);
  const patchLevel = useServerFn(updateCompetencyLevel);
  const removeLevel = useServerFn(deleteCompetencyLevel);
  const swapLevels = useServerFn(swapCompetencyLevels);

  const [newLevel, setNewLevel] = useState("");

  async function handleAddLevel() {
    const value = newLevel.trim();
    if (!value) return;
    try {
      await addLevel({ data: { competencyId: competency.id, label: value } });
      setNewLevel("");
      await onChanged();
    } catch (error) {
      fail(error);
    }
  }

  return (
    <article className="space-y-3 rounded-2xl border border-border bg-background p-4">
      <div className="flex items-center gap-2">
        <input
          defaultValue={competency.label}
          onBlur={async (e) => {
            const value = e.target.value.trim();
            if (!value || value === competency.label) return;
            try {
              await patchCompetency({ data: { id: competency.id, label: value } });
              await onChanged();
              toast.success("Compétence cible mise à jour");
            } catch (error) {
              fail(error);
            }
          }}
          className="flex-1 rounded-xl border border-border bg-surface px-3 py-2 text-sm font-bold outline-none focus:border-primary"
        />
        <button
          onClick={async () => {
            if (!window.confirm(`Supprimer la compétence « ${competency.label} » ?`)) return;
            try {
              await removeCompetency({ data: { id: competency.id } });
              await onChanged();
              toast.success("Compétence cible supprimée");
            } catch (error) {
              fail(error);
            }
          }}
          aria-label="Supprimer la compétence cible"
          className="rounded-xl border border-border p-2 text-muted-foreground hover:text-primary"
        >
          <Trash2 className="size-4" />
        </button>
      </div>

      <label className="block space-y-1.5">
        <span className="mono-label text-muted-foreground">
          Conseil pour progresser (visible par l'élève)
        </span>
        <input
          defaultValue={competency.progress_tip ?? ""}
          placeholder="Ex. : viser le fond de court pour repousser l'adversaire"
          onBlur={async (e) => {
            const value = e.target.value.trim();
            if (value === (competency.progress_tip ?? "")) return;
            try {
              await patchCompetency({ data: { id: competency.id, progressTip: value } });
              await onChanged();
              toast.success("Conseil enregistré");
            } catch (error) {
              fail(error);
            }
          }}
          className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-primary"
        />
      </label>



      <div className="space-y-2 pl-1">
        <p className="mono-label text-muted-foreground">Niveaux de cette compétence</p>
        {competency.levels.map((level, index) => {
          const previous = competency.levels[index - 1];
          const next = competency.levels[index + 1];
          return (
            <div key={level.id} className="flex items-start gap-2">
              <span
                className="grid size-8 shrink-0 place-items-center rounded-full text-xs font-bold text-primary"
                style={{
                  backgroundColor: `color-mix(in oklab, var(--primary) ${(index + 1) * 16}%, transparent)`,
                }}
              >
                {index + 1}
              </span>
              <div className="flex-1 space-y-1.5">
                <input
                  defaultValue={level.label}
                  onBlur={async (e) => {
                    const value = e.target.value.trim();
                    if (!value || value === level.label) return;
                    try {
                      await patchLevel({ data: { id: level.id, label: value } });
                      await onChanged();
                    } catch (error) {
                      fail(error);
                    }
                  }}
                  className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-primary"
                />
                <input
                  defaultValue={level.tip ?? ""}
                  placeholder="Conseil pour ce niveau (facultatif)"
                  onBlur={async (e) => {
                    const value = e.target.value.trim();
                    if (value === (level.tip ?? "")) return;
                    try {
                      await patchLevel({ data: { id: level.id, tip: value } });
                      await onChanged();
                      toast.success("Conseil du niveau enregistré");
                    } catch (error) {
                      fail(error);
                    }
                  }}
                  className="w-full rounded-xl border border-dashed border-border bg-surface px-3 py-1.5 text-xs outline-none focus:border-primary"
                />
              </div>
              <button
                disabled={!previous}
                onClick={async () => {
                  if (!previous) return;
                  try {
                    await swapLevels({ data: { firstId: level.id, secondId: previous.id } });
                    await onChanged();
                  } catch (error) {
                    fail(error);
                  }
                }}
                aria-label="Monter le niveau"
                className="rounded-lg border border-border p-2 text-muted-foreground hover:text-primary disabled:opacity-30"
              >
                <ArrowUp className="size-3.5" />
              </button>
              <button
                disabled={!next}
                onClick={async () => {
                  if (!next) return;
                  try {
                    await swapLevels({ data: { firstId: level.id, secondId: next.id } });
                    await onChanged();
                  } catch (error) {
                    fail(error);
                  }
                }}
                aria-label="Descendre le niveau"
                className="rounded-lg border border-border p-2 text-muted-foreground hover:text-primary disabled:opacity-30"
              >
                <ArrowDown className="size-3.5" />
              </button>
              <button
                onClick={async () => {
                  try {
                    await removeLevel({ data: { id: level.id } });
                    await onChanged();
                  } catch (error) {
                    fail(error);
                  }
                }}
                aria-label="Supprimer le niveau"
                className="rounded-lg border border-border p-2 text-muted-foreground hover:text-primary"
              >
                <Trash2 className="size-3.5" />
              </button>
            </div>
          );
        })}

        <div className="flex gap-2 pt-1">
          <input
            value={newLevel}
            onChange={(e) => setNewLevel(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void handleAddLevel();
            }}
            placeholder="Nouveau niveau (ex. Réalise 25 mètres)"
            className="flex-1 rounded-xl border border-dashed border-border bg-surface px-3 py-2 text-sm outline-none focus:border-primary"
          />
          <button
            onClick={() => void handleAddLevel()}
            className="rounded-xl border border-border px-3 py-2 text-xs font-bold uppercase text-primary"
          >
            + Ajouter un niveau
          </button>
        </div>
      </div>
    </article>
  );
}
