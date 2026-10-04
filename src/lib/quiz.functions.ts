import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireTeacher, withDb } from "./auth-middleware";

export type QuizQuestion = { text: string; options: string[]; correct: number };

export type TeacherQuiz = {
  id: string;
  title: string;
  duration_minutes: number;
  questions: QuizQuestion[];
  started_at: string | null;
  ends_at: string | null;
  scheduled_at: string | null;
  results: { student_id: string; name: string; score: number; total: number }[];
  answered: number;
};

export type StudentQuiz = {
  id: string;
  title: string;
  activity_name: string | null;
  session_number: number | null;
  ends_at: string;
  finished: boolean;
  questions: { text: string; options: string[]; correct: number | null }[];
  my_answers: (number | null)[] | null;
  score: number | null;
};

type QuizRow = {
  id: string;
  title: string;
  duration_minutes: number;
  questions: QuizQuestion[];
  started_at: Date | null;
  ends_at: Date | null;
  scheduled_at?: Date | null;
};

const iso = (d: Date | string | null) => (d ? new Date(d).toISOString() : null);

function scoreOf(questions: QuizQuestion[], answers: (number | null)[]) {
  return questions.reduce((s, q, i) => s + (answers[i] === q.correct ? 1 : 0), 0);
}

export const getSessionQuiz = createServerFn({ method: "GET" })
  .middleware([requireTeacher])
  .inputValidator((input: { sessionId: string }) =>
    z.object({ sessionId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }): Promise<TeacherQuiz | null> => {
    const [quiz] = await context.sql<QuizRow[]>`
      select id, title, duration_minutes, questions, started_at, ends_at, scheduled_at
      from session_quizzes where session_id = ${data.sessionId} and teacher_id = ${context.userId}
    `;
    if (!quiz) return null;
    const answers = await context.sql<
      { student_id: string; first_name: string; last_name: string; answers: (number | null)[] }[]
    >`
      select a.student_id, s.first_name, s.last_name, a.answers
      from session_quiz_answers a join students s on s.id = a.student_id
      where a.quiz_id = ${quiz.id} and s.teacher_id = ${context.userId}
      order by s.last_name, s.first_name
    `;
    const finished = !!quiz.ends_at && new Date(quiz.ends_at) <= new Date();
    return {
      id: quiz.id,
      title: quiz.title,
      duration_minutes: Number(quiz.duration_minutes),
      questions: quiz.questions ?? [],
      started_at: iso(quiz.started_at),
      ends_at: iso(quiz.ends_at),
      scheduled_at: iso(quiz.scheduled_at ?? null),
      answered: answers.length,
      results: finished
        ? answers.map((a) => ({
            student_id: a.student_id,
            name: `${a.last_name} ${a.first_name}`,
            score: scoreOf(quiz.questions ?? [], a.answers ?? []),
            total: (quiz.questions ?? []).length,
          }))
        : [],
    };
  });

export const saveSessionQuiz = createServerFn({ method: "POST" })
  .middleware([requireTeacher])
  .inputValidator(
    (input: { sessionId: string; title: string; durationMinutes: number; questions: QuizQuestion[] }) =>
      z
        .object({
          sessionId: z.string().uuid(),
          title: z.string().trim().min(1).max(120),
          durationMinutes: z.number().int().min(1).max(180),
          questions: z
            .array(
              z
                .object({
                  text: z.string().trim().min(1, "Question vide").max(500),
                  options: z.array(z.string().trim().min(1, "Réponse vide").max(200)).min(2).max(6),
                  correct: z.number().int().min(0),
                })
                .refine((q) => q.correct < q.options.length, "Bonne réponse invalide"),
            )
            .min(1, "Ajoute au moins une question")
            .max(40),
        })
        .parse(input),
  )
  .handler(async ({ data, context }) => {
    const [session] = await context.sql<{ id: string }[]>`
      select id from program_sessions where id = ${data.sessionId} and teacher_id = ${context.userId}
    `;
    if (!session) throw new Error("Séance introuvable");
    const [existing] = await context.sql<{ started_at: Date | null }[]>`
      select started_at from session_quizzes where session_id = ${data.sessionId}
    `;
    if (existing?.started_at) throw new Error("Le QCM est déjà lancé : réinitialise-le pour le modifier.");
    await context.sql`
      insert into session_quizzes (teacher_id, session_id, title, duration_minutes, questions)
      values (${context.userId}, ${data.sessionId}, ${data.title}, ${data.durationMinutes},
              ${context.sql.json(data.questions)})
      on conflict (session_id) do update set
        title = excluded.title, duration_minutes = excluded.duration_minutes,
        questions = excluded.questions, updated_at = now()
    `;
    return { ok: true };
  });

