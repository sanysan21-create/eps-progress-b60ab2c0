import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";

import { getStudentSessionInfo } from "@/lib/student-access.functions";
import { getMyEngagement, getMyGoal, getMyStrengths } from "@/lib/engagement.functions";
import { getMyAchievements } from "@/lib/achievements.functions";
import {
  getMyProfileCompetencies,
  type StudentProfileActivity,
} from "@/lib/competencies.functions";

/**
 * Identité et données de l'élève réellement identifié par le cookie de session
 * (créé uniquement après validation serveur du jeton du QR code).
 * Aucune donnée fictive n'est utilisée en cas d'absence de données.
 */
export function useStudentSession() {
  const fetchInfo = useServerFn(getStudentSessionInfo);
  return useQuery({ queryKey: ["student-session"], queryFn: () => fetchInfo() });
}

export function useStudentActivities() {
  const fetchProfile = useServerFn(getMyProfileCompetencies);
  return useQuery({ queryKey: ["my-profile-competencies"], queryFn: () => fetchProfile() });
}

export function useStudentEngagement() {
  const fetchEngagement = useServerFn(getMyEngagement);
  return useQuery({ queryKey: ["my-engagement"], queryFn: () => fetchEngagement() });
}

/** Les 3 points forts personnels choisis par l'élève lui-même (modifiables). */
export function useMyStrengths() {
  const fetchStrengths = useServerFn(getMyStrengths);
  return useQuery({ queryKey: ["my-strengths"], queryFn: () => fetchStrengths() });
}

/** Point à travailler choisi par l'élève lui-même (un seul, modifiable). */
export function useMyGoal() {
  const fetchGoal = useServerFn(getMyGoal);
  return useQuery({ queryKey: ["my-goal"], queryFn: () => fetchGoal() });
}

/** Réussites proposées par l'enseignant, avec l'état obtenue / à obtenir. */
export function useMyAchievements() {
  const fetchAchievements = useServerFn(getMyAchievements);
  return useQuery({ queryKey: ["my-achievements"], queryFn: () => fetchAchievements() });
}

export type StudentMarkFlat = {
  activityName: string;
  competencyId: string;
  competencyLabel: string;
  levelLabel: string;
  levelPosition: number;
  levelMax: number;
};

export function flattenActivities(activities: StudentProfileActivity[]): StudentMarkFlat[] {
  return activities.flatMap((activity) =>
    activity.competencies.map((competency) => ({
      activityName: activity.activity_name,
      competencyId: competency.id,
      competencyLabel: competency.label,
      levelLabel: competency.level_label,
      levelPosition: competency.level_position,
      levelMax: competency.level_max,
    })),
  );
}

/** Moyenne de progression (0-100) sur l'ensemble des compétences évaluées. */
export function averageProgress(marks: StudentMarkFlat[]): number | null {
  if (marks.length === 0) return null;
  const total = marks.reduce(
    (sum, mark) => sum + (mark.levelMax > 0 ? (mark.levelPosition / mark.levelMax) * 100 : 0),
    0,
  );
  return Math.round(total / marks.length);
}

export function initialsOf(firstName: string, lastName: string): string {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}
