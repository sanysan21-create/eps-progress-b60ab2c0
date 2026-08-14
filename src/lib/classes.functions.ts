import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireTeacher } from "./auth-middleware";

export type ClassRow = {
  id: string;
  name: string;
  school_year: string;
  student_count: number;
};

export type StudentRow = {
  id: string;
  first_name: string;
  last_name: string;
  student_code: string;
  qr_token: string;
  created_at: string;
  last_login_at: string | null;
  as_member: boolean;
};

const nameSchema = z.string().trim().min(1, "Champ requis").max(80);

function toIso(value: Date | string | null): string | null {
  if (value === null) return null;
  return value instanceof Date ? value.toISOString() : value;
}

function toStudentRow(row: {
  id: string;
  first_name: string;
  last_name: string;
  student_code: string;
  qr_token: string;
  created_at: Date | string;
  last_login_at: Date | string | null;
  as_member: boolean;
}): StudentRow {
  return {
    id: row.id,
    first_name: row.first_name,
    last_name: row.last_name,
    student_code: row.student_code,
    qr_token: row.qr_token,
    created_at: toIso(row.created_at) as string,
    last_login_at: toIso(row.last_login_at),
    as_member: row.as_member,
  };
}

export const listClasses = createServerFn({ method: "GET" })
  .middleware([requireTeacher])
  .handler(async ({ context }): Promise<ClassRow[]> => {
    const rows = await context.sql<{ id: string; name: string; school_year: string; student_count: string }[]>`
      select c.id, c.name, c.school_year, count(cs.id)::int as student_count
      from classes c
      left join class_students cs on cs.class_id = c.id
      where c.teacher_id = ${context.userId}
      group by c.id
      order by c.school_year desc, c.name asc
    `;
    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      school_year: row.school_year,
      student_count: Number(row.student_count),
    }));
  });

export const createClass = createServerFn({ method: "POST" })
  .middleware([requireTeacher])
  .inputValidator((input: { name: string; schoolYear: string }) =>
    z.object({ name: nameSchema, schoolYear: nameSchema }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const [row] = await context.sql<{ id: string }[]>`
      insert into classes (name, school_year, teacher_id)
      values (${data.name}, ${data.schoolYear}, ${context.userId})
      returning id
    `;
    if (!row) throw new Error("Échec de la création de la classe");
    return { id: row.id };
  });

export const updateClass = createServerFn({ method: "POST" })
  .middleware([requireTeacher])
  .inputValidator((input: { id: string; name: string; schoolYear: string }) =>
    z.object({ id: z.string().uuid(), name: nameSchema, schoolYear: nameSchema }).parse(input),
  )
  .handler(async ({ data, context }) => {
    await context.sql`
      update classes set name = ${data.name}, school_year = ${data.schoolYear}, updated_at = now()
      where id = ${data.id} and teacher_id = ${context.userId}
    `;
    return { ok: true };
  });

export const deleteClass = createServerFn({ method: "POST" })
  .middleware([requireTeacher])
  .inputValidator((input: { id: string }) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await context.sql`delete from classes where id = ${data.id} and teacher_id = ${context.userId}`;
    return { ok: true };
  });

