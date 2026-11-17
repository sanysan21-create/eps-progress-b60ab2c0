import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { withDb } from "./auth-middleware";
import type { Db } from "./db.server";
import { ACROSPORT_MAX_GROUP_SIZE, type AcrosportBoard } from "./acrosport";

/** Activité d'acrosport programmée pour une classe de l'élève connecté. */
async function loadContext(sql: Db) {
  const { getStudentSession } = await import("./student-qr.server");
  const session = await getStudentSession();
  const studentId = session.data.studentId;
  if (!studentId) return null;
  const rows = await sql<
    { teacher_id: string; class_id: string; activity_id: string; activity_name: string }[]
  >`
    select s.teacher_id, cs.class_id, a.id as activity_id, a.name as activity_name
    from students s
    join class_students cs on cs.student_id = s.id
    join program_sequences q on q.teacher_id = s.teacher_id and q.class_id = cs.class_id
    join activities a on a.id = q.activity_id
    where s.id = ${studentId} and a.name ilike '%acro%'
    order by q.created_at desc
    limit 1
  `;
  const row = rows[0];
  return row ? { studentId, ...row } : null;
}

export const getMyAcrosportGroup = createServerFn({ method: "GET" })
  .middleware([withDb])
  .handler(async ({ context }): Promise<AcrosportBoard> => {
    const ctx = await loadContext(context.sql);
    if (!ctx) return null;
    const classmates = await context.sql<
      { id: string; first_name: string; last_name: string; group_id: string | null }[]
    >`
      select s.id, s.first_name, s.last_name, g.group_id
      from class_students cs
      join students s on s.id = cs.student_id
      left join acrosport_group_members g
        on g.student_id = s.id and g.activity_id = ${ctx.activity_id}
      where cs.class_id = ${ctx.class_id}
      order by s.last_name, s.first_name
    `;
    const me = classmates.find((row) => row.id === ctx.studentId);
    return {
      activity_id: ctx.activity_id,
      activity_name: ctx.activity_name,
      class_id: ctx.class_id,
      my_id: ctx.studentId,
      my_group_id: me?.group_id ?? null,
      max: ACROSPORT_MAX_GROUP_SIZE,
      classmates,
    };
  });

/** Ajoute un camarade de classe (sans groupe) à mon groupe ; crée le groupe si besoin. */
export const addToMyAcrosportGroup = createServerFn({ method: "POST" })
  .middleware([withDb])
  .inputValidator((input: { classmateId: string }) =>
    z.object({ classmateId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const ctx = await loadContext(context.sql);
    if (!ctx) throw new Error("Aucune séquence d'acrosport programmée");
    if (data.classmateId === ctx.studentId) throw new Error("Choisis un camarade");
    const sql = context.sql;

    const mate = await sql<{ id: string }[]>`
      select cs.student_id as id from class_students cs
      where cs.class_id = ${ctx.class_id} and cs.student_id = ${data.classmateId}
        and not exists (
          select 1 from acrosport_group_members g
          where g.student_id = cs.student_id and g.activity_id = ${ctx.activity_id}
        )
    `;
    if (!mate[0]) throw new Error("Cet élève est déjà dans un groupe");

    const mine = await sql<{ group_id: string }[]>`
      select group_id from acrosport_group_members
      where student_id = ${ctx.studentId} and activity_id = ${ctx.activity_id}
    `;
    let groupId = mine[0]?.group_id;
    if (!groupId) {
      const created = await sql<{ group_id: string }[]>`
        insert into acrosport_group_members (teacher_id, class_id, activity_id, group_id, student_id)
        values (${ctx.teacher_id}, ${ctx.class_id}, ${ctx.activity_id}, gen_random_uuid(), ${ctx.studentId})
        returning group_id
      `;
      groupId = created[0]!.group_id;
    }
    const count = await sql<{ n: number }[]>`
      select count(*)::int as n from acrosport_group_members where group_id = ${groupId}
    `;
    if ((count[0]?.n ?? 0) >= ACROSPORT_MAX_GROUP_SIZE) {
      throw new Error(`Groupe complet (${ACROSPORT_MAX_GROUP_SIZE} élèves maximum)`);
    }
    await sql`
      insert into acrosport_group_members (teacher_id, class_id, activity_id, group_id, student_id)
      values (${ctx.teacher_id}, ${ctx.class_id}, ${ctx.activity_id}, ${groupId}, ${data.classmateId})
      on conflict (student_id, activity_id) do nothing
    `;
    return { ok: true };
  });

/** Quitte mon groupe d'acrosport. */
export const leaveMyAcrosportGroup = createServerFn({ method: "POST" })
  .middleware([withDb])
  .handler(async ({ context }) => {
    const ctx = await loadContext(context.sql);
    if (!ctx) return { ok: true };
    const rows = await context.sql<{ group_id: string }[]>`
      delete from acrosport_group_members
      where student_id = ${ctx.studentId} and activity_id = ${ctx.activity_id}
      returning group_id
    `;
    // Un élève resté seul n'a plus de groupe.
    const groupId = rows[0]?.group_id;
    if (groupId) {
      await context.sql`
        delete from acrosport_group_members
        where group_id = ${groupId}
          and (select count(*) from acrosport_group_members where group_id = ${groupId}) = 1
      `;
    }
    return { ok: true };
  });
