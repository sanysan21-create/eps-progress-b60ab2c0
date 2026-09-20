import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireTeacher } from "./auth-middleware";

export type ClassActivityRow = {
  activity_id: string;
  activity_name: string;
  student_count: number;
  level_count: number;
  grade_count: number;
  extra_count: number;
  has_sequence: boolean;
};

/**
 * Activités réellement renseignées pour les élèves d'une classe
 * (niveaux de compétences, résultats, cotations / poules / équipes),
 * avec l'information « une séquence existe-t-elle dans le Programme ».
 */
export const listClassActivityData = createServerFn({ method: "GET" })
  .middleware([requireTeacher])
  .inputValidator((input: { classId: string }) =>
    z.object({ classId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }): Promise<ClassActivityRow[]> => {
    const rows = await context.sql<
      {
        activity_id: string;
        activity_name: string;
        student_count: number | string;
        level_count: number | string;
        grade_count: number | string;
        extra_count: number | string;
        has_sequence: boolean;
      }[]
    >`
      with members as (
        select cs.student_id
        from class_students cs
        join students s on s.id = cs.student_id
        where cs.class_id = ${data.classId} and s.teacher_id = ${context.userId}
      ),
      marks as (
        select c.activity_id, scl.student_id, 'level' as kind
        from student_competency_levels scl
        join competencies c on c.id = scl.competency_id
        where scl.student_id in (select student_id from members)
        union all
        select g.activity_id, g.student_id, 'grade'
        from student_grades g
        where g.student_id in (select student_id from members)
        union all
        select x.activity_id, x.student_id, 'extra' from student_climbing_grades x
        where x.student_id in (select student_id from members)
        union all
        select x.activity_id, x.student_id, 'extra' from student_badminton_pools x
        where x.student_id in (select student_id from members)
        union all
        select x.activity_id, x.student_id, 'extra' from student_ultimate_teams x
        where x.student_id in (select student_id from members)
      )
      select
        a.id as activity_id,
        a.name as activity_name,
        count(distinct m.student_id) as student_count,
        count(*) filter (where m.kind = 'level') as level_count,
        count(*) filter (where m.kind = 'grade') as grade_count,
        count(*) filter (where m.kind = 'extra') as extra_count,
        exists (
          select 1 from program_sequences ps
          where ps.teacher_id = ${context.userId}
            and ps.activity_id = a.id
            and (ps.class_id is null or ps.class_id = ${data.classId})
        ) as has_sequence
      from marks m
      join activities a on a.id = m.activity_id
      group by a.id, a.name
      order by a.name asc
    `;

    return rows.map((row) => ({
      activity_id: row.activity_id,
      activity_name: row.activity_name,
      student_count: Number(row.student_count),
      level_count: Number(row.level_count),
      grade_count: Number(row.grade_count),
      extra_count: Number(row.extra_count),
      has_sequence: row.has_sequence,
    }));
  });

/** Supprime tout ce qui a été attribué à cette classe pour cette activité. */
export const clearClassActivityData = createServerFn({ method: "POST" })
  .middleware([requireTeacher])
  .inputValidator((input: { classId: string; activityId: string }) =>
    z.object({ classId: z.string().uuid(), activityId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const students = await context.sql<{ student_id: string }[]>`
      select cs.student_id
      from class_students cs
      join students s on s.id = cs.student_id
      where cs.class_id = ${data.classId} and s.teacher_id = ${context.userId}
    `;
    const ids = students.map((row) => row.student_id);
    if (ids.length === 0) return { ok: true, removed: 0 };

    await context.sql`
      delete from student_competency_levels
      where student_id = any(${ids}::uuid[])
        and competency_id in (select id from competencies where activity_id = ${data.activityId})
    `;
    await context.sql`
      delete from student_grades
      where student_id = any(${ids}::uuid[]) and activity_id = ${data.activityId}
    `;
    await context.sql`
      delete from student_climbing_grades
      where student_id = any(${ids}::uuid[]) and activity_id = ${data.activityId}
    `;
    await context.sql`
      delete from student_badminton_pools
      where student_id = any(${ids}::uuid[]) and activity_id = ${data.activityId}
    `;
    await context.sql`
      delete from student_ultimate_teams
      where student_id = any(${ids}::uuid[]) and activity_id = ${data.activityId}
    `;

    return { ok: true, removed: ids.length };
  });
