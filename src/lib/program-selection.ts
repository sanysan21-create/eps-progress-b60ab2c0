/** Match the saved session identity, never an activity or a repeated session number. */
export function quizzesForSession<T extends { session_id: string }>(quizzes: T[], sessionId: string | null): T[] {
  return sessionId ? quizzes.filter((quiz) => quiz.session_id === sessionId) : [];
}