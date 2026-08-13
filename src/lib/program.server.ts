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
  scale_image_path?: string | null;
  scale_activity_id?: string | null;
  classes: { name: string } | null;
  activities: { name: string } | null;
  scale_activity?: { name: string } | null;
};

export const PROGRAM_SCALES_BUCKET = "program-scales";

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
    scale_image_path: row.scale_image_path ?? null,
    scale_image_url: null,
    scale_activity_id: row.scale_activity_id ?? null,
    scale_activity_name: row.scale_activity?.name ?? null,
  }));
}

/**
 * Le bucket des barèmes est privé : on génère des URLs signées côté serveur
 * pour que l'enseignant comme l'élève puissent afficher l'image.
 */
export async function withSignedScaleUrls(sessions: ProgramSession[]): Promise<ProgramSession[]> {
  const paths = [
    ...new Set(sessions.map((s) => s.scale_image_path).filter((p): p is string => Boolean(p))),
  ];
  if (paths.length === 0) return sessions;

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const signed = new Map<string, string>();
  await Promise.all(
    paths.map(async (path) => {
      const { data } = await supabaseAdmin.storage
        .from(PROGRAM_SCALES_BUCKET)
        .createSignedUrl(path, 60 * 60 * 6);
      if (data?.signedUrl) signed.set(path, data.signedUrl);
    }),
  );

  return sessions.map((session) => ({
    ...session,
    scale_image_url: session.scale_image_path
      ? (signed.get(session.scale_image_path) ?? null)
      : null,
  }));
}
