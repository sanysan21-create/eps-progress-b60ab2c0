import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";

import { getMyQuizzes, submitMyQuiz, type StudentQuiz } from "@/lib/quiz.functions";
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
  const now = useNow();
  const left = new Date(quiz.ends_at).getTime() - now;
  const finished = quiz.finished || left <= 0;
  const [answers, setAnswers] = useState<(number | null)[]>(
    quiz.my_answers ?? quiz.questions.map(() => null),
  );
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!quiz.finished && left <= 0) void qc.invalidateQueries({ queryKey: ["my-quizzes"] });
  }, [left <= 0, quiz.finished]);

  async function handleSubmit() {
    setBusy(true);
    try {
      await submit({ data: { quizId: quiz.id, answers } });
      toast.success("Réponses envoyées. Le corrigé s'affichera à la fin du temps.");
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
        {quiz.finished ? (
          <span className="rounded-full border border-primary/40 bg-primary/10 px-3 py-1 font-mono text-sm font-bold text-primary">
            {quiz.score ?? 0}/{quiz.questions.length}
          </span>
        ) : (
          <span className="rounded-full bg-primary/15 px-2.5 py-1 text-xs font-bold text-primary">
            {finished ? "Terminé" : `⏱️ ${formatLeft(left)}`}
          </span>
        )}
      </div>
      {quiz.finished && !quiz.my_answers && (
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
      {!finished && (
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
