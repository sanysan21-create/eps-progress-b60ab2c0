import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ImagePlus, Pencil, Trash2, X } from "lucide-react";
import { toast } from "sonner";

import { listActivities } from "@/lib/competencies.functions";
import { listClasses } from "@/lib/classes.functions";
import {
  deleteProgramSession,
  listProgramSessions,
  saveProgramSession,
} from "@/lib/program.functions";
import { sessionWhen } from "@/lib/program";
import { activityEmoji } from "@/lib/activity-emoji";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/prof/programme")({
  head: () => ({
    meta: [
      { title: "Programme des séances — EPS Progress" },
      {
        name: "description",
        content:
          "Planifiez les activités dans le temps : date ou période, activité, objectif de séance. Les élèves voient le programme en lecture seule.",
      },
      { property: "og:title", content: "Programme des séances — EPS Progress" },
      {
        property: "og:description",
        content: "Programmation des activités et objectifs de séance pour vos classes.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: TeacherProgram,
});

type Draft = {
  id: string | null;
  classId: string;
  activityId: string;
  sessionDate: string;
  periodLabel: string;
  objective: string;
  description: string;
  scaleImagePath: string | null;
  scaleImageUrl: string | null;
};

function emptyDraft(): Draft {
  return {
    id: null,
    classId: "",
    activityId: "",
    sessionDate: "",
    periodLabel: "",
    objective: "",
    description: "",
    scaleImagePath: null,
    scaleImageUrl: null,
  };
}

function TeacherProgram() {
  const queryClient = useQueryClient();
  const fetchSessions = useServerFn(listProgramSessions);
  const fetchActivities = useServerFn(listActivities);
  const fetchClasses = useServerFn(listClasses);
  const save = useServerFn(saveProgramSession);
  const remove = useServerFn(deleteProgramSession);

  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [formTab, setFormTab] = useState<"seance" | "bareme">("seance");

  async function handleScaleUpload(file: File) {
    if (!file.type.startsWith("image/")) {
      toast.error("Choisis une image (JPG, PNG…).");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image trop lourde (5 Mo maximum).");
      return;
    }
    setUploading(true);
    try {
      const { data: auth } = await supabase.auth.getUser();
      const userId = auth.user?.id;
      if (!userId) throw new Error("Session expirée, reconnecte-toi.");
      const extension = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
      const path = `${userId}/${crypto.randomUUID()}.${extension}`;
      const { error } = await supabase.storage
        .from("program-scales")
        .upload(path, file, { contentType: file.type, upsert: false });
      if (error) throw new Error(error.message);
      const { data: signed } = await supabase.storage
        .from("program-scales")
        .createSignedUrl(path, 60 * 60);
      setDraft((current) => ({
        ...current,
        scaleImagePath: path,
        scaleImageUrl: signed?.signedUrl ?? null,
      }));
      toast.success("Barème ajouté");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Envoi impossible");
    } finally {
      setUploading(false);
    }
  }

  const sessions = useQuery({ queryKey: ["program-sessions"], queryFn: () => fetchSessions() });
  const activities = useQuery({ queryKey: ["activities"], queryFn: () => fetchActivities() });
  const classes = useQuery({ queryKey: ["classes"], queryFn: () => fetchClasses() });

  async function handleSave() {
    setSaving(true);
    try {
      await save({
        data: {
          id: draft.id,
          classId: draft.classId || null,
          activityId: draft.activityId || null,
          sessionDate: draft.sessionDate || null,
          periodLabel: draft.periodLabel.trim() || null,
          objective: draft.objective.trim() || null,
          description: draft.description.trim() || null,
          scaleImagePath: draft.scaleImagePath,
        },
      });
      toast.success(draft.id ? "Séance mise à jour" : "Séance ajoutée au programme");
      setDraft(emptyDraft());
      await queryClient.invalidateQueries({ queryKey: ["program-sessions"] });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Enregistrement impossible");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    try {
      await remove({ data: { id } });
      if (draft.id === id) setDraft(emptyDraft());
      await queryClient.invalidateQueries({ queryKey: ["program-sessions"] });
      toast.success("Séance supprimée");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Suppression impossible");
    }
  }

  return (
    <div className="space-y-8 p-6 lg:p-10">
      <header className="space-y-1">
        <h1 className="display-title text-3xl italic tracking-tighter">Programme</h1>
        <p className="text-sm text-muted-foreground">
          Date ou période → activité → objectif → enregistrer. Les élèves voient la prochaine séance
          et les activités à venir.
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
        <section className="space-y-4 rounded-2xl border border-border bg-surface p-5">
          <div className="flex items-center justify-between">
            <h2 className="mono-label text-muted-foreground">
              {draft.id ? "Modifier la séance" : "Nouvelle séance"}
            </h2>
            {draft.id && (
              <button
                type="button"
                onClick={() => setDraft(emptyDraft())}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary"
              >
                <X className="size-3" /> Annuler
              </button>
            )}
          </div>

          <label className="block space-y-1">
            <span className="text-xs text-muted-foreground">Date de la séance</span>
            <input
              type="date"
              value={draft.sessionDate}
              onChange={(event) => setDraft({ ...draft, sessionDate: event.target.value })}
              className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
            />
          </label>

          <label className="block space-y-1">
            <span className="text-xs text-muted-foreground">
              Ou période (ex. « Semaine du 7 septembre », « Octobre »)
            </span>
            <input
              value={draft.periodLabel}
              onChange={(event) => setDraft({ ...draft, periodLabel: event.target.value })}
              placeholder="Semaine du 7 septembre"
              className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
            />
          </label>

          <label className="block space-y-1">
            <span className="text-xs text-muted-foreground">Activité</span>
            <select
              value={draft.activityId}
              onChange={(event) => setDraft({ ...draft, activityId: event.target.value })}
              className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
            >
              <option value="">Choisir une activité…</option>
              {(activities.data ?? []).map((activity) => (
                <option key={activity.id} value={activity.id}>
                  {activity.name}
                </option>
              ))}
            </select>
          </label>

          <label className="block space-y-1">
            <span className="text-xs text-muted-foreground">Classe</span>
            <select
              value={draft.classId}
              onChange={(event) => setDraft({ ...draft, classId: event.target.value })}
              className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
            >
              <option value="">Toutes mes classes</option>
              {(classes.data ?? []).map((row) => (
                <option key={row.id} value={row.id}>
                  {row.name} · {row.school_year}
                </option>
              ))}
            </select>
          </label>

          <label className="block space-y-1">
            <span className="text-xs text-muted-foreground">Objectif de la séance</span>
            <textarea
              value={draft.objective}
              onChange={(event) => setDraft({ ...draft, objective: event.target.value })}
              rows={3}
              placeholder="Améliorer sa respiration et maintenir son effort sur 25 mètres."
              className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
            />
          </label>

          <label className="block space-y-1">
            <span className="text-xs text-muted-foreground">Description courte (optionnel)</span>
            <input
              value={draft.description}
              onChange={(event) => setDraft({ ...draft, description: event.target.value })}
              className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
            />
          </label>

          <div className="space-y-2">
            <span className="text-xs text-muted-foreground">
              Image du barème (visible par les élèves)
            </span>
            {draft.scaleImageUrl || draft.scaleImagePath ? (
              <div className="space-y-2 rounded-xl border border-border bg-background p-2">
                {draft.scaleImageUrl && (
                  <img
                    src={draft.scaleImageUrl}
                    alt="Barème de la séance"
                    className="max-h-48 w-full rounded-lg object-contain"
                  />
                )}
                <button
                  type="button"
                  onClick={() => setDraft({ ...draft, scaleImagePath: null, scaleImageUrl: null })}
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="size-3" /> Retirer le barème
                </button>
              </div>
            ) : (
              <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-dashed border-border bg-background px-3 py-3 text-sm text-muted-foreground hover:border-primary hover:text-primary">
                <ImagePlus className="size-4" />
                {uploading ? "Envoi…" : "Ajouter une image de barème"}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  disabled={uploading}
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    event.target.value = "";
                    if (file) void handleScaleUpload(file);
                  }}
                />
              </label>
            )}
          </div>

          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={saving}
            className="w-full rounded-xl bg-primary px-4 py-3 text-sm font-bold uppercase text-primary-foreground disabled:opacity-60"
          >
            {saving ? "Enregistrement…" : draft.id ? "Mettre à jour" : "Enregistrer"}
          </button>
        </section>

        <section className="space-y-3">
          <h2 className="mono-label text-muted-foreground">Programmation</h2>
          {sessions.isPending ? (
            <div className="h-24 animate-pulse rounded-2xl border border-border bg-surface" />
          ) : (sessions.data ?? []).length === 0 ? (
            <p className="rounded-2xl border border-border/60 bg-surface/60 px-5 py-6 text-sm text-muted-foreground">
              Aucune séance planifiée pour le moment.
            </p>
          ) : (
            <ul className="space-y-3">
              {(sessions.data ?? []).map((session) => (
                <li key={session.id} className="rounded-2xl border border-border bg-surface p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="mono-label text-primary">{sessionWhen(session)}</p>
                      <p className="mt-1 flex items-center gap-2 text-base font-semibold">
                        <span aria-hidden>{activityEmoji(session.activity_name)}</span>
                        {session.activity_name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {session.class_name ?? "Toutes mes classes"}
                      </p>
                      {session.objective && (
                        <p className="mt-2 text-sm leading-relaxed text-foreground/80">
                          {session.objective}
                        </p>
                      )}
                      {session.description && (
                        <p className="mt-1 text-xs text-muted-foreground">{session.description}</p>
                      )}
                      {session.scale_image_url && (
                        <a
                          href={session.scale_image_url}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-3 inline-flex items-center gap-2 rounded-full border border-border px-3 py-1 text-xs text-muted-foreground hover:border-primary hover:text-primary"
                        >
                          📊 Voir le barème
                        </a>
                      )}
                    </div>
                    <div className="flex shrink-0 items-center gap-3">
                      <button
                        type="button"
                        onClick={() =>
                          setDraft({
                            id: session.id,
                            classId: session.class_id ?? "",
                            activityId: session.activity_id ?? "",
                            sessionDate: session.session_date ?? "",
                            periodLabel: session.period_label ?? "",
                            objective: session.objective ?? "",
                            description: session.description ?? "",
                            scaleImagePath: session.scale_image_path,
                            scaleImageUrl: session.scale_image_url,
                          })
                        }
                        aria-label={`Modifier la séance ${session.activity_name}`}
                        className="text-muted-foreground hover:text-primary"
                      >
                        <Pencil className="size-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleDelete(session.id)}
                        aria-label={`Supprimer la séance ${session.activity_name}`}
                        className="text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
