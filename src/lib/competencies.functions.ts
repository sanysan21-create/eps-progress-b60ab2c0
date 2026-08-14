import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireTeacher, withDb } from "./auth-middleware";
import { DEFAULT_LEVELS } from "@/lib/levels";
import { AFL_CODES, type AflCode, toAfl } from "@/lib/afl";

export type CompetencyLevel = {
  id: string;
  label: string;
  position: number;
  tip?: string | null;
};
export type Competency = {
  id: string;
  label: string;
  afl: AflCode;
  position: number;
  progress_tip: string | null;
  levels: CompetencyLevel[];
};
export type ActivityTree = {
  id: string;
  name: string;
  description: string | null;
  competencies: Competency[];
};

export type StudentPick = {
  id: string;
  first_name: string;
  last_name: string;
  student_code: string;
  class_names: string[];
};

/** Niveau attribué à un élève pour une compétence cible. */
export type StudentMark = { competency_id: string; level_id: string };

export type StudentProfileActivity = {
  activity_id: string;
  activity_name: string;
  competencies: {
    id: string;
    label: string;
    afl: AflCode;
    level_label: string;
    level_position: number;
    level_max: number;
    progress_tip: string | null;
    level_tip: string | null;
    /** Niveau immédiatement supérieur (N+1) tel que configuré par l'enseignant. */
    next_level_label: string | null;
    next_level_tip: string | null;
  }[];
};


const labelSchema = z.string().trim().min(1, "Champ requis").max(200);

export const listActivities = createServerFn({ method: "GET" })
  .middleware([requireTeacher])
  .handler(async ({ context }): Promise<ActivityTree[]> => {
    const rows = await context.sql<
      {
        activity_id: string;
        activity_name: string;
        activity_description: string | null;
        competency_id: string | null;
        competency_label: string | null;
        competency_position: number | null;
        competency_afl: string | null;
        progress_tip: string | null;
        level_id: string | null;
        level_label: string | null;
        level_position: number | null;
        level_tip: string | null;
      }[]
    >`
      select
        a.id as activity_id,
        a.name as activity_name,
        a.description as activity_description,
        c.id as competency_id,
        c.label as competency_label,
        c.position as competency_position,
        c.afl as competency_afl,
        c.progress_tip,
        l.id as level_id,
        l.label as level_label,
        l.position as level_position,
        l.tip as level_tip
      from activities a
      left join competencies c on c.activity_id = a.id
      left join competency_levels l on l.competency_id = c.id
      where a.teacher_id = ${context.userId}
      order by a.name asc, c.afl asc, c.position asc, l.position asc
    `;

    const activities = new Map<string, ActivityTree>();
    const competencies = new Map<string, Competency>();

    for (const row of rows) {
      let activity = activities.get(row.activity_id);
      if (!activity) {
        activity = {
          id: row.activity_id,
          name: row.activity_name,
          description: row.activity_description,
          competencies: [],
        };
        activities.set(row.activity_id, activity);
      }
      if (!row.competency_id) continue;

      let competency = competencies.get(row.competency_id);
      if (!competency) {
        competency = {
          id: row.competency_id,
          label: row.competency_label ?? "",
          afl: toAfl(row.competency_afl),
          position: row.competency_position ?? 0,
          progress_tip: row.progress_tip ?? null,
          levels: [],
        };
        competencies.set(row.competency_id, competency);
        activity.competencies.push(competency);
      }
      if (row.level_id) {
        competency.levels.push({
          id: row.level_id,
          label: row.level_label ?? "",
          position: row.level_position ?? 0,
          tip: row.level_tip ?? null,
        });
      }
    }

    return Array.from(activities.values());
  });

export const createActivity = createServerFn({ method: "POST" })
  .middleware([requireTeacher])
  .inputValidator((input: { name: string; description?: string | null }) =>
    z
      .object({ name: labelSchema, description: z.string().trim().max(1000).nullable().optional() })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const [row] = await context.sql<{ id: string }[]>`
      insert into activities (name, description, teacher_id)
      values (${data.name}, ${data.description ?? null}, ${context.userId})
      returning id
    `;
    if (!row) throw new Error("Création impossible");
    return { id: row.id };
  });

export const updateActivity = createServerFn({ method: "POST" })
  .middleware([requireTeacher])
  .inputValidator((input: { id: string; name?: string; description?: string | null }) =>
    z
      .object({
        id: z.string().uuid(),
        name: labelSchema.optional(),
        description: z.string().trim().max(1000).nullable().optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    if (data.name === undefined && data.description === undefined) return { ok: true };
    await context.sql`
      update activities set
        name = coalesce(${data.name ?? null}, name),
        description = case when ${data.description !== undefined} then ${data.description ?? null} else description end,
        updated_at = now()
      where id = ${data.id} and teacher_id = ${context.userId}
    `;
    return { ok: true };
  });

export const deleteActivity = createServerFn({ method: "POST" })
  .middleware([requireTeacher])
  .inputValidator((input: { id: string }) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await context.sql`
      delete from activities where id = ${data.id} and teacher_id = ${context.userId}
    `;
    return { ok: true };
  });