export const getClassDetail = createServerFn({ method: "GET" })
  .middleware([requireTeacher])
  .inputValidator((input: { id: string }) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(
    async ({
      data,
      context,
    }): Promise<{ klass: { id: string; name: string; school_year: string }; students: StudentRow[] }> => {
      const [klass] = await context.sql<{ id: string; name: string; school_year: string }[]>`
        select id, name, school_year from classes
        where id = ${data.id} and teacher_id = ${context.userId}
      `;
      if (!klass) throw new Error("Classe introuvable");

      const rows = await context.sql<
        {
          id: string;
          first_name: string;
          last_name: string;
          student_code: string;
          qr_token: string;
          created_at: Date;
          last_login_at: Date | null;
          as_member: boolean;
        }[]
      >`
        select s.id, s.first_name, s.last_name, s.student_code, s.qr_token, s.created_at, s.last_login_at, s.as_member
        from class_students cs
        join students s on s.id = cs.student_id
        where cs.class_id = ${data.id} and cs.teacher_id = ${context.userId}
        order by s.last_name, s.first_name
      `;

      const students = rows
        .map(toStudentRow)
        .sort((a, b) => `${a.last_name} ${a.first_name}`.localeCompare(`${b.last_name} ${b.first_name}`, "fr"));

      return { klass, students };
    },
  );

export const addStudent = createServerFn({ method: "POST" })
  .middleware([requireTeacher])
  .inputValidator((input: { classId: string; firstName: string; lastName: string }) =>
    z
      .object({ classId: z.string().uuid(), firstName: nameSchema, lastName: nameSchema })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const [klass] = await context.sql<{ id: string }[]>`
      select id from classes where id = ${data.classId} and teacher_id = ${context.userId}
    `;
    if (!klass) throw new Error("Classe introuvable");

    const { generateStudentCode } = await import("./db.server");
    const studentCode = await generateStudentCode(context.sql);

    const [student] = await context.sql<{ id: string; student_code: string }[]>`
      insert into students (first_name, last_name, teacher_id, student_code)
      values (${data.firstName}, ${data.lastName}, ${context.userId}, ${studentCode})
      returning id, student_code
    `;
    if (!student) throw new Error("Échec de la création de l'élève");

    await context.sql`
      insert into class_students (class_id, student_id, teacher_id)
      values (${data.classId}, ${student.id}, ${context.userId})
    `;

    return { id: student.id, studentCode: student.student_code };
  });

export const importStudents = createServerFn({ method: "POST" })
  .middleware([requireTeacher])
  .inputValidator(
    (input: { classId: string; rows: { firstName: string; lastName: string }[] }) =>
      z
        .object({
          classId: z.string().uuid(),
          rows: z
            .array(z.object({ firstName: nameSchema, lastName: nameSchema }))
            .min(1)
            .max(500),
        })
        .parse(input),
  )
  .handler(async ({ data, context }) => {
    const [klass] = await context.sql<{ id: string }[]>`
      select id from classes where id = ${data.classId} and teacher_id = ${context.userId}
    `;
    if (!klass) throw new Error("Classe introuvable");

    const { generateStudentCode } = await import("./db.server");

    let imported = 0;
    for (const r of data.rows) {
      const studentCode = await generateStudentCode(context.sql);
      const [student] = await context.sql<{ id: string }[]>`
        insert into students (first_name, last_name, teacher_id, student_code)
        values (${r.firstName}, ${r.lastName}, ${context.userId}, ${studentCode})
        returning id
      `;
      if (!student) continue;
      await context.sql`
        insert into class_students (class_id, student_id, teacher_id)
        values (${data.classId}, ${student.id}, ${context.userId})
      `;
      imported += 1;
    }

    return { imported };
  });

export const updateStudent = createServerFn({ method: "POST" })
  .middleware([requireTeacher])
  .inputValidator((input: { id: string; firstName: string; lastName: string }) =>
    z.object({ id: z.string().uuid(), firstName: nameSchema, lastName: nameSchema }).parse(input),
  )
  .handler(async ({ data, context }) => {
    await context.sql`
      update students set first_name = ${data.firstName}, last_name = ${data.lastName}, updated_at = now()
      where id = ${data.id} and teacher_id = ${context.userId}
    `;
    return { ok: true };
  });

export const regenerateQrToken = createServerFn({ method: "POST" })
  .middleware([requireTeacher])
  .inputValidator((input: { id: string }) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const [row] = await context.sql<{ qr_token: string }[]>`
      update students set qr_token = gen_random_uuid(), updated_at = now()
      where id = ${data.id} and teacher_id = ${context.userId}
      returning qr_token
    `;
    if (!row) throw new Error("Élève introuvable");
    return { qrToken: row.qr_token };
  });

