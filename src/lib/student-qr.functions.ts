import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type QrStatusRow = {
  student_id: string;
  status: "active" | "revoked" | "none";
  created_at: string | null;
  revoked_at: string | null;
};

export type StudentQr = {
  token: string;
  createdAt: string;
  regeneratedFromEarlier: boolean;
};

/** Statuts des QR codes de tous les élèves de l'enseignant connecté. */
export const listQrStatuses = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<QrStatusRow[]> => {
    const { data, error } = await context.supabase
      .from("student_qr_tokens")
      .select("student_id, active, created_at, revoked_at")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);

    const byStudent = new Map<string, QrStatusRow>();
    for (const row of data ?? []) {
      const current = byStudent.get(row.student_id);
      if (current && current.status === "active") continue;
      byStudent.set(row.student_id, {
        student_id: row.student_id,
        status: row.active ? "active" : "revoked",
        created_at: row.created_at,
        revoked_at: row.revoked_at,
      });
    }
    return [...byStudent.values()];
  });

/** QR code actif d'un élève (le jeton est recalculé côté serveur, jamais stocké en clair). */
export const getStudentQr = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { studentId: string }) =>
    z.object({ studentId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }): Promise<StudentQr | null> => {
    const { data: row, error } = await context.supabase
      .from("student_qr_tokens")
      .select("id, created_at")
      .eq("student_id", data.studentId)
      .eq("active", true)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) return null;

    const { signStudentToken } = await import("./student-qr.server");
    return { token: signStudentToken(row.id), createdAt: row.created_at, regeneratedFromEarlier: false };
  });

/** Génère (ou régénère) le QR code d'un élève : l'ancien jeton est révoqué immédiatement. */
export const generateStudentQr = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { studentId: string }) =>
    z.object({ studentId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }): Promise<StudentQr> => {
    // RLS garantit que l'enseignant ne peut cibler que ses propres élèves.
    const { data: student, error: studentError } = await context.supabase
      .from("students")
      .select("id")
      .eq("id", data.studentId)
      .maybeSingle();
    if (studentError) throw new Error(studentError.message);
    if (!student) throw new Error("Élève introuvable");

    const { data: revoked, error: revokeError } = await context.supabase
      .from("student_qr_tokens")
      .update({ active: false, revoked_at: new Date().toISOString() })
      .eq("student_id", data.studentId)
      .eq("active", true)
      .select("id");
    if (revokeError) throw new Error(revokeError.message);

    const { signStudentToken, hashStudentToken } = await import("./student-qr.server");
    const tokenId = crypto.randomUUID();
    const token = signStudentToken(tokenId);

    const { data: row, error } = await context.supabase
      .from("student_qr_tokens")
      .insert({
        id: tokenId,
        student_id: data.studentId,
        teacher_id: context.userId,
        token_hash: hashStudentToken(token),
      })
      .select("created_at")
      .single();
    if (error) throw new Error(error.message);

    return {
      token,
      createdAt: row.created_at,
      regeneratedFromEarlier: (revoked?.length ?? 0) > 0,
    };
  });

/** Génère les QR codes manquants pour une classe entière. */
export const generateMissingQrForClass = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { classId: string }) =>
    z.object({ classId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }): Promise<{ generated: number }> => {
    const { data: links, error } = await context.supabase
      .from("class_students")
      .select("student_id")
      .eq("class_id", data.classId);
    if (error) throw new Error(error.message);

    const studentIds = (links ?? []).map((l) => l.student_id);
    if (studentIds.length === 0) return { generated: 0 };

    const { data: existing, error: existingError } = await context.supabase
      .from("student_qr_tokens")
      .select("student_id")
      .eq("active", true)
      .in("student_id", studentIds);
    if (existingError) throw new Error(existingError.message);

    const withToken = new Set((existing ?? []).map((r) => r.student_id));
    const missing = studentIds.filter((id) => !withToken.has(id));
    if (missing.length === 0) return { generated: 0 };

    const { signStudentToken, hashStudentToken } = await import("./student-qr.server");
    const rows = missing.map((studentId) => {
      const tokenId = crypto.randomUUID();
      return {
        id: tokenId,
        student_id: studentId,
        teacher_id: context.userId,
        token_hash: hashStudentToken(signStudentToken(tokenId)),
      };
    });

    const { error: insertError } = await context.supabase.from("student_qr_tokens").insert(rows);
    if (insertError) throw new Error(insertError.message);

    return { generated: rows.length };
  });
