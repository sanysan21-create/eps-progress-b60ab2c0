/**
 * Parcours de progression de l'élève.
 *
 * Principe pédagogique : le rang est une ÉTAPE du parcours personnel, jamais un
 * classement ni une comparaison avec les autres élèves. Aucun libellé de type
 * « rang 1 », « top 3 », « meilleur élève » n'est autorisé ici.
 * Les points existent comme moteur interne (déblocage des réussites et évolution
 * du rang) mais ne sont pas présentés à l'élève comme une note.
 */

import type { StudentMarkFlat } from "@/hooks/use-student-profile";

export type Rank = {
  code: string;
  emoji: string;
  label: string;
  /** Message adressé à l'élève, formulé positivement. */
  message: string;
  /** Seuil d'entrée dans l'étape (moteur interne, non affiché). */
  threshold: number;
};

export const RANKS: Rank[] = [
  {
    code: "decouverte",
    emoji: "🌱",
    label: "Découverte",
    message: "Tu découvres les activités et tu poses les premières bases de ton parcours.",
    threshold: 0,
  },
  {
    code: "progression",
    emoji: "🌿",
    label: "En progression",
    message: "Tu développes progressivement tes compétences et tu gagnes en confiance.",
    threshold: 20,
  },
  {
    code: "consolidation",
    emoji: "🌳",
    label: "Consolidation",
    message: "Tes compétences deviennent plus régulières et solides.",
    threshold: 45,
  },
  {
    code: "autonomie",
    emoji: "🧭",
    label: "Autonomie",
    message: "Tu mobilises tes compétences avec de plus en plus d'autonomie.",
    threshold: 68,
  },
  {
    code: "maitrise",
    emoji: "🎯",
    label: "Maîtrise",
    message: "Tu mobilises tes compétences avec aisance dans des situations variées.",
    threshold: 88,
  },
];

export type EngagementMark = { indicator_code: string; level: number };

export type ProgressionInput = {
  marks: StudentMarkFlat[];
  engagement: EngagementMark[];
  strengths: string[];
  goal: string | null;
};

export type ProgressionState = {
  /** Avancement interne dans le parcours (0-100). */
  score: number;
  rank: Rank;
  nextRank: Rank | null;
  /** Avancement vers l'étape suivante (0-100). */
  toNext: number;
  stepIndex: number;
  stepCount: number;
  hasData: boolean;
};

function engagementLevel(engagement: EngagementMark[], code: string) {
  return engagement.find((mark) => mark.indicator_code === code)?.level ?? 0;
}

/** Avancement du parcours : compétences travaillées + implication en cours. */
export function computeProgression(input: ProgressionInput): ProgressionState {
  const { marks, engagement } = input;

  const competencyScore =
    marks.length === 0
      ? null
      : (marks.reduce(
          (sum, mark) => sum + (mark.levelMax > 0 ? mark.levelPosition / mark.levelMax : 0),
          0,
        ) /
          marks.length) *
        100;

  const engagementScore =
    engagement.length === 0
      ? null
      : (engagement.reduce((sum, mark) => sum + Math.min(mark.level, 4) / 4, 0) /
          engagement.length) *
        100;

  const parts = [competencyScore, engagementScore].filter((v): v is number => v !== null);
  const score = parts.length === 0 ? 0 : Math.round(parts.reduce((a, b) => a + b, 0) / parts.length);

  let stepIndex = 0;
  RANKS.forEach((rank, index) => {
    if (score >= rank.threshold) stepIndex = index;
  });

  const rank = RANKS[stepIndex]!;
  const nextRank = RANKS[stepIndex + 1] ?? null;
  const toNext = nextRank
    ? Math.min(
        100,
        Math.max(
          0,
          Math.round(
            ((score - rank.threshold) / (nextRank.threshold - rank.threshold)) * 100,
          ),
        ),
      )
    : 100;

  return {
    score,
    rank,
    nextRank,
    toNext,
    stepIndex,
    stepCount: RANKS.length,
    hasData: parts.length > 0,
  };
}

