import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";

import { beginMyQuiz, finishMyQuiz, getMyQuizzes, submitMyQuiz, type StudentQuiz } from "@/lib/quiz.functions";
import { formatLeft, useNow } from "./quiz-time";

/** QCM lancés par l'enseignant : réponse pendant le minuteur, corrigé + score après. */
export function StudentQuizzes() {
  const fetchQuizzes = useServerFn(getMyQuizzes);
  const quizzes = useQuery({
    queryKey: ["my-quizzes"],
    queryFn: () => fetchQuizzes(),
    refetchInterval: 15_000,
  });
  const list = quizzes.data ?? [];
  if (list.length === 0) return null;
  return (
    <section className="space-y-3">
      <h2 className="text-sm font-semibold tracking-tight text-muted-foreground">📝 Mes QCM</h2>
      {list.map((quiz) => (
        <QuizCard key={quiz.id} quiz={quiz} />
      ))}
    </section>
  );
}

function QuizCard({ quiz }: { quiz: StudentQuiz }) {
  const qc = useQueryClient();
  const submit = useServerFn(submitMyQuiz);
  const finish = useServerFn(finishMyQuiz);
  const begin = useServerFn(beginMyQuiz);
  const now = useNow();
  const closeLeft = new Date(quiz.ends_at).getTime() - now;
  const left = quiz.my_deadline ? new Date(quiz.my_deadline).getTime() - now : closeLeft;
  const notStarted = quiz.not_started || (quiz.starts_at ? new Date(quiz.starts_at).getTime() > now : false);
  const windowClosed = quiz.finished || closeLeft <= 0;
  const waitingStart = !notStarted && !windowClosed && !quiz.begun;
  const finished = !notStarted && (windowClosed || (quiz.begun && left <= 0));
  const [answers, setAnswers] = useState<(number | null)[]>(
    quiz.my_answers ?? quiz.questions.map(() => null),
  );
  const [busy, setBusy] = useState(false);

  // Le QCM programmé vient de s'ouvrir : recharger pour afficher les questions.
  useEffect(() => {
    if (notStarted && quiz.starts_at && new Date(quiz.starts_at).getTime() - now <= 0)
      void qc.invalidateQueries({ queryKey: ["my-quizzes"] });
  }, [notStarted, quiz.starts_at, now]);

  useEffect(() => {
    if (!quiz.finished && closeLeft <= 0) void qc.invalidateQueries({ queryKey: ["my-quizzes"] });
  }, [closeLeft <= 0, quiz.finished]);

  useEffect(() => {
    if (quiz.my_answers) setAnswers(quiz.my_answers.length ? quiz.my_answers : quiz.questions.map(() => null));
    else if (quiz.questions.length && answers.length !== quiz.questions.length)
      setAnswers(quiz.questions.map(() => null));
  }, [quiz.begun, quiz.questions.length]);

  async function handleBegin() {
    if (!window.confirm(`Commencer le QCM ? Tu auras ${quiz.duration_minutes} min.`)) return;
    setBusy(true);
    try {
      await begin({ data: { quizId: quiz.id } });
      await qc.invalidateQueries({ queryKey: ["my-quizzes"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Impossible de commencer");
    } finally {
      setBusy(false);
    }
  }

  async function handleSubmit(finishEarly = false) {
    if (
      finishEarly &&
      !window.confirm(
        "Terminer le QCM ? Tes réponses seront enregistrées et tu ne pourras plus les modifier.",
      )
    )
      return;
    setBusy(true);
    try {
      if (finishEarly) await finish({ data: { quizId: quiz.id, answers } });
      else await submit({ data: { quizId: quiz.id, answers } });
      toast.success(
        finishEarly
          ? "QCM terminé. Le corrigé s'affichera à la clôture du QCM."
          : "Réponses enregistrées. Tu peux encore les modifier avant de terminer.",
      );
      await qc.invalidateQueries({ queryKey: ["my-quizzes"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Envoi impossible");
    } finally {
      setBusy(false);
    }
  }

  return (
    <article className="space-y-3 rounded-2xl border border-border bg-surface px-5 py-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-semibold">
          {quiz.title}
          <span className="ml-2 text-xs text-muted-foreground">
            {quiz.activity_name}
            {quiz.session_number ? ` · S${quiz.session_number}` : ""}
          </span>
        </p>
        {notStarted ? (
          <span className="rounded-full border border-border bg-surface px-2.5 py-1 text-xs font-bold text-muted-foreground">
            🕐 {quiz.starts_at ? new Date(quiz.starts_at).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }) : ""}
          </span>
        ) : quiz.finished ? (
          <span className="rounded-full border border-primary/40 bg-primary/10 px-3 py-1 font-mono text-sm font-bold text-primary">
            {quiz.score ?? 0}/{quiz.questions.length}
          </span>
        ) : (
          <span className="rounded-full bg-primary/15 px-2.5 py-1 text-xs font-bold text-primary">
            {waitingStart
              ? `Disponible encore ${formatLeft(closeLeft)}`
              : finished
                ? "Temps écoulé"
                : `⏱️ ${formatLeft(left)}`}
          </span>
        )}
      </div>
      {notStarted && (
        <div className="rounded-xl border border-dashed border-border px-4 py-3 text-sm text-muted-foreground">
          <p>
            Ce QCM ouvre{" "}
            {quiz.starts_at
              ? new Date(quiz.starts_at).toLocaleString("fr-FR", {
                  day: "numeric",
                  month: "long",
                  hour: "2-digit",
                  minute: "2-digit",
                })
              : "bientôt"}
            .
          </p>
          <p className="mt-1 text-xs">
            Tu auras <strong className="text-foreground">{quiz.duration_minutes} min</strong> pour
            répondre à partir du moment où tu appuies sur « Commencer ».
          </p>
        </div>
      )}
      {waitingStart && (
        <div className="space-y-3 rounded-xl border border-dashed border-border px-4 py-3 text-sm text-muted-foreground">
          <p>
            Tu auras <strong className="text-foreground">{quiz.duration_minutes} min</strong> pour répondre dès
            que tu appuies sur « Commencer ».
          </p>
          <p className="text-xs">
            ⏳ Ce QCM se clôture le{" "}
            <strong className="text-foreground">
              {new Date(quiz.ends_at).toLocaleString("fr-FR", {
                weekday: "long",
                day: "numeric",
                month: "long",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </strong>
            . Passé cet horaire, tu ne pourras plus y répondre.
          </p>
          <button
            type="button"
            disabled={busy}
            onClick={() => void handleBegin()}
            className="rounded-xl bg-primary px-5 py-2.5 text-sm font-bold uppercase text-primary-foreground disabled:opacity-60"
          >
            ▶ Commencer
          </button>
        </div>
      )}
      {quiz.begun && finished && !quiz.finished && (
        <p className="text-xs text-muted-foreground">Le corrigé s'affichera à la fermeture du QCM.</p>
      )}
      {quiz.finished && (!quiz.my_answers || quiz.my_answers.length === 0) && (
        <p className="text-xs text-muted-foreground">Tu n'as pas répondu à ce QCM.</p>
      )}
      <ol className="space-y-3">
        {quiz.questions.map((q, i) => (
          <li key={i} className="space-y-1.5">
            <p className="text-sm font-medium">
              {i + 1}. {q.text}
            </p>
            <div className="grid gap-1.5">
              {q.options.map((opt, k) => {
                const mine = answers[i] === k;
                const correct = q.correct === k;
                let cls = "border-border";
                if (quiz.finished) {
                  if (correct) cls = "border-primary bg-primary/15 text-primary";
                  else if (mine) cls = "border-destructive bg-destructive/10 text-destructive";
                } else if (mine) cls = "border-primary bg-primary/10";
                return (
                  <button
                    key={k}
                    type="button"
                    disabled={finished}
                    aria-pressed={mine}
                    onClick={() => setAnswers((p) => p.map((v, j) => (j === i ? k : v)))}
                    className={`rounded-xl border px-3 py-2 text-left text-sm ${cls}`}
                  >
                    {String.fromCharCode(65 + k)}. {opt}
                    {quiz.finished && correct && " ✓"}
                  </button>
                );
              })}
            </div>
          </li>
        ))}
      </ol>
      {!finished && quiz.begun && (
        <button
          type="button"
          disabled={busy}
          onClick={() => void handleSubmit()}
          className="rounded-xl bg-primary px-5 py-2.5 text-sm font-bold uppercase text-primary-foreground disabled:opacity-60"
        >
          {quiz.my_answers ? "Modifier mes réponses" : "Envoyer mes réponses"}
        </button>
      )}
    </article>
  );
}
