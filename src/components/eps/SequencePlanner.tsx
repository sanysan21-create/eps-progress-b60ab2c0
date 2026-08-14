import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";

import {
  deleteProgramSequence,
  listProgramSequences,
  saveProgramSequence,
} from "@/lib/program-sequences.functions";
import { sequenceRange } from "@/lib/program-sequences";
import { listActivities } from "@/lib/competencies.functions";
import { listClasses } from "@/lib/classes.functions";
import { ActivityIcon } from "@/components/eps/ActivityIcon";
import { NumberField } from "@/components/eps/NumberField";


type Draft = {
  id: string | null;
  name: string;
  classId: string;
  activityId: string;
  fromSession: string;
  toSession: string;
};

const empty = (): Draft => ({
  id: null,
  name: "",
  classId: "",
  activityId: "",
  fromSession: "",
  toSession: "",
});

/** Programmation des séquences (ex. « Séquence 1 — Basketball, séances 1 à 6 »). */
export function SequencePlanner() {
  const queryClient = useQueryClient();
  const fetchSequences = useServerFn(listProgramSequences);
  const fetchActivities = useServerFn(listActivities);
  const fetchClasses = useServerFn(listClasses);
  const save = useServerFn(saveProgramSequence);
  const remove = useServerFn(deleteProgramSequence);

  const sequences = useQuery({ queryKey: ["program-sequences"], queryFn: () => fetchSequences() });
  const activities = useQuery({ queryKey: ["activities"], queryFn: () => fetchActivities() });
  const classes = useQuery({ queryKey: ["classes"], queryFn: () => fetchClasses() });

  const [draft, setDraft] = useState<Draft>(empty);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!draft.name.trim()) {
      toast.error("Donne un nom à la séquence (ex. « Séquence 1 — Basketball »).");
      return;
    }
    setSaving(true);
    try {
      await save({
        data: {
          id: draft.id,
          name: draft.name.trim(),
          classId: draft.classId || null,
          activityId: draft.activityId || null,
          fromSession: draft.fromSession ? Number(draft.fromSession) : null,
          toSession: draft.toSession ? Number(draft.toSession) : null,
        },
      });
      toast.success(draft.id ? "Séquence mise à jour" : "Séquence ajoutée");
      setDraft(empty());
      await queryClient.invalidateQueries({ queryKey: ["program-sequences"] });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Enregistrement impossible");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    try {
      await remove({ data: { id } });
      if (draft.id === id) setDraft(empty());
      await queryClient.invalidateQueries({ queryKey: ["program-sequences"] });
      toast.success("Séquence supprimée");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Suppression impossible");
    }
  }

  return (
    <section className="space-y-4 rounded-2xl border border-border bg-surface p-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="mono-label text-muted-foreground">Programmation des séquences</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Les élèves retrouvent ces séquences dans leur onglet Programme.
          </p>
        </div>
        {draft.id && (
          <button
            type="button"
            onClick={() => setDraft(empty())}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary"
          >
            <X className="size-3" /> Annuler
          </button>
        )}
      </div>

      <div className="grid gap-3 md:grid-cols-[1fr_1fr_1fr_90px_90px_auto]">
        <input
          value={draft.name}
          onChange={(event) => setDraft({ ...draft, name: event.target.value })}
          placeholder="Séquence 1 — Basketball"
          className="rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
        />
        <select
          value={draft.activityId}
          onChange={(event) => setDraft({ ...draft, activityId: event.target.value })}
          className="rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
        >
          <option value="">Activité (optionnel)…</option>
          {(activities.data ?? []).map((activity) => (
            <option key={activity.id} value={activity.id}>
              {activity.name}
            </option>
          ))}
        </select>
        <select
          value={draft.classId}
          onChange={(event) => setDraft({ ...draft, classId: event.target.value })}
          className="rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
        >
          <option value="">Toutes mes classes</option>
          {(classes.data ?? []).map((row) => (
            <option key={row.id} value={row.id}>
              {row.name} · {row.school_year}
            </option>
          ))}
        </select>
        <NumberField
          min={1}
          max={40}
          step={1}
          value={draft.fromSession}
          onValueChange={(fromSession) => setDraft({ ...draft, fromSession })}
          placeholder="De"
          aria-label="Première séance"
          className="rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
        />
        <NumberField
          min={1}
          max={40}
          step={1}
          value={draft.toSession}
          onValueChange={(toSession) => setDraft({ ...draft, toSession })}
          placeholder="À"
          aria-label="Dernière séance"
          className="rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
        />

        <button
          type="button"
          onClick={() => void handleSave()}
          disabled={saving}
          className="inline-flex items-center justify-center gap-1 rounded-xl bg-primary px-4 py-2 text-sm font-bold uppercase text-primary-foreground disabled:opacity-60"
        >
          <Plus className="size-4" />
          {draft.id ? "Mettre à jour" : "Ajouter"}
        </button>
      </div>

      {sequences.isPending ? (
        <div className="h-16 animate-pulse rounded-xl border border-border bg-background" />
      ) : (sequences.data ?? []).length === 0 ? (
        <p className="rounded-xl border border-border/60 bg-background/60 px-4 py-4 text-sm text-muted-foreground">
          Aucune séquence programmée pour le moment.
        </p>
      ) : (
        <ul className="grid gap-3 md:grid-cols-2">
          {(sequences.data ?? []).map((sequence) => (
            <li
              key={sequence.id}
              className="flex items-start justify-between gap-3 rounded-xl border border-border bg-background px-4 py-3"
            >
              <div className="min-w-0">
                <p className="flex items-center gap-2 text-sm font-semibold">
                  <ActivityIcon name={sequence.activity_name ?? sequence.name} className="size-4 text-primary" />
                  {sequence.name}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {[
                    sequenceRange(sequence),
                    sequence.activity_name,
                    sequence.class_name ?? "Toutes mes classes",
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <button
                  type="button"
                  onClick={() =>
                    setDraft({
                      id: sequence.id,
                      name: sequence.name,
                      classId: sequence.class_id ?? "",
                      activityId: sequence.activity_id ?? "",
                      fromSession: sequence.from_session ? String(sequence.from_session) : "",
                      toSession: sequence.to_session ? String(sequence.to_session) : "",
                    })
                  }
                  className="text-xs text-muted-foreground hover:text-primary"
                >
                  Modifier
                </button>
                <button
                  type="button"
                  onClick={() => void handleDelete(sequence.id)}
                  className="text-muted-foreground hover:text-destructive"
                  aria-label="Supprimer la séquence"
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
