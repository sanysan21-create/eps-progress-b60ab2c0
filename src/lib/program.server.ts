import type { ProgramSession } from "./program";

type RawSession = {
  id: string;
  class_id: string | null;
  activity_id: string | null;
  activity_name: string | null;
  session_date: string | null;
  period_label: string | null;
  objective: string | null;
  description: string | null;
  classes: { name: string } | null;
  activities: { name: string } | null;
};

/** Normalise les lignes Supabase du programme. */
export function mapProgramRows(rows: unknown): ProgramSession[] {
  return ((rows ?? []) as RawSession[]).map((row) => ({
    id: row.id,
    class_id: row.class_id,
    class_name: row.classes?.name ?? null,
    activity_id: row.activity_id,
    activity_name: row.activities?.name ?? row.activity_name ?? "Activité",
    session_date: row.session_date,
    period_label: row.period_label,
    objective: row.objective,
    description: row.description,
  }));
}
