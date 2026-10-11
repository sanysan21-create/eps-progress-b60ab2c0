import { createServerFn } from "@tanstack/react-start";
import { withDb } from "./auth-middleware";

export type StudentNotification = {
  id: string;
  kind: "achievement" | "result" | "program" | "quiz" | "competency";
  title: string;
  detail: string;
  at: string;
  to: "/eleve/reussites" | "/eleve/notes" | "/eleve/programme" | "/eleve/progression";
};

/** Recent existing records only; identity comes exclusively from the signed QR session. */
export const getMyNotifications = createServerFn({ method: "GET" })
  .middleware([withDb])
  .handler(async ({ context }): Promise<StudentNotification[]> => {
    const { getStudentSession } = await import("./student-qr.server");
    const session = await getStudentSession();
    const studentId = session.data.studentId;
    if (!studentId) return [];

    const rows = await context.sql<(Omit<StudentNotification, "at"> & { at: Date | string })[]>`
      with me as (
        select id, teacher_id from students where id = ${studentId}
      ), my_classes as (
        select cs.class_id from class_students cs join me on me.id = cs.student_id
        where cs.teacher_id = me.teacher_id
      ), sequences as (
        select p.* from program_sequences p join me on me.teacher_id = p.teacher_id
        where p.class_id is null or p.class_id in (select class_id from my_classes)
      ), quizzes as (
        select z.id, z.title, coalesce(a.name, p.activity_name) as activity_name,
          coalesce(o.opens_at, z.started_at) as opens_at,
          coalesce(o.ends_at, z.ends_at) as closes_at,
          coalesce(o.created_at, z.updated_at) as changed_at,
          ans.id as answer_id
        from session_quizzes z
        join me on me.teacher_id = z.teacher_id
        join program_sessions p on p.id = z.session_id and p.teacher_id = me.teacher_id
        left join activities a on a.id = p.activity_id
        left join session_quiz_overrides o on o.quiz_id = z.id and o.student_id = me.id
        left join session_quiz_answers ans on ans.quiz_id = z.id and ans.student_id = me.id
        where z.started_at is not null
          and (p.class_id is null or p.class_id in (select class_id from my_classes))
          and exists (select 1 from sequences s where s.activity_id = p.activity_id)
      ), events as (
        select 'achievement:' || sa.id as id, 'achievement' as kind,
          'Nouvelle réussite obtenue' as title, a.name as detail,
          sa.created_at as at, '/eleve/reussites' as "to"
        from student_achievements sa join me on me.id = sa.student_id and me.teacher_id = sa.teacher_id
        join achievements a on a.id = sa.achievement_id and a.teacher_id = me.teacher_id
        union all
        select 'competency:' || e.id, 'competency', 'Compétence mise à jour',
          a.name || ' · ' || c.label, e.updated_at, '/eleve/progression'
        from student_competency_levels e
        join me on me.id = e.student_id and me.teacher_id = e.teacher_id
        join competencies c on c.id = e.competency_id and c.teacher_id = me.teacher_id
        join activities a on a.id = c.activity_id
        where exists (select 1 from sequences s where s.activity_id = c.activity_id)
        union all
        select 'result:' || g.id, 'result', 'Résultats mis à jour', a.name,
          g.updated_at, '/eleve/notes'
        from student_grades g join me on me.id = g.student_id and me.teacher_id = g.teacher_id
        join activities a on a.id = g.activity_id
        where exists (select 1 from sequences s where s.activity_id = g.activity_id)
        union all
        select 'program:' || s.id, 'program', 'Programme mis à jour', s.name,
          s.updated_at, '/eleve/programme' from sequences s
        union all
        select 'quiz:' || q.id, 'quiz',
          case when q.closes_at <= now() then 'Corrigé du QCM disponible'
               when q.opens_at > now() then 'QCM programmé' else 'QCM disponible' end,
          q.title || ' · ' || q.activity_name,
          case when q.closes_at <= now() then q.closes_at
               when q.opens_at <= now() then greatest(q.opens_at, q.changed_at)
               else q.changed_at end,
          '/eleve/programme'
        from quizzes q
        where q.closes_at > now() or q.answer_id is not null
      )
      select id, kind, title, detail, at, "to" from events
      where at >= now() - interval '30 days' and at <= now()
      order by at desc, id asc limit 20
    `;
    return rows.map((row) => ({ ...row, at: new Date(row.at).toISOString() }));
  });