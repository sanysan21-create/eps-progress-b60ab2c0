/**
 * Résolution serveur de l'élève réellement connecté (cookie de session signé du QR code).
 * Aucune information venant du navigateur n'est utilisée pour identifier l'élève.
 */
export async function resolveStudent(): Promise<{ studentId: string; teacherId: string }> {
  const { getStudentSession } = await import("./student-qr.server");
  const session = await getStudentSession();
  const studentId = session.data.studentId;
  if (!studentId) throw new Error("Session élève expirée");

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: student, error } = await supabaseAdmin
    .from("students")
    .select("teacher_id")
    .eq("id", studentId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!student) throw new Error("Élève introuvable");

  return { studentId, teacherId: student.teacher_id };
}
