/**
 * Référentiels d'implication en EPS et de points forts.
 * Ces libellés sont partagés entre l'espace enseignant (saisie) et l'espace élève (lecture).
 * Aucun indicateur n'est attribué automatiquement : seul l'enseignant renseigne.
 */

export type EngagementIndicator = {
  code: string;
  emoji: string;
  label: string;
  hint: string;
};

export const ENGAGEMENT_INDICATORS: EngagementIndicator[] = [
  {
    code: "collaboration",
    emoji: "🤝",
    label: "Collaboration",
    hint: "Entraide et coopération avec le groupe.",
  },
  {
    code: "materiel",
    emoji: "🧰",
    label: "Installation / rangement du matériel",
    hint: "Participation à la mise en place et au rangement.",
  },
  {
    code: "pairs",
    emoji: "👥",
    label: "Interaction avec les pairs",
    hint: "Communication et comportement positif avec les autres élèves.",
  },
  {
    code: "investissement",
    emoji: "💪",
    label: "Investissement",
    hint: "Participation et engagement pendant les séances.",
  },
  {
    code: "regularite",
    emoji: "🔄",
    label: "Régularité",
    hint: "Investissement maintenu dans la durée.",
  },
  {
    code: "communication",
    emoji: "🗣️",
    label: "Communication",
    hint: "Échanges avec les camarades et l'enseignant.",
  },
  {
    code: "autonomie",
    emoji: "🧠",
    label: "Autonomie",
    hint: "Capacité à travailler seul et à s'organiser.",
  },
  {
    code: "esprit_equipe",
    emoji: "🙌",
    label: "Esprit d'équipe",
    hint: "Contribution positive au collectif.",
  },
  {
    code: "perseverance",
    emoji: "🎯",
    label: "Persévérance",
    hint: "Continuer malgré les difficultés.",
  },
  {
    code: "responsabilite",
    emoji: "🧭",
    label: "Responsabilité",
    hint: "Prise de responsabilités dans le groupe.",
  },
];

/** Échelle positive et non notée, volontairement courte. */
export const ENGAGEMENT_LEVELS = [
  { value: 1, label: "À développer" },
  { value: 2, label: "En progression" },
  { value: 3, label: "Satisfaisant" },
  { value: 4, label: "Très satisfaisant" },
] as const;

export const ENGAGEMENT_LEVEL_MAX = ENGAGEMENT_LEVELS.length;

export function engagementLevelLabel(level: number): string {
  return ENGAGEMENT_LEVELS.find((l) => l.value === level)?.label ?? "";
}

export function engagementIndicator(code: string): EngagementIndicator | undefined {
  return ENGAGEMENT_INDICATORS.find((i) => i.code === code);
}

export type Strength = { code: string; emoji: string; label: string };

/**
 * Points forts personnels : cette liste est proposée à l'élève, qui choisit lui-même
 * exactement 3 points forts. L'enseignant ne peut que les consulter, jamais les modifier.
 */
export const STRENGTHS: Strength[] = [
  { code: "bon_activite", emoji: "🏅", label: "Bon dans l'activité" },
  { code: "perseverant", emoji: "💪", label: "Persévérant" },
  { code: "esprit_equipe", emoji: "🤝", label: "Esprit d'équipe" },
  { code: "coach", emoji: "🗣️", label: "Coach affirmé" },
  { code: "investissement_duree", emoji: "🔥", label: "Investissement sur la durée" },
  { code: "autonome", emoji: "🧠", label: "Autonome" },
  { code: "entraide", emoji: "🙌", label: "J'aide mes camarades" },
  { code: "concentre", emoji: "🎯", label: "Concentré" },
  { code: "dynamique", emoji: "⚡", label: "Dynamique" },
  { code: "responsable_materiel", emoji: "🧰", label: "Responsable du matériel" },
  { code: "communication", emoji: "💬", label: "Bonne communication" },
  { code: "constante_progression", emoji: "🌱", label: "En constante progression" },
  { code: "initiatives", emoji: "🚀", label: "Je prends des initiatives" },
  { code: "ne_renonce_pas", emoji: "👊", label: "Je ne renonce pas" },
  { code: "responsabilites", emoji: "🧭", label: "Je prends des responsabilités" },
  { code: "solutions", emoji: "💡", label: "Je propose des solutions" },
  { code: "positif", emoji: "❤️", label: "Positif avec les autres" },
  { code: "objectifs", emoji: "🎯", label: "Je sais me fixer des objectifs" },
  { code: "adaptable", emoji: "🤸", label: "Je m'adapte aux situations" },
  { code: "engage", emoji: "🏃", label: "Je m'engage pleinement" },
  { code: "observe", emoji: "👀", label: "J'observe et j'apprends des autres" },
  { code: "conseille", emoji: "🧑‍🏫", label: "Je sais conseiller mes partenaires" },
  { code: "encourage", emoji: "🌟", label: "J'encourage les autres" },
];

export function strength(code: string): Strength | undefined {
  return STRENGTHS.find((s) => s.code === code);
}

/** Nombre exact de points forts que l'élève doit choisir. */
export const MAX_STRENGTHS = 3;

export type Goal = { code: string; emoji: string; label: string };

/**
 * Points à travailler : l'élève choisit un seul objectif personnel de progression.
 * L'enseignant ne peut que le consulter.
 */
export const GOALS: Goal[] = [
  { code: "concentration", emoji: "🎯", label: "Mieux me concentrer" },
  { code: "perseverer", emoji: "💪", label: "Persévérer davantage" },
  { code: "cooperer", emoji: "🤝", label: "Mieux coopérer" },
  { code: "communiquer", emoji: "🗣️", label: "Mieux communiquer" },
  { code: "autonomie", emoji: "🧠", label: "Devenir plus autonome" },
  { code: "investir", emoji: "🏃", label: "M'investir davantage" },
  { code: "materiel", emoji: "🧰", label: "Participer davantage à l'installation et au rangement" },
  { code: "pairs", emoji: "👥", label: "Mieux interagir avec mes camarades" },
  { code: "regularite", emoji: "🔥", label: "Être plus régulier" },
  { code: "initiatives", emoji: "🚀", label: "Prendre davantage d'initiatives" },
  { code: "emotions", emoji: "🧘", label: "Mieux gérer mes émotions" },
  { code: "oser", emoji: "👊", label: "Oser davantage" },
  { code: "performances", emoji: "🏆", label: "Améliorer mes performances" },
  { code: "competences", emoji: "📈", label: "Progresser dans mes compétences" },
  { code: "conseiller", emoji: "🧑‍🏫", label: "Mieux conseiller mes partenaires" },
  { code: "encourager", emoji: "🌟", label: "Encourager davantage les autres" },
];

export function goal(code: string): Goal | undefined {
  return GOALS.find((g) => g.code === code);
}