export type Achievement = {
  code: string;
  emoji: string;
  label: string;
  /** Ce que l'élève a accompli (formulation personnelle, jamais comparative). */
  description: string;
  /** Piste pour découvrir la réussite quand elle n'est pas encore débloquée. */
  hint: string;
  unlocked: (input: ProgressionInput) => boolean;
};

export const ACHIEVEMENTS: Achievement[] = [
  {
    code: "materiel",
    emoji: "🧰",
    label: "Installation & rangement",
    description: "Tu participes à la mise en place et au rangement du matériel.",
    hint: "Se dévoile en prenant part à l'installation du matériel.",
    unlocked: ({ engagement }) => engagementLevel(engagement, "materiel") >= 3,
  },
  {
    code: "coach",
    emoji: "🗣️",
    label: "Coach affirmé",
    description: "Tu encourages et tu conseilles les autres pendant les séances.",
    hint: "Se dévoile en communiquant avec tes camarades.",
    unlocked: ({ engagement }) => engagementLevel(engagement, "communication") >= 3,
  },
  {
    code: "progression",
    emoji: "📈",
    label: "Progression",
    description: "Tu as franchi une nouvelle étape dans une compétence.",
    hint: "Se dévoile dès qu'une compétence passe un palier.",
    unlocked: ({ marks }) => marks.some((mark) => mark.levelPosition >= 2),
  },
  {
    code: "present",
    emoji: "🔥",
    label: "Totalement présent",
    description: "Ton investissement reste constant au fil des séances.",
    hint: "Se dévoile avec un investissement régulier.",
    unlocked: ({ engagement }) =>
      engagementLevel(engagement, "investissement") >= 3 &&
      engagementLevel(engagement, "regularite") >= 3,
  },
  {
    code: "performance",
    emoji: "🏅",
    label: "Performance",
    description: "Tu as atteint le dernier palier d'une de tes compétences.",
    hint: "Se dévoile en atteignant le dernier palier d'une compétence.",
    unlocked: ({ marks }) => marks.some((mark) => mark.levelPosition >= mark.levelMax),
  },
  {
    code: "equipe",
    emoji: "🤝",
    label: "Esprit d'équipe",
    description: "Tu contribues positivement au collectif.",
    hint: "Se dévoile en coopérant avec ton groupe.",
    unlocked: ({ engagement }) =>
      engagementLevel(engagement, "esprit_equipe") >= 3 ||
      engagementLevel(engagement, "collaboration") >= 3,
  },
  {
    code: "autonome",
    emoji: "🧠",
    label: "Autonomie",
    description: "Tu t'organises et travailles de façon autonome.",
    hint: "Se dévoile en gagnant en autonomie sur les ateliers.",
    unlocked: ({ engagement }) => engagementLevel(engagement, "autonomie") >= 3,
  },
  {
    code: "perseverance",
    emoji: "🧗",
    label: "Persévérance",
    description: "Tu continues d'essayer même quand c'est difficile.",
    hint: "Se dévoile en persévérant face aux difficultés.",
    unlocked: ({ engagement }) => engagementLevel(engagement, "perseverance") >= 3,
  },
  {
    code: "explorateur",
    emoji: "🧭",
    label: "Explorateur",
    description: "Tu construis ton parcours sur plusieurs activités.",
    hint: "Se dévoile en travaillant plusieurs activités.",
    unlocked: ({ marks }) => new Set(marks.map((mark) => mark.activityName)).size >= 2,
  },
  {
    code: "identite",
    emoji: "⭐",
    label: "Identité sportive",
    description: "Tu as identifié tes trois points forts.",
    hint: "Se dévoile en choisissant tes 3 points forts.",
    unlocked: ({ strengths }) => strengths.length >= 3,
  },
  {
    code: "cap",
    emoji: "🚀",
    label: "Cap fixé",
    description: "Tu as choisi un point à travailler pour avancer.",
    hint: "Se dévoile en choisissant ton objectif personnel.",
    unlocked: ({ goal }) => Boolean(goal),
  },
];

export function splitAchievements(input: ProgressionInput) {
  const unlocked = ACHIEVEMENTS.filter((achievement) => achievement.unlocked(input));
  const locked = ACHIEVEMENTS.filter((achievement) => !achievement.unlocked(input));
  return { unlocked, locked };
}
