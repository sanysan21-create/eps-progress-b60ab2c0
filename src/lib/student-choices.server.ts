/**
 * Résolution serveur de l'élève réellement connecté (cookie de session signé du QR code).
 * Aucune information venant du navigateur n'est utilisée pour identifier l'élève.
 */
export async function resolveStudent(): Promise<{ studentId: string; teacherId: string }> {
  const { getStudentSession } = await import("./student-qr.server");
  const session = await getStudentSession();
  const studentId = session.data.studentId;
  if (!studentId) throw new Error("Session élève expirée");

  const { db } = await import("./db.server");
  const sql = await db();
  const [student] = await sql<{ teacher_id: string }[]>`
    select teacher_id from students where id = ${studentId} limit 1
  `;
  if (!student) throw new Error("Élève introuvable");

  return { studentId, teacherId: student.teacher_id };

}
