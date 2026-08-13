import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

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
};

const nameSchema = z.string().trim().min(1, "Champ requis").max(80);

export const listClasses = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<ClassRow[]> => {
    const { data, error } = await context.supabase
      .from("classes")
      .select("id, name, school_year, class_students(count)")
      .order("school_year", { ascending: false })
      .order("name", { ascending: true });
    if (error) throw new Error(error.message);

    return (data ?? []).map((row) => {
      const counts = row.class_students as unknown as { count: number }[] | null;
      return {
        id: row.id,
        name: row.name,
        school_year: row.school_year,
        student_count: counts?.[0]?.count ?? 0,
      };
    });
  });

export const createClass = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { name: string; schoolYear: string }) =>
    z.object({ name: nameSchema, schoolYear: nameSchema }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("classes")
      .insert({ name: data.name, school_year: data.schoolYear, teacher_id: context.userId })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: row.id };
  });

export const updateClass = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string; name: string; schoolYear: string }) =>
    z.object({ id: z.string().uuid(), name: nameSchema, schoolYear: nameSchema }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("classes")
      .update({ name: data.name, school_year: data.schoolYear })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteClass = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("classes").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const getClassDetail = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(
    async ({
      data,
      context,
    }): Promise<{ klass: { id: string; name: string; school_year: string }; students: StudentRow[] }> => {
      const { data: klass, error: classError } = await context.supabase
        .from("classes")
        .select("id, name, school_year")
        .eq("id", data.id)
        .maybeSingle();
      if (classError) throw new Error(classError.message);
      if (!klass) throw new Error("Classe introuvable");

      const { data: rows, error } = await context.supabase
        .from("class_students")
        .select("students(id, first_name, last_name, student_code, qr_token, created_at)")
        .eq("class_id", data.id);
      if (error) throw new Error(error.message);

      const students = (rows ?? [])
        .map((row) => row.students as unknown as StudentRow | null)
        .filter((s): s is StudentRow => Boolean(s))
        .sort((a, b) =>
          `${a.last_name} ${a.first_name}`.localeCompare(`${b.last_name} ${b.first_name}`, "fr"),
        );

      return { klass, students };
    },
  );

export const addStudent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { classId: string; firstName: string; lastName: string }) =>
    z
      .object({ classId: z.string().uuid(), firstName: nameSchema, lastName: nameSchema })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { data: student, error } = await context.supabase
      .from("students")
      .insert({ first_name: data.firstName, last_name: data.lastName, teacher_id: context.userId })
      .select("id, student_code")
      .single();
    if (error) throw new Error(error.message);

    const { error: linkError } = await context.supabase
      .from("class_students")
      .insert({ class_id: data.classId, student_id: student.id, teacher_id: context.userId });
    if (linkError) throw new Error(linkError.message);

    return { id: student.id, studentCode: student.student_code };
  });

export const importStudents = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
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
    const { data: inserted, error } = await context.supabase
      .from("students")
      .insert(
        data.rows.map((r) => ({
          first_name: r.firstName,
          last_name: r.lastName,
          teacher_id: context.userId,
        })),
      )
      .select("id");
    if (error) throw new Error(error.message);

    const { error: linkError } = await context.supabase.from("class_students").insert(
      (inserted ?? []).map((s) => ({
        class_id: data.classId,
        student_id: s.id,
        teacher_id: context.userId,
      })),
    );
    if (linkError) throw new Error(linkError.message);

    return { imported: inserted?.length ?? 0 };
  });

export const updateStudent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string; firstName: string; lastName: string }) =>
    z.object({ id: z.string().uuid(), firstName: nameSchema, lastName: nameSchema }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("students")
      .update({ first_name: data.firstName, last_name: data.lastName })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const regenerateQrToken = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("students")
      .update({ qr_token: crypto.randomUUID() })
      .eq("id", data.id)
      .select("qr_token")
      .single();
    if (error) throw new Error(error.message);
    return { qrToken: row.qr_token };
  });

export const moveStudent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
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

    const { error } = await context.supabase
      .from("class_students")
      .update({ class_id: data.toClassId })
      .eq("student_id", data.studentId)
      .eq("class_id", data.fromClassId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const removeFromClass = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { studentId: string; classId: string }) =>
    z.object({ studentId: z.string().uuid(), classId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("class_students")
      .delete()
      .eq("student_id", data.studentId)
      .eq("class_id", data.classId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteStudent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("students").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export type SearchResult = StudentRow & { classes: { id: string; name: string }[] };

export const searchStudents = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { query: string }) =>
    z.object({ query: z.string().trim().max(80) }).parse(input),
  )
  .handler(async ({ data, context }): Promise<SearchResult[]> => {
    const term = data.query.trim();
    if (term.length < 2) return [];

    const { data: rows, error } = await context.supabase
      .from("students")
      .select(
        "id, first_name, last_name, student_code, qr_token, created_at, class_students(classes(id, name))",
      )
      .or(
        `first_name.ilike.%${term}%,last_name.ilike.%${term}%,student_code.ilike.%${term}%`,
      )
      .limit(50);
    if (error) throw new Error(error.message);

    const byName: SearchResult[] = (rows ?? []).map((row) => {
      const links = row.class_students as unknown as { classes: { id: string; name: string } | null }[];
      return {
        id: row.id,
        first_name: row.first_name,
        last_name: row.last_name,
        student_code: row.student_code,
        qr_token: row.qr_token,
        created_at: row.created_at,
        classes: (links ?? [])
          .map((l) => l.classes)
          .filter((c): c is { id: string; name: string } => Boolean(c)),
      };
    });

    // Recherche par nom de classe
    const { data: classRows, error: classError } = await context.supabase
      .from("classes")
      .select("id, name, class_students(students(id, first_name, last_name, student_code, qr_token, created_at))")
      .ilike("name", `%${term}%`)
      .limit(20);
    if (classError) throw new Error(classError.message);

    const seen = new Set(byName.map((s) => s.id));
    for (const klass of classRows ?? []) {
      const links = klass.class_students as unknown as { students: StudentRow | null }[];
      for (const link of links ?? []) {
        const student = link.students;
        if (!student || seen.has(student.id)) continue;
        seen.add(student.id);
        byName.push({ ...student, classes: [{ id: klass.id, name: klass.name }] });
      }
    }

    return byName.sort((a, b) =>
      `${a.last_name} ${a.first_name}`.localeCompare(`${b.last_name} ${b.first_name}`, "fr"),
    );
  });