export const moveStudent = createServerFn({ method: "POST" })
  .middleware([requireTeacher])
  .inputValidator((input: { studentId: string; fromClassId: string; toClassId: string }) =>
    z
      .object({
        studentId: z.string().uuid(),
        fromClassId: z.string().uuid(),
        toClassId: z.string().uuid(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    if (data.fromClassId === data.toClassId) return { ok: true };

    await context.sql`
      update class_students set class_id = ${data.toClassId}, updated_at = now()
      where student_id = ${data.studentId} and class_id = ${data.fromClassId} and teacher_id = ${context.userId}
    `;
    return { ok: true };
  });

export const removeFromClass = createServerFn({ method: "POST" })
  .middleware([requireTeacher])
  .inputValidator((input: { studentId: string; classId: string }) =>
    z.object({ studentId: z.string().uuid(), classId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    await context.sql`
      delete from class_students
      where student_id = ${data.studentId} and class_id = ${data.classId} and teacher_id = ${context.userId}
    `;
    return { ok: true };
  });

export const deleteStudent = createServerFn({ method: "POST" })
  .middleware([requireTeacher])
  .inputValidator((input: { id: string }) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await context.sql`delete from students where id = ${data.id} and teacher_id = ${context.userId}`;
    return { ok: true };
  });

export type SearchResult = StudentRow & { classes: { id: string; name: string }[] };

export const searchStudents = createServerFn({ method: "GET" })
  .middleware([requireTeacher])
  .inputValidator((input: { query: string }) =>
    z.object({ query: z.string().trim().max(80) }).parse(input),
  )
  .handler(async ({ data, context }): Promise<SearchResult[]> => {
    const term = data.query.trim();
    if (term.length < 2) return [];
    const pattern = `%${term}%`;

    const rows = await context.sql<
      {
        id: string;
        first_name: string;
        last_name: string;
        student_code: string;
        qr_token: string;
        created_at: Date;
        last_login_at: Date | null;
        as_member: boolean;
        class_id: string | null;
        class_name: string | null;
      }[]
    >`
      select s.id, s.first_name, s.last_name, s.student_code, s.qr_token, s.created_at, s.last_login_at, s.as_member,
             c.id as class_id, c.name as class_name
      from students s
      left join class_students cs on cs.student_id = s.id
      left join classes c on c.id = cs.class_id
      where s.teacher_id = ${context.userId}
        and (s.first_name ilike ${pattern} or s.last_name ilike ${pattern} or s.student_code ilike ${pattern}
             or c.name ilike ${pattern})
      limit 200
    `;

    const byStudent = new Map<string, SearchResult>();
    for (const row of rows) {
      const existing = byStudent.get(row.id);
      const klass = row.class_id && row.class_name ? { id: row.class_id, name: row.class_name } : null;
      if (existing) {
        if (klass && !existing.classes.some((c) => c.id === klass.id)) existing.classes.push(klass);
        continue;
      }
      byStudent.set(row.id, { ...toStudentRow(row), classes: klass ? [klass] : [] });
    }

    return [...byStudent.values()].sort((a, b) =>
      `${a.last_name} ${a.first_name}`.localeCompare(`${b.last_name} ${b.first_name}`, "fr"),
    );
  });

/** Inscription de l'élève à l'Association Sportive (AS) — badge visible côté élève. */
export const setStudentAsMember = createServerFn({ method: "POST" })
  .middleware([requireTeacher])
  .inputValidator((input: { id: string; asMember: boolean }) =>
    z.object({ id: z.string().uuid(), asMember: z.boolean() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    await context.sql`
      update students set as_member = ${data.asMember}, updated_at = now()
      where id = ${data.id} and teacher_id = ${context.userId}
    `;
    return { ok: true };
  });
