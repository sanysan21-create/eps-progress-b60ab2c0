/**
 * Source de vérité serveur des médailles : la progression est TOUJOURS déduite
 * des réussites obtenues (aucun second calcul, aucune donnée dupliquée).
 */
import { computeMedalProgress, highestMedal, type MedalCode, type MedalProgress } from "./medals";

type Sql = (strings: TemplateStringsArray, ...values: unknown[]) => Promise<unknown>;

type AchievementStateRow = {
  medal_type: string | null;
  is_required: boolean;
  earned: boolean;
};

/** Progression des 3 parcours pour un élève. */
export async function medalProgressForStudent(
  sql: Sql,
  studentId: string,
): Promise<MedalProgress[]> {
  const rows = (await sql`
    select a.medal_type, a.is_required, (sa.id is not null) as earned
    from students s
    join achievements a on a.teacher_id = s.teacher_id
    left join student_achievements sa
      on sa.achievement_id = a.id and sa.student_id = s.id
    where s.id = ${studentId}
  `) as AchievementStateRow[];

  return computeMedalProgress(
    rows.map((row) => ({
      medal_type: row.medal_type,
      is_required: row.is_required,
      earned: row.earned,
    })),
  );
}

/** Médaille la plus élevée réellement obtenue par un élève (null si aucune). */
export async function medalForStudent(sql: Sql, studentId: string): Promise<MedalCode | null> {
  return highestMedal(await medalProgressForStudent(sql, studentId));
}