export const startSessionQuiz = createServerFn({ method: "POST" })
  .middleware([requireTeacher])
  .inputValidator((input: { sessionId: string }) =>
    z.object({ sessionId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const rows = await context.sql`
      update session_quizzes set started_at = now(), scheduled_at = null,
        ends_at = now() + make_interval(mins => duration_minutes), updated_at = now()
      where session_id = ${data.sessionId} and teacher_id = ${context.userId}
        and jsonb_array_length(questions) > 0
      returning id
    `;
    if (rows.length === 0) throw new Error("Enregistre d'abord le QCM avec au moins une question.");
    return { ok: true };
  });

/** Programme l'ouverture du QCM à une date/heure précise (fuseau du navigateur). */
export const scheduleSessionQuiz = createServerFn({ method: "POST" })
  .middleware([requireTeacher])
  .inputValidator((input: { sessionId: string; opensAt: string }) =>
    z
      .object({ sessionId: z.string().uuid(), opensAt: z.string().min(1, "Choisis une date et une heure") })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const opensAt = new Date(data.opensAt);
    if (Number.isNaN(opensAt.getTime())) throw new Error("Date invalide");
    if (opensAt.getTime() <= Date.now()) throw new Error("Choisis une date dans le futur.");
    const rows = await context.sql`
      update session_quizzes set scheduled_at = ${opensAt.toISOString()}::timestamptz,
        started_at = ${opensAt.toISOString()}::timestamptz,
        ends_at = ${opensAt.toISOString()}::timestamptz + make_interval(mins => duration_minutes),
        updated_at = now()
      where session_id = ${data.sessionId} and teacher_id = ${context.userId}
        and jsonb_array_length(questions) > 0
      returning id
    `;
    if (rows.length === 0) throw new Error("Enregistre d'abord le QCM avec au moins une question.");
    return { ok: true };
  });

/** Remet le QCM en brouillon et efface les réponses. */
export const resetSessionQuiz = createServerFn({ method: "POST" })
  .middleware([requireTeacher])
  .inputValidator((input: { sessionId: string }) =>
    z.object({ sessionId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const [quiz] = await context.sql<{ id: string }[]>`
      update session_quizzes set started_at = null, ends_at = null, scheduled_at = null, updated_at = now()
      where session_id = ${data.sessionId} and teacher_id = ${context.userId} returning id
    `;
    if (quiz) await context.sql`delete from session_quiz_answers where quiz_id = ${quiz.id}`;
    return { ok: true };
  });

export const deleteSessionQuiz = createServerFn({ method: "POST" })
  .middleware([requireTeacher])
  .inputValidator((input: { sessionId: string }) =>
    z.object({ sessionId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    await context.sql`
      delete from session_quizzes where session_id = ${data.sessionId} and teacher_id = ${context.userId}
    `;
    return { ok: true };
  });

async function studentScope() {
  const { getStudentSession } = await import("./student-qr.server");
  const session = await getStudentSession();
  return session.data.studentId ?? null;
}

/** QCM lancés visibles par l'élève. Le corrigé n'est envoyé qu'après la fin du minuteur. */
export const getMyQuizzes = createServerFn({ method: "GET" })
  .middleware([withDb])
  .handler(async ({ context }): Promise<StudentQuiz[]> => {
    const studentId = await studentScope();
    if (!studentId) return [];
    const { loadStudentScope } = await import("./program.server");
    const scope = await loadStudentScope(context.sql, studentId);
    if (!scope) return [];
    const rows = await context.sql<
      (QuizRow & { activity_name: string | null; session_number: number | null; my: (number | null)[] | null })[]
    >`
      select z.id, z.title, z.duration_minutes, z.questions, z.started_at, z.ends_at,
             coalesce(a.name, p.activity_name) as activity_name, p.session_number,
             ans.answers as my
      from session_quizzes z
      join program_sessions p on p.id = z.session_id
      left join activities a on a.id = p.activity_id
      left join session_quiz_answers ans on ans.quiz_id = z.id and ans.student_id = ${studentId}
      where z.teacher_id = ${scope.teacherId} and z.started_at is not null and z.started_at <= now()
        ${
          scope.classIds.length > 0
            ? context.sql`and (p.class_id is null or p.class_id = any(${scope.classIds}::uuid[]))`
            : context.sql`and p.class_id is null`
        }
      order by z.started_at desc
      limit 20
    `;
    const now = new Date();
    return rows.map((row) => {
      const finished = !!row.ends_at && new Date(row.ends_at) <= now;
      const questions = row.questions ?? [];
      return {
        id: row.id,
        title: row.title,
        activity_name: row.activity_name,
        session_number: row.session_number === null ? null : Number(row.session_number),
        ends_at: iso(row.ends_at)!,
        finished,
        questions: questions.map((q) => ({
          text: q.text,
          options: q.options,
          correct: finished ? q.correct : null,
        })),
        my_answers: row.my,
        score: finished && row.my ? scoreOf(questions, row.my) : null,
      };
    });
  });

export const submitMyQuiz = createServerFn({ method: "POST" })
  .middleware([withDb])
  .inputValidator((input: { quizId: string; answers: (number | null)[] }) =>
    z
      .object({
        quizId: z.string().uuid(),
        answers: z.array(z.number().int().min(0).max(10).nullable()).max(40),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const studentId = await studentScope();
    if (!studentId) throw new Error("Session élève absente");
    const { loadStudentScope } = await import("./program.server");
    const scope = await loadStudentScope(context.sql, studentId);
    if (!scope) throw new Error("Session élève absente");
    const [quiz] = await context.sql<{ id: string }[]>`
      select z.id from session_quizzes z
      join program_sessions p on p.id = z.session_id
      where z.id = ${data.quizId} and z.teacher_id = ${scope.teacherId}
        and z.started_at is not null and z.started_at <= now() and z.ends_at > now()
        and (p.class_id is null or p.class_id = any(${scope.classIds}::uuid[]))
    `;
    if (!quiz) throw new Error("Ce QCM est terminé.");
    await context.sql`
      insert into session_quiz_answers (quiz_id, student_id, answers)
      values (${quiz.id}, ${studentId}, ${context.sql.json(data.answers)})
      on conflict (quiz_id, student_id) do update set answers = excluded.answers, updated_at = now()
    `;
    return { ok: true };
  });
