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

export const STRENGTHS: Strength[] = [
  { code: "bon_activite", emoji: "🏅", label: "Bon dans l'activité" },
  { code: "progression_rapide", emoji: "📈", label: "Progression rapide" },
  { code: "investissement_duree", emoji: "🔥", label: "Investissement sur la durée" },
  { code: "perseverant", emoji: "💪", label: "Persévérant" },
  { code: "esprit_equipe", emoji: "🤝", label: "Esprit d'équipe" },
  { code: "coach", emoji: "🗣️", label: "Coach affirmé" },
  { code: "autonome", emoji: "🧠", label: "Autonome" },
  { code: "entraide", emoji: "🙌", label: "Entraide" },
  { code: "concentre", emoji: "🎯", label: "Concentré" },
  { code: "dynamique", emoji: "⚡", label: "Dynamique" },
  { code: "responsable_materiel", emoji: "🧰", label: "Responsable du matériel" },
  { code: "bon_coequipier", emoji: "👥", label: "Bon coéquipier" },
  { code: "communication", emoji: "💬", label: "Bonne communication" },
  { code: "constante_progression", emoji: "🌱", label: "En constante progression" },
  { code: "depasse_difficultes", emoji: "🏆", label: "Dépasse ses difficultés" },
  { code: "initiatives", emoji: "🚀", label: "Prend des initiatives" },
  { code: "emotions", emoji: "🧘", label: "Maîtrise ses émotions" },
  { code: "regulier", emoji: "🔄", label: "Régulier" },
  { code: "ne_renonce_pas", emoji: "👊", label: "Ne renonce pas" },
  { code: "responsabilites", emoji: "🧭", label: "Prend des responsabilités" },
  { code: "solutions", emoji: "💡", label: "Propose des solutions" },
  { code: "positif", emoji: "❤️", label: "Positif avec les autres" },
  { code: "objectifs", emoji: "🎯", label: "Sait se fixer des objectifs" },
  { code: "adaptable", emoji: "🤸", label: "S'adapte aux situations" },
  { code: "engage", emoji: "🏃", label: "S'engage pleinement" },
  { code: "observe", emoji: "👀", label: "Observe et apprend des autres" },
  { code: "conseille", emoji: "🧑‍🏫", label: "Sait conseiller ses partenaires" },
  { code: "encourage", emoji: "🌟", label: "Encourage les autres" },
];

export function strength(code: string): Strength | undefined {
  return STRENGTHS.find((s) => s.code === code);
}
