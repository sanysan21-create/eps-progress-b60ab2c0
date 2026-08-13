export type ProgramSession = {
  id: string;
  class_id: string | null;
  class_name: string | null;
  activity_id: string | null;
  activity_name: string;
  session_date: string | null;
  period_label: string | null;
  objective: string | null;
  description: string | null;
};

/** "Semaine du 7 septembre" — libellé lisible d'une séance planifiée. */
export function sessionWhen(session: ProgramSession): string {
  if (session.period_label) return session.period_label;
  if (!session.session_date) return "Date à venir";
  const date = new Date(`${session.session_date}T12:00:00`);
  if (Number.isNaN(date.getTime())) return session.session_date;
  return date.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
}

/** Prochaine séance à venir (date >= aujourd'hui), sinon la première planifiée. */
export function nextSession(sessions: ProgramSession[]): ProgramSession | null {
  if (sessions.length === 0) return null;
  const today = new Date().toISOString().slice(0, 10);
  const upcoming = sessions
    .filter((session) => session.session_date && session.session_date >= today)
    .sort((a, b) => (a.session_date ?? "").localeCompare(b.session_date ?? ""));
  return upcoming[0] ?? sessions[0] ?? null;
}

export function upcomingSessions(sessions: ProgramSession[]): ProgramSession[] {
  const next = nextSession(sessions);
  const today = new Date().toISOString().slice(0, 10);
  return sessions
    .filter((session) => session.id !== next?.id)
    .filter((session) => !session.session_date || session.session_date >= today)
    .sort((a, b) => (a.session_date ?? "9999").localeCompare(b.session_date ?? "9999"));
}
