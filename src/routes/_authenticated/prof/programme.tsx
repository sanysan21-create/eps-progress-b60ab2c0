import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { CalendarDays, Image as ImageIcon, Paperclip, Plus, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { listActivities } from "@/lib/competencies.functions";
import { listClasses } from "@/lib/classes.functions";
import {
  addSequenceSession,
  addSessionFile,
  createSequence,
  deleteSequence,
  deleteSequenceScaleImage,
  deleteSequenceSession,
  deleteSessionFile,
  listSequenceDetails,
  saveSequenceScaleImage,
  saveSequenceSession,
  updateSequence,
} from "@/lib/program-builder.functions";
import { longDate, shortDate } from "@/lib/program-builder";
import type { SequenceDetail } from "@/lib/program-builder";
import { deleteProgramSession, listProgramSessions } from "@/lib/program.functions";
import { sessionWhen } from "@/lib/program";
import { ActivityIcon } from "@/components/eps/ActivityIcon";

export const Route = createFileRoute("/_authenticated/prof/programme")({
  head: () => ({
    meta: [
      { title: "Programme : séquences et séances — EPS Progress" },
      {
        name: "description",
        content:
          "Construisez une séquence complète : classe, activité, période, séances numérotées, objectifs, ressources et barème.",
      },
      { property: "og:title", content: "Programme : séquences et séances — EPS Progress" },
      {
        property: "og:description",
        content: "Séquence → séances → contenu → barème, pour vos classes d'EPS.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: TeacherProgram,
});

const FIELD =
  "w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary";
const CARD = "space-y-4 rounded-2xl border border-border bg-surface p-5";
const LABEL = "text-xs text-muted-foreground";



function TeacherProgram() {
  const queryClient = useQueryClient();
  const fetchSequences = useServerFn(listSequenceDetails);
  const fetchActivities = useServerFn(listActivities);
  const fetchClasses = useServerFn(listClasses);
  const fetchLegacy = useServerFn(listProgramSessions);
  const create = useServerFn(createSequence);
  const update = useServerFn(updateSequence);
  const removeSequence = useServerFn(deleteSequence);
  const addSession = useServerFn(addSequenceSession);
  const saveSession = useServerFn(saveSequenceSession);
  const removeSession = useServerFn(deleteSequenceSession);
  const uploadFile = useServerFn(addSessionFile);
  const removeFile = useServerFn(deleteSessionFile);
  const saveScaleImage = useServerFn(saveSequenceScaleImage);
  const deleteScaleImage = useServerFn(deleteSequenceScaleImage);
  const removeLegacy = useServerFn(deleteProgramSession);

  const sequences = useQuery({ queryKey: ["sequence-details"], queryFn: () => fetchSequences() });
  const activities = useQuery({ queryKey: ["activities"], queryFn: () => fetchActivities() });
  const classes = useQuery({ queryKey: ["classes"], queryFn: () => fetchClasses() });
  const legacy = useQuery({ queryKey: ["program-sessions"], queryFn: () => fetchLegacy() });

  const [form, setForm] = useState({
    name: "",
    classId: "",
    activityId: "",
    startDate: "",
    endDate: "",
  });
  const [creating, setCreating] = useState(false);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const list = sequences.data ?? [];
  const current: SequenceDetail | null = useMemo(
    () => list.find((row) => row.id === currentId) ?? list[0] ?? null,
    [list, currentId],
  );
  const session = useMemo(
    () => current?.sessions.find((row) => row.id === sessionId) ?? current?.sessions[0] ?? null,
    [current, sessionId],
  );

  const [sessionDraft, setSessionDraft] = useState({ date: "", objective: "", keyPoints: "" });
  useEffect(() => {
    setSessionDraft({
      date: session?.session_date ?? "",
      objective: session?.objective ?? "",
      keyPoints: session?.key_points ?? "",
    });
  }, [session?.id, session?.session_date, session?.objective, session?.key_points]);




  async function refresh() {
    await queryClient.invalidateQueries({ queryKey: ["sequence-details"] });
    await queryClient.invalidateQueries({ queryKey: ["program-sessions"] });
  }

  async function handleCreate() {
    if (creating) return;
    const problem =
      !form.name.trim()
        ? "Donne un nom à la séquence."
        : !form.classId
          ? "Choisis une classe."
          : !form.activityId
            ? "Choisis une activité."
            : !form.startDate || !form.endDate
              ? "Choisis la période (du … au …)."
              : form.endDate < form.startDate
                ? "La date de fin doit suivre le début."
                : null;
    if (problem) {
      toast.error(problem);
      return;
    }

    setCreating(true);
    try {
      const result = await create({
        data: {
          name: form.name.trim(),
          classId: form.classId,
          activityId: form.activityId,
          startDate: form.startDate,
          endDate: form.endDate,
        },
      });
      toast.success("Séquence créée : les séances ont été générées.");
      setForm({ name: "", classId: "", activityId: "", startDate: "", endDate: "" });
      setCurrentId(result.id);
      setSessionId(null);
      await refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Création impossible");
    } finally {
      setCreating(false);
    }
  }

  async function handleUpdateSequence() {
    if (!current || busy) return;
    setBusy(true);
    try {
      await update({
        data: {
          id: current.id,
          name: current.name,
          classId: current.class_id ?? "",
          activityId: current.activity_id ?? "",
          startDate: current.start_date,
          endDate: current.end_date,
        },
      });
      toast.success("Séquence mise à jour");
      await refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Enregistrement impossible");
    } finally {
      setBusy(false);
    }
  }

  async function handleSaveSession() {
    if (!session || busy) return;
    setBusy(true);
    try {
      await saveSession({
        data: {
          id: session.id,
          sessionDate: sessionDraft.date || null,
          objective: sessionDraft.objective.trim() || null,
          keyPoints: sessionDraft.keyPoints.trim() || null,
        },
      });
      toast.success("Séance enregistrée");
      await refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Enregistrement impossible");
    } finally {
      setBusy(false);
    }
  }

  async function handleAddSession() {
    if (!current || busy) return;
    setBusy(true);
    try {
      const result = await addSession({ data: { sequenceId: current.id } });
      setSessionId(result.id);
      await refresh();
      toast.success("Séance ajoutée");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Ajout impossible");
    } finally {
      setBusy(false);
    }
  }

  async function handleDeleteSession(id: string) {
    if (!window.confirm("Supprimer cette séance et ses ressources ?")) return;
    setBusy(true);
    try {
      await removeSession({ data: { id } });
      if (sessionId === id) setSessionId(null);
      await refresh();
      toast.success("Séance supprimée");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Suppression impossible");
    } finally {
      setBusy(false);
    }
  }

  async function handleDeleteSequence(id: string) {
    if (!window.confirm("Supprimer la séquence, ses séances et son barème ?")) return;
    setBusy(true);
    try {
      await removeSequence({ data: { id } });
      setCurrentId(null);
      setSessionId(null);
      await refresh();
      toast.success("Séquence supprimée");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Suppression impossible");
    } finally {
      setBusy(false);
    }
  }

  async function handleUpload(file: File) {
    if (!session) return;
    if (file.size > 8 * 1024 * 1024) {
      toast.error("Fichier trop lourd (8 Mo maximum).");
      return;
    }
    setBusy(true);
    try {
      const buffer = new Uint8Array(await file.arrayBuffer());
      let binary = "";
      for (let i = 0; i < buffer.length; i += 8192) {
        binary += String.fromCharCode(...buffer.subarray(i, i + 8192));
      }
      await uploadFile({
        data: {
          sessionId: session.id,
          name: file.name.slice(0, 160),
          contentType: file.type || "application/pdf",
          dataBase64: btoa(binary),
        },
      });
      await refresh();
      toast.success("Ressource ajoutée");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Envoi impossible");
    } finally {
      setBusy(false);
    }
  }

  async function handleScaleUpload(file: File) {
    if (!current || busy) return;
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
      toast.error("Choisis une image (PNG, JPG ou WEBP).");
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      toast.error("Image trop lourde (8 Mo maximum).");
      return;
    }
    setBusy(true);
    try {
      const buffer = new Uint8Array(await file.arrayBuffer());
      let binary = "";
      for (let i = 0; i < buffer.length; i += 8192) {
        binary += String.fromCharCode(...buffer.subarray(i, i + 8192));
      }
      await saveScaleImage({
        data: { sequenceId: current.id, contentType: file.type, dataBase64: btoa(binary) },
      });
      await refresh();
      toast.success("Barème enregistré");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Envoi impossible");
    } finally {
      setBusy(false);
    }
  }

  async function handleScaleDelete() {
    if (!current || busy) return;
    if (!window.confirm("Supprimer l'image du barème ?")) return;
    setBusy(true);
    try {
      await deleteScaleImage({ data: { sequenceId: current.id } });
      await refresh();
      toast.success("Image supprimée");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Suppression impossible");
    } finally {
      setBusy(false);
    }
  }

  const orphanSessions = (legacy.data ?? []).filter(
    (row) => !list.some((sequence) => sequence.sessions.some((s) => s.id === row.id)),
  );

  return (
    <div className="space-y-8 p-6 lg:p-10">
      <header className="space-y-1">
        <h1 className="display-title text-3xl italic tracking-tighter">Programme</h1>
        <p className="text-sm text-muted-foreground">
          Séquence → séances → contenu de chaque séance → barème.
        </p>
      </header>

      {/* 1. Nouvelle séquence */}
      <section className={CARD}>
        <h2 className="mono-label text-muted-foreground">Nouvelle séquence</h2>
        <div className="grid gap-3 md:grid-cols-2">
          <label className="block space-y-1 md:col-span-2">
            <span className={LABEL}>Nom de la séquence</span>
            <input
              value={form.name}
              onChange={(event) => setForm({ ...form, name: event.target.value })}
              placeholder="Basketball — Construire l'échange"
              className={FIELD}
            />
          </label>
          <label className="block space-y-1">
            <span className={LABEL}>Classe</span>
            <select
              value={form.classId}
              onChange={(event) => setForm({ ...form, classId: event.target.value })}
              className={FIELD}
            >
              <option value="">Choisir une classe…</option>
              {(classes.data ?? []).map((row) => (
                <option key={row.id} value={row.id}>
                  {row.name} · {row.school_year}
                </option>
              ))}
            </select>
          </label>
          <label className="block space-y-1">
            <span className={LABEL}>Activité</span>
            <select
              value={form.activityId}
              onChange={(event) => setForm({ ...form, activityId: event.target.value })}
              className={FIELD}
            >
              <option value="">Choisir une activité…</option>
              {(activities.data ?? []).map((row) => (
                <option key={row.id} value={row.id}>
                  {row.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block space-y-1">
            <span className={LABEL}>Du</span>
            <input
              type="date"
              value={form.startDate}
              onChange={(event) => setForm({ ...form, startDate: event.target.value })}
              className={FIELD}
            />
          </label>
          <label className="block space-y-1">
            <span className={LABEL}>Au</span>
            <input
              type="date"
              value={form.endDate}
              onChange={(event) => setForm({ ...form, endDate: event.target.value })}
              className={FIELD}
            />
          </label>
        </div>
        <button
          type="button"
          onClick={() => void handleCreate()}
          disabled={creating}
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-bold uppercase text-primary-foreground disabled:opacity-60"
        >
          <CalendarDays className="size-4" />
          {creating ? "Création…" : "Créer la séquence"}
        </button>
        <p className="text-xs text-muted-foreground">
          Une séance est générée automatiquement par semaine sur la période choisie ; chaque date
          reste modifiable.
        </p>
      </section>

      {/* Séquence actuelle */}
      {sequences.isPending ? (
        <div className="h-24 animate-pulse rounded-2xl border border-border bg-surface" />
      ) : list.length === 0 ? (
        <p className="rounded-2xl border border-border/60 bg-surface/60 px-4 py-6 text-sm text-muted-foreground">
          Aucune séquence pour le moment : crée ta première séquence ci-dessus.
        </p>
      ) : (
        <>
          <section className={CARD}>
            <h2 className="mono-label text-muted-foreground">Séquence actuelle</h2>
            <div className="flex flex-wrap gap-2">
              {list.map((row) => (
                <button
                  key={row.id}
                  type="button"
                  onClick={() => {
                    setCurrentId(row.id);
                    setSessionId(null);
                  }}
                  className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-semibold transition-colors ${
                    current?.id === row.id
                      ? "border-primary bg-primary/15 text-foreground"
                      : "border-border text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <ActivityIcon name={row.activity_name ?? row.name} className="size-4 text-primary" />
                  {row.name}
                </button>
              ))}
            </div>

            {current && (
              <div className="grid gap-3 md:grid-cols-2">
                <label className="block space-y-1 md:col-span-2">
                  <span className={LABEL}>Nom</span>
                  <input
                    value={current.name}
                    onChange={(event) =>
                      queryClient.setQueryData<SequenceDetail[]>(["sequence-details"], (rows) =>
                        (rows ?? []).map((row) =>
                          row.id === current.id ? { ...row, name: event.target.value } : row,
                        ),
                      )
                    }
                    className={FIELD}
                  />
                </label>
                <label className="block space-y-1">
                  <span className={LABEL}>Classe</span>
                  <select
                    value={current.class_id ?? ""}
                    onChange={(event) =>
                      queryClient.setQueryData<SequenceDetail[]>(["sequence-details"], (rows) =>
                        (rows ?? []).map((row) =>
                          row.id === current.id ? { ...row, class_id: event.target.value } : row,
                        ),
                      )
                    }
                    className={FIELD}
                  >
                    {(classes.data ?? []).map((row) => (
                      <option key={row.id} value={row.id}>
                        {row.name} · {row.school_year}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block space-y-1">
                  <span className={LABEL}>Activité</span>
                  <select
                    value={current.activity_id ?? ""}
                    onChange={(event) =>
                      queryClient.setQueryData<SequenceDetail[]>(["sequence-details"], (rows) =>
                        (rows ?? []).map((row) =>
                          row.id === current.id ? { ...row, activity_id: event.target.value } : row,
                        ),
                      )
                    }
                    className={FIELD}
                  >
                    {(activities.data ?? []).map((row) => (
                      <option key={row.id} value={row.id}>
                        {row.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block space-y-1">
                  <span className={LABEL}>Du</span>
                  <input
                    type="date"
                    value={current.start_date ?? ""}
                    onChange={(event) =>
                      queryClient.setQueryData<SequenceDetail[]>(["sequence-details"], (rows) =>
                        (rows ?? []).map((row) =>
                          row.id === current.id
                            ? { ...row, start_date: event.target.value || null }
                            : row,
                        ),
                      )
                    }
                    className={FIELD}
                  />
                </label>
                <label className="block space-y-1">
                  <span className={LABEL}>Au</span>
                  <input
                    type="date"
                    value={current.end_date ?? ""}
                    onChange={(event) =>
                      queryClient.setQueryData<SequenceDetail[]>(["sequence-details"], (rows) =>
                        (rows ?? []).map((row) =>
                          row.id === current.id
                            ? { ...row, end_date: event.target.value || null }
                            : row,
                        ),
                      )
                    }
                    className={FIELD}
                  />
                </label>
                <div className="flex items-center gap-3 md:col-span-2">
                  <button
                    type="button"
                    onClick={() => void handleUpdateSequence()}
                    disabled={busy}
                    className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-bold uppercase text-primary-foreground disabled:opacity-60"
                  >
                    <Save className="size-4" /> Enregistrer la séquence
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleDeleteSequence(current.id)}
                    disabled={busy}
                    className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="size-4" /> Supprimer la séquence
                  </button>
                </div>
              </div>
            )}
          </section>

          {/* 2. Séances */}
          {current && (
            <section className={CARD}>
              <div className="flex items-center justify-between gap-3">
                <h2 className="mono-label text-muted-foreground">Séances</h2>
                <button
                  type="button"
                  onClick={() => void handleAddSession()}
                  disabled={busy}
                  className="inline-flex items-center gap-1 rounded-xl border border-border px-3 py-1.5 text-xs font-semibold hover:border-primary disabled:opacity-60"
                >
                  <Plus className="size-3.5" /> Ajouter une séance
                </button>
              </div>

              {current.sessions.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Aucune séance sur cette période : ajoute une séance manuellement.
                </p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {current.sessions.map((row) => (
                    <button
                      key={row.id}
                      type="button"
                      onClick={() => setSessionId(row.id)}
                      className={`min-w-[86px] rounded-xl border px-3 py-2 text-center transition-colors ${
                        session?.id === row.id
                          ? "border-primary bg-primary/15"
                          : "border-border hover:border-primary/60"
                      }`}
                    >
                      <span className="block text-sm font-bold">S{row.session_number}</span>
                      <span className="block text-[11px] text-muted-foreground">
                        {shortDate(row.session_date)}
                      </span>
                    </button>
                  ))}
                </div>
              )}

              {/* 3. Détail de la séance */}
              {session && (
                <div className="space-y-4 rounded-2xl border border-border bg-background p-4">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="text-sm font-bold uppercase">
                      S{session.session_number} — {longDate(session.session_date)}
                    </h3>
                    <button
                      type="button"
                      onClick={() => void handleDeleteSession(session.id)}
                      disabled={busy}
                      className="text-muted-foreground hover:text-destructive"
                      aria-label="Supprimer la séance"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>

                  <label className="block space-y-1 md:max-w-[220px]">
                    <span className={LABEL}>Date de la séance</span>
                    <input
                      type="date"
                      value={sessionDraft.date}
                      onChange={(event) =>
                        setSessionDraft({ ...sessionDraft, date: event.target.value })
                      }
                      className={FIELD}
                    />
                  </label>

                  <label className="block space-y-1">
                    <span className={LABEL}>Objectif de la séance</span>
                    <textarea
                      rows={3}
                      value={sessionDraft.objective}
                      onChange={(event) =>
                        setSessionDraft({ ...sessionDraft, objective: event.target.value })
                      }
                      placeholder="Améliorer sa capacité à conserver la balle et à se démarquer."
                      className={FIELD}
                    />
                  </label>

                  <label className="block space-y-1">
                    <span className={LABEL}>Points importants</span>
                    <textarea
                      rows={3}
                      value={sessionDraft.keyPoints}
                      onChange={(event) =>
                        setSessionDraft({ ...sessionDraft, keyPoints: event.target.value })
                      }
                      placeholder="Se démarquer après la passe. Lever la tête avant de recevoir."
                      className={FIELD}
                    />
                  </label>

                  <div className="space-y-2">
                    <span className={LABEL}>Fichiers / ressources</span>
                    {session.files.length === 0 ? (
                      <p className="text-xs text-muted-foreground">Aucune ressource ajoutée.</p>
                    ) : (
                      <ul className="space-y-1.5">
                        {session.files.map((file) => (
                          <li
                            key={file.id}
                            className="flex items-center justify-between gap-3 rounded-xl border border-border px-3 py-2 text-sm"
                          >
                            <a
                              href={file.url}
                              target="_blank"
                              rel="noreferrer"
                              className="flex min-w-0 items-center gap-2 truncate hover:text-primary"
                            >
                              <Paperclip className="size-3.5 shrink-0" />
                              <span className="truncate">{file.name}</span>
                            </a>
                            <button
                              type="button"
                              onClick={async () => {
                                if (!window.confirm(`Supprimer « ${file.name} » ?`)) return;
                                try {
                                  await removeFile({ data: { id: file.id } });
                                  await refresh();
                                  toast.success("Ressource supprimée");
                                } catch (error) {
                                  toast.error(
                                    error instanceof Error ? error.message : "Suppression impossible",
                                  );
                                }
                              }}
                              className="shrink-0 text-muted-foreground hover:text-destructive"
                              aria-label="Supprimer la ressource"
                            >
                              <Trash2 className="size-4" />
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                    <label className="inline-flex cursor-pointer items-center gap-1 rounded-xl border border-border px-3 py-1.5 text-xs font-semibold hover:border-primary">
                      <Plus className="size-3.5" /> Ajouter un fichier
                      <input
                        type="file"
                        accept=".pdf,.png,.jpg,.jpeg,.webp,.doc,.docx,.mp4"
                        className="hidden"
                        onChange={(event) => {
                          const file = event.target.files?.[0];
                          event.target.value = "";
                          if (file) void handleUpload(file);
                        }}
                      />
                    </label>
                  </div>

                  <button
                    type="button"
                    onClick={() => void handleSaveSession()}
                    disabled={busy}
                    className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-bold uppercase text-primary-foreground disabled:opacity-60"
                  >
                    <Save className="size-4" /> {busy ? "Enregistrement…" : "Enregistrer la séance"}
                  </button>
                </div>
              )}
            </section>
          )}

          {/* 4. Barème de la séquence : une seule image */}
          {current && (
            <section className={CARD}>
              <h2 className="mono-label text-muted-foreground">Barème de la séquence</h2>
              <p className="text-xs text-muted-foreground">
                Ajoute une photo du barème (PNG, JPG ou WEBP, 8 Mo maximum).
              </p>

              {current.scale_image_url ? (
                <div className="space-y-3">
                  <a href={current.scale_image_url} target="_blank" rel="noreferrer" className="block">
                    <img
                      src={current.scale_image_url}
                      alt={`Barème de la séquence ${current.name}`}
                      className="max-h-80 w-full rounded-xl border border-border object-contain"
                      loading="lazy"
                    />
                  </a>
                  <div className="flex flex-wrap gap-2">
                    <label className="inline-flex cursor-pointer items-center gap-1 rounded-xl border border-border px-3 py-1.5 text-xs font-semibold hover:border-primary">
                      <ImageIcon className="size-3.5" /> Remplacer l'image
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        className="hidden"
                        onChange={(event) => {
                          const file = event.target.files?.[0];
                          event.target.value = "";
                          if (file) void handleScaleUpload(file);
                        }}
                      />
                    </label>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void handleScaleDelete()}
                      className="inline-flex items-center gap-1 rounded-xl border border-border px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:border-destructive hover:text-destructive disabled:opacity-60"
                    >
                      <Trash2 className="size-3.5" /> Supprimer l'image
                    </button>
                  </div>
                </div>
              ) : (
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-bold uppercase text-primary-foreground">
                  <ImageIcon className="size-4" /> {busy ? "Envoi…" : "Ajouter une photo"}
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    className="hidden"
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      event.target.value = "";
                      if (file) void handleScaleUpload(file);
                    }}
                  />
                </label>
              )}
            </section>
          )}
        </>
      )}

      {orphanSessions.length > 0 && (
        <section className={CARD}>
          <h2 className="mono-label text-muted-foreground">Séances hors séquence</h2>
          <p className="text-xs text-muted-foreground">
            Séances planifiées avant la refonte : toujours visibles par les élèves.
          </p>
          <ul className="grid gap-2 md:grid-cols-2">
            {orphanSessions.map((row) => (
              <li
                key={row.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-border bg-background px-4 py-3 text-sm"
              >
                <span className="min-w-0 truncate">
                  {row.activity_name} · {sessionWhen(row)}
                </span>
                <button
                  type="button"
                  onClick={async () => {
                    if (!window.confirm("Supprimer cette séance ?")) return;
                    try {
                      await removeLegacy({ data: { id: row.id } });
                      await refresh();
                      toast.success("Séance supprimée");
                    } catch (error) {
                      toast.error(
                        error instanceof Error ? error.message : "Suppression impossible",
                      );
                    }
                  }}
                  className="shrink-0 text-muted-foreground hover:text-destructive"
                  aria-label="Supprimer la séance"
                >
                  <Trash2 className="size-4" />
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
