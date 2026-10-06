import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { CalendarClock, Check, Play, Plus, RotateCcw, Trash2 } from "lucide-react";
import { toast } from "sonner";

import {
  deleteSessionQuiz,
  getSessionQuiz,
  listQuizTemplates,
  resetSessionQuiz,
  saveSessionQuiz,
  scheduleSessionQuiz,
  startSessionQuiz,
  type QuizQuestion,
} from "@/lib/quiz.functions";
import { useNow, formatLeft } from "./quiz-time";

const FIELD =
  "w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary";
const BTN =
  "inline-flex items-center gap-1.5 rounded-xl border border-border px-3 py-1.5 text-xs font-semibold hover:border-primary disabled:opacity-50";

const blank = (): QuizQuestion => ({ text: "", options: ["", "", "", ""], correct: 0 });

/** QCM d'une séance : création, lancement avec minuteur, résultats. */
export function SessionQuizEditor({ sessionId }: { sessionId: string }) {
  const qc = useQueryClient();
  const fetchQuiz = useServerFn(getSessionQuiz);
  const save = useServerFn(saveSessionQuiz);
  const start = useServerFn(startSessionQuiz);
  const schedule = useServerFn(scheduleSessionQuiz);
  const reset = useServerFn(resetSessionQuiz);
  const remove = useServerFn(deleteSessionQuiz);
  const fetchTemplates = useServerFn(listQuizTemplates);
  const key = ["session-quiz", sessionId];
  const quiz = useQuery({
    queryKey: key,
    queryFn: () => fetchQuiz({ data: { sessionId } }),
    refetchInterval: (q) => (q.state.data?.started_at ? 10_000 : false),
  });
  const now = useNow();

  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("QCM");
  const [duration, setDuration] = useState("10");
  const [questions, setQuestions] = useState<QuizQuestion[]>([blank()]);
  const [opensAt, setOpensAt] = useState("");
  const [available, setAvailable] = useState("60");
  const availableMinutes = Math.max(1, Math.round(Number(available) || 60));
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!quiz.data) return;
    setOpen(true);
    setTitle(quiz.data.title);
    setDuration(String(quiz.data.duration_minutes));
    setQuestions(quiz.data.questions.length ? quiz.data.questions : [blank()]);
  }, [quiz.data?.id, quiz.data?.started_at]);

  const refresh = () => qc.invalidateQueries({ queryKey: key });
  async function run(fn: () => Promise<unknown>, ok: string) {
    setBusy(true);
    try {
      await fn();
      toast.success(ok);
      await refresh();
    } catch (e) {
      let msg = e instanceof Error ? e.message : "Erreur";
      try {
        const parsed = JSON.parse(msg);
        if (Array.isArray(parsed) && parsed[0]?.message) msg = parsed[0].message;
      } catch {
        /* message déjà lisible */
      }
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  }

  const patchQ = (i: number, v: Partial<QuizQuestion>) =>
    setQuestions((p) => p.map((q, j) => (j === i ? { ...q, ...v } : q)));

  const data = quiz.data;
  const started = !!data?.started_at;
  const startsAt = data?.started_at ? new Date(data.started_at).getTime() : null;
  const scheduled = started && startsAt !== null && startsAt > now;
  const endsAt = data?.ends_at ? new Date(data.ends_at).getTime() : null;
  const finished = endsAt !== null && endsAt <= now;

  if (!open && !data) {
    return (
      <button type="button" className={BTN} onClick={() => setOpen(true)}>
        <Plus className="size-3.5" /> Créer un QCM
      </button>
    );
  }

  return (
    <section className="space-y-3 rounded-2xl border border-border bg-surface-2 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h4 className="text-sm font-bold">📝 QCM de la séance</h4>
        {started && (
          <span
            className={`rounded-full px-2.5 py-1 text-xs font-bold ${finished ? "bg-muted text-muted-foreground" : "bg-primary/15 text-primary"}`}
          >
            {finished
              ? "Terminé — corrigé visible"
              : scheduled
                ? `Programmé · ouvre le ${new Date(startsAt!).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" })}`
                : `Disponible · ferme dans ${formatLeft(endsAt! - now)}`}
          </span>
        )}
      </div>

      {!started ? (
        <>
          {!data && (
            <QuizTemplatePicker
              fetchTemplates={fetchTemplates}
              onPick={(t) => {
                setTitle(t.title);
                setDuration(String(t.duration_minutes));
                setQuestions(t.questions.length ? t.questions : [blank()]);
                toast.success(`QCM « ${t.title} » chargé — pense à l'enregistrer`);
              }}
            />
          )}
          <div className="grid gap-2 sm:grid-cols-[1fr_140px]">
            <input className={FIELD} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Titre" />
            <label className="flex items-center gap-2 text-xs text-muted-foreground">
              <input
                type="number"
                min={1}
                max={180}
                className={FIELD}
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
              />
              min / élève
            </label>
          </div>
          {questions.map((q, i) => (
            <div key={i} className="space-y-2 rounded-xl border border-border bg-surface p-3">
              <div className="flex gap-2">
                <input
                  className={FIELD}
                  value={q.text}
                  placeholder={`Question ${i + 1}`}
                  onChange={(e) => patchQ(i, { text: e.target.value })}
                />
                <button
                  type="button"
                  aria-label="Supprimer la question"
                  className={BTN}
                  disabled={questions.length === 1}
                  onClick={() => setQuestions((p) => p.filter((_, j) => j !== i))}
                >
                  <Trash2 className="size-3.5" />
                </button>
              </div>
              {q.options.map((opt, k) => (
                <div key={k} className="flex items-center gap-2">
                  <button
                    type="button"
                    aria-label="Bonne réponse"
                    aria-pressed={q.correct === k}
                    onClick={() => patchQ(i, { correct: k })}
                    className={`grid size-7 shrink-0 place-items-center rounded-full border ${q.correct === k ? "border-primary bg-primary text-primary-foreground" : "border-border"}`}
                  >
                    {q.correct === k && <Check className="size-4" />}
                  </button>
                  <input
                    className={FIELD}
                    value={opt}
                    placeholder={`Réponse ${String.fromCharCode(65 + k)}`}
                    onChange={(e) =>
                      patchQ(i, { options: q.options.map((o, m) => (m === k ? e.target.value : o)) })
                    }
                  />
                  {q.options.length > 2 && (
                    <button
                      type="button"
                      aria-label="Retirer la réponse"
                      className={BTN}
                      onClick={() =>
                        patchQ(i, {
                          options: q.options.filter((_, m) => m !== k),
                          correct: q.correct === k ? 0 : q.correct > k ? q.correct - 1 : q.correct,
                        })
                      }
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  )}
                </div>
              ))}
              {q.options.length < 6 && (
                <button type="button" className={BTN} onClick={() => patchQ(i, { options: [...q.options, ""] })}>
                  <Plus className="size-3.5" /> Réponse
                </button>
              )}
            </div>
          ))}
          <p className="text-xs text-muted-foreground">Le rond vert indique la bonne réponse (cachée aux élèves jusqu'à la fin).</p>
          <div className="flex flex-wrap gap-2">
            <button type="button" className={BTN} onClick={() => setQuestions((p) => [...p, blank()])}>
              <Plus className="size-3.5" /> Question
            </button>
            <button
              type="button"
              className={BTN}
              disabled={busy}
              onClick={() =>
                run(
                  () =>
                    save({
                      data: { sessionId, title, durationMinutes: Number(duration) || 10, questions },
                    }),
                  "QCM enregistré",
                )
              }
            >
              <Check className="size-3.5" /> Enregistrer
            </button>
            {data && (
              <label className="flex items-center gap-2 text-xs text-muted-foreground">
                Disponible pendant
                <input
                  type="number"
                  min={1}
                  max={43200}
                  aria-label="Durée de disponibilité en minutes"
                  className={FIELD + " w-20"}
                  value={available}
                  onChange={(e) => setAvailable(e.target.value)}
                />
                min
              </label>
            )}
            {data && (
              <button
                type="button"
                className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-3 py-1.5 text-xs font-bold uppercase text-primary-foreground disabled:opacity-50"
                disabled={busy}
                onClick={() => {
                  if (
                    window.confirm(
                      `Ouvrir le QCM maintenant, disponible ${availableMinutes} min (${data.duration_minutes} min par élève après « Commencer ») ? Il ne sera plus modifiable.`,
                    )
                  )
                    void run(() => start({ data: { sessionId, availableMinutes } }), "QCM ouvert");
                }}
              >
                <Play className="size-3.5" /> Ouvrir maintenant
              </button>
            )}
            {data && (
              <div className="flex flex-wrap items-center gap-2">
                <input
                  type="datetime-local"
                  aria-label="Date et heure d'ouverture"
                  className={FIELD + " w-auto"}
                  value={opensAt}
                  min={new Date(Date.now() + 60_000).toISOString().slice(0, 16)}
                  onChange={(e) => setOpensAt(e.target.value)}
                />
                <button
                  type="button"
                  className={BTN}
                  disabled={busy || !opensAt}
                  onClick={() => {
                    if (
                      window.confirm(
                        `Programmer l'ouverture du QCM le ${new Date(opensAt).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" })} disponible ${availableMinutes} min (${data.duration_minutes} min par élève) ? Il ne sera plus modifiable.`,
                      )
                    )
                      void run(
                        () => schedule({ data: { sessionId, opensAt: new Date(opensAt).toISOString(), availableMinutes } }),
                        "QCM programmé",
                      );
                  }}
                >
                  <CalendarClock className="size-3.5" /> Programmer
                </button>
              </div>
            )}
            {data && (
              <button
                type="button"
                className={BTN}
                disabled={busy}
                onClick={() => {
                  if (window.confirm("Supprimer ce QCM ?"))
                    void run(() => remove({ data: { sessionId } }), "QCM supprimé").then(() => {
                      setOpen(false);
                      setQuestions([blank()]);
                    });
                }}
              >
                <Trash2 className="size-3.5" /> Supprimer
              </button>
            )}
          </div>
        </>
      ) : (
        <>
          <p className="text-sm">
            <strong>{data!.title}</strong> · {data!.questions.length} questions · {data!.answered} élève(s) ont répondu
          </p>
          {finished && (
            <div className="space-y-3">
              {data!.stats ? (
                <>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {[
                      { label: "Participation", value: `${data!.answered}/${data!.class_size || "?"}` },
                      { label: "Moyenne", value: `${data!.stats.average}/${data!.stats.total}` },
                      { label: "Médiane", value: `${data!.stats.median}/${data!.stats.total}` },
                      { label: "Min – Max", value: `${data!.stats.min} – ${data!.stats.max}` },
                    ].map((s) => (
                      <div key={s.label} className="rounded-xl border border-border bg-surface p-2.5 text-center">
                        <p className="text-xs text-muted-foreground">{s.label}</p>
                        <p className="font-mono text-sm font-bold text-primary">{s.value}</p>
                      </div>
                    ))}
                  </div>
                  <div className="space-y-2">
                    <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                      Analyse par question
                    </p>
                    {data!.questions.map((q, qi) => {
                      const pq = data!.stats!.per_question[qi];
                      if (!pq) return null;
                      const pct = data!.answered > 0 ? Math.round((pq.correct / data!.answered) * 100) : 0;
                      return (
                        <div key={qi} className="space-y-1.5 rounded-xl border border-border bg-surface p-3">
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-sm font-semibold">
                              {qi + 1}. {q.text}
                            </p>
                            <span
                              className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-bold ${pct >= 70 ? "bg-primary/15 text-primary" : pct >= 40 ? "bg-amber-500/15 text-amber-500" : "bg-red-500/15 text-red-500"}`}
                            >
                              {pct}% réussite
                            </span>
                          </div>
                          <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                            <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
                          </div>
                          <ul className="space-y-0.5 pt-1">
                            {q.options.map((opt, oi) => (
                              <li key={oi} className="flex items-center gap-2 text-xs">
                                <span
                                  className={`grid size-4 shrink-0 place-items-center rounded-full text-[10px] font-bold ${oi === q.correct ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}
                                >
                                  {String.fromCharCode(65 + oi)}
                                </span>
                                <span className={oi === q.correct ? "font-semibold text-primary" : "text-muted-foreground"}>
                                  {opt}
                                </span>
                                <span className="ml-auto font-mono text-muted-foreground">
                                  {pq.choices[oi] ?? 0}
                                </span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      );
                    })}
                  </div>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">Aucune réponse.</p>
              )}
              <div className="space-y-1.5">
                <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                  Résultats par élève
                </p>
                <ul className="divide-y divide-border rounded-xl border border-border">
                  {data!.results.length === 0 && (
                    <li className="px-3 py-2 text-sm text-muted-foreground">Aucune réponse.</li>
                  )}
                  {data!.results.map((r) => (
                    <li key={r.student_id} className="flex justify-between px-3 py-2 text-sm">
                      <span>{r.name}</span>
                      <span className="font-mono font-bold text-primary">
                        {r.score}/{r.total}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
          <button
            type="button"
            className={BTN}
            disabled={busy}
            onClick={() => {
              if (window.confirm("Réinitialiser le QCM ? Les réponses des élèves seront effacées."))
                void run(() => reset({ data: { sessionId } }), "QCM remis en brouillon");
            }}
          >
            <RotateCcw className="size-3.5" /> Réinitialiser
          </button>
        </>
      )}
    </section>
  );
}

/** Permet de charger un QCM déjà enregistré sur une autre séance/classe. */
function QuizTemplatePicker({
  fetchTemplates,
  onPick,
}: {
  fetchTemplates: () => Promise<import("@/lib/quiz.functions").QuizTemplate[]>;
  onPick: (t: import("@/lib/quiz.functions").QuizTemplate) => void;
}) {
  const templates = useQuery({ queryKey: ["quiz-templates"], queryFn: () => fetchTemplates() });
  const list = templates.data ?? [];
  if (templates.isPending || list.length === 0) return null;
  return (
    <label className="flex flex-col gap-1.5 text-xs text-muted-foreground">
      Réutiliser un QCM déjà enregistré (autre séance ou classe) :
      <select
        className={FIELD}
        defaultValue=""
        onChange={(e) => {
          const t = list.find((x) => x.id === e.target.value);
          if (t) onPick(t);
          e.target.value = "";
        }}
      >
        <option value="" disabled>
          Choisir un QCM…
        </option>
        {list.map((t) => (
          <option key={t.id} value={t.id}>
            {t.title} · {t.questions.length} questions{t.origin ? ` · ${t.origin}` : ""}
            {t.started ? " (déjà lancé)" : ""}
          </option>
        ))}
      </select>
    </label>
  );
}