/** Crée une compétence cible avec ses propres niveaux (par défaut, personnalisables ensuite). */
export const createCompetency = createServerFn({ method: "POST" })
  .middleware([requireTeacher])
  .inputValidator((input: { activityId: string; label: string; afl?: string; levels?: string[] }) =>
    z
      .object({
        activityId: z.string().uuid(),
        label: labelSchema,
        afl: z.enum(AFL_CODES).optional(),
        levels: z.array(z.string().trim().max(200)).max(20).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const [row] = await context.sql<{ id: string }[]>`
      insert into competencies (activity_id, teacher_id, label, afl, position)
      select ${data.activityId}, ${context.userId}, ${data.label}, ${data.afl ?? "AFL1"},
             coalesce((select max(position) from competencies where activity_id = ${data.activityId}), 0) + 1
      where exists (
        select 1 from activities where id = ${data.activityId} and teacher_id = ${context.userId}
      )
      returning id
    `;
    if (!row) throw new Error("Activité introuvable");

    const labels = (data.levels ?? [...DEFAULT_LEVELS]).map((l) => l.trim()).filter(Boolean);
    let position = 0;
    for (const label of labels) {
      position += 1;
      await context.sql`
        insert into competency_levels (competency_id, teacher_id, label, position)
        values (${row.id}, ${context.userId}, ${label}, ${position})
      `;
    }
    return { id: row.id };
  });

export const updateCompetency = createServerFn({ method: "POST" })
  .middleware([requireTeacher])
  .inputValidator((input: { id: string; label?: string; afl?: string; progressTip?: string | null }) =>
    z
      .object({
        id: z.string().uuid(),
        label: labelSchema.optional(),
        afl: z.enum(AFL_CODES).optional(),
        progressTip: z.string().trim().max(300).nullable().optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    if (data.label === undefined && data.afl === undefined && data.progressTip === undefined)
      return { ok: true };
    await context.sql`
      update competencies set
        label = coalesce(${data.label ?? null}, label),
        afl = coalesce(${data.afl ?? null}, afl),
        progress_tip = case when ${data.progressTip !== undefined} then ${data.progressTip || null} else progress_tip end,
        updated_at = now()
      where id = ${data.id} and teacher_id = ${context.userId}
    `;
    return { ok: true };
  });

export const deleteCompetency = createServerFn({ method: "POST" })
  .middleware([requireTeacher])
  .inputValidator((input: { id: string }) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await context.sql`
      delete from competencies where id = ${data.id} and teacher_id = ${context.userId}
    `;
    return { ok: true };
  });

export const addCompetencyLevel = createServerFn({ method: "POST" })
  .middleware([requireTeacher])
  .inputValidator((input: { competencyId: string; label: string }) =>
    z.object({ competencyId: z.string().uuid(), label: labelSchema }).parse(input),
  )
  .handler(async ({ data, context }) => {
    await context.sql`
      insert into competency_levels (competency_id, teacher_id, label, position)
      select ${data.competencyId}, ${context.userId}, ${data.label},
             coalesce((select max(position) from competency_levels where competency_id = ${data.competencyId}), 0) + 1
      where exists (
        select 1 from competencies where id = ${data.competencyId} and teacher_id = ${context.userId}
      )
    `;
    return { ok: true };
  });

export const updateCompetencyLevel = createServerFn({ method: "POST" })
  .middleware([requireTeacher])
  .inputValidator((input: { id: string; label?: string; tip?: string | null }) =>
    z
      .object({
        id: z.string().uuid(),
        label: labelSchema.optional(),
        tip: z.string().trim().max(300).nullable().optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    if (data.label === undefined && data.tip === undefined) return { ok: true };
    await context.sql`
      update competency_levels set
        label = coalesce(${data.label ?? null}, label),
        tip = case when ${data.tip !== undefined} then ${data.tip || null} else tip end,
        updated_at = now()
      where id = ${data.id} and teacher_id = ${context.userId}
    `;
    return { ok: true };
  });

export const deleteCompetencyLevel = createServerFn({ method: "POST" })
  .middleware([requireTeacher])
  .inputValidator((input: { id: string }) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await context.sql`
      delete from competency_levels where id = ${data.id} and teacher_id = ${context.userId}
    `;
    return { ok: true };
  });

/** Échange l'ordre de deux niveaux d'une même compétence cible. */
export const swapCompetencyLevels = createServerFn({ method: "POST" })
  .middleware([requireTeacher])
  .inputValidator((input: { firstId: string; secondId: string }) =>
    z.object({ firstId: z.string().uuid(), secondId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const rows = await context.sql<{ id: string; position: number }[]>`
      select id, position from competency_levels
      where teacher_id = ${context.userId}
        and id in (${data.firstId}, ${data.secondId})
    `;
    if (rows.length !== 2) throw new Error("Niveaux introuvables");

    const [a, b] = rows;
    await context.sql`update competency_levels set position = ${b!.position} where id = ${a!.id}`;
    await context.sql`update competency_levels set position = ${a!.position} where id = ${b!.id}`;
    return { ok: true };
  });

export const listTeacherStudents = createServerFn({ method: "GET" })
  .middleware([requireTeacher])
  .handler(async ({ context }): Promise<StudentPick[]> => {
    const rows = await context.sql<
      {
        id: string;
        first_name: string;
        last_name: string;
        student_code: string;
        class_names: string[] | null;
      }[]
    >`
      select s.id, s.first_name, s.last_name, s.student_code,
             array_remove(array_agg(c.name), null) as class_names
      from students s
      left join class_students cs on cs.student_id = s.id
      left join classes c on c.id = cs.class_id
      where s.teacher_id = ${context.userId}
      group by s.id
      order by s.last_name asc, s.first_name asc
    `;
    return rows.map((row) => ({
      id: row.id,
      first_name: row.first_name,
      last_name: row.last_name,
      student_code: row.student_code,
      class_names: row.class_names ?? [],
    }));
  });

export const listStudentMarks = createServerFn({ method: "GET" })
  .middleware([requireTeacher])
  .inputValidator((input: { studentId: string }) =>
    z.object({ studentId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }): Promise<StudentMark[]> => {
    return await context.sql<StudentMark[]>`
      select competency_id, level_id from student_competency_levels
      where student_id = ${data.studentId} and teacher_id = ${context.userId}
    `;
  });

/** Attribue un niveau précis à une compétence cible, pour un ou plusieurs élèves. */
export const setStudentLevel = createServerFn({ method: "POST" })
  .middleware([requireTeacher])
  .inputValidator((input: { studentIds: string[]; competencyId: string; levelId: string }) =>
    z
      .object({
        studentIds: z.array(z.string().uuid()).min(1).max(200),
        competencyId: z.string().uuid(),
        levelId: z.string().uuid(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await context.sql`
      insert into student_competency_levels (student_id, competency_id, level_id, teacher_id)
      select s.id, ${data.competencyId}, ${data.levelId}, ${context.userId}
      from students s
      where s.teacher_id = ${context.userId} and s.id = any(${data.studentIds}::uuid[])
      on conflict (student_id, competency_id)
      do update set level_id = excluded.level_id, updated_at = now()
    `;
    return { saved: data.studentIds.length };
  });

/** Retire le niveau attribué (la compétence disparaît alors du profil élève). */
export const clearStudentLevel = createServerFn({ method: "POST" })
  .middleware([requireTeacher])
  .inputValidator((input: { studentIds: string[]; competencyId: string }) =>
    z
      .object({
        studentIds: z.array(z.string().uuid()).min(1).max(200),
        competencyId: z.string().uuid(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await context.sql`
      delete from student_competency_levels
      where teacher_id = ${context.userId}
        and competency_id = ${data.competencyId}
        and student_id = any(${data.studentIds}::uuid[])
    `;
    return { ok: true };
  });

/** Lecture seule : niveaux effectivement attribués à l'élève identifié par son cookie de session. */
export const getMyProfileCompetencies = createServerFn({ method: "GET" })
  .middleware([withDb])
  .handler(async ({ context }): Promise<StudentProfileActivity[]> => {
    const { getStudentSession } = await import("./student-qr.server");
    const session = await getStudentSession();
    const studentId = session.data.studentId;
    if (!studentId) return [];

    const rows = await context.sql<
      {
        activity_id: string;
        activity_name: string;
        competency_id: string;
        competency_label: string;
        competency_afl: string | null;
        progress_tip: string | null;
        level_label: string;
        level_position: number;
        level_tip: string | null;
        level_max: number | string;
      }[]
    >`
      select
        a.id as activity_id,
        a.name as activity_name,
        c.id as competency_id,
        c.label as competency_label,
        c.afl as competency_afl,
        c.progress_tip,
        l.label as level_label,
        l.position as level_position,
        l.tip as level_tip,
        (select max(position) from competency_levels where competency_id = c.id) as level_max
      from student_competency_levels scl
      join competencies c on c.id = scl.competency_id
      join activities a on a.id = c.activity_id
      join competency_levels l on l.id = scl.level_id
      where scl.student_id = ${studentId}
      order by a.name asc, c.afl asc, c.position asc, c.label asc
    `;

    const grouped = new Map<string, StudentProfileActivity>();
    for (const row of rows) {
      const entry = grouped.get(row.activity_id) ?? {
        activity_id: row.activity_id,
        activity_name: row.activity_name,
        competencies: [],
      };
      entry.competencies.push({
        id: row.competency_id,
        label: row.competency_label,
        afl: toAfl(row.competency_afl),
        level_label: row.level_label,
        level_position: row.level_position,
        level_max: Math.max(row.level_position, Number(row.level_max) || 0),
        progress_tip: row.progress_tip ?? null,
        level_tip: row.level_tip ?? null,
      });
      grouped.set(row.activity_id, entry);
    }

    return Array.from(grouped.values());
  });
