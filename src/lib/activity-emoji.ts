const ACTIVITY_EMOJIS: { match: string; emoji: string }[] = [
  { match: "natation", emoji: "🏊" },
  { match: "nage", emoji: "🏊" },
  { match: "basket", emoji: "🏀" },
  { match: "hand", emoji: "🤾" },
  { match: "foot", emoji: "⚽" },
  { match: "volley", emoji: "🏐" },
  { match: "badminton", emoji: "🏸" },
  { match: "tennis", emoji: "🎾" },
  { match: "course", emoji: "🏃" },
  { match: "athl", emoji: "🏃" },
  { match: "gym", emoji: "🤸" },
  { match: "danse", emoji: "💃" },
  { match: "escalade", emoji: "🧗" },
  { match: "muscu", emoji: "🏋️" },
  { match: "vélo", emoji: "🚴" },
  { match: "rugby", emoji: "🏉" },
];

/** Icône sportive déduite du nom de l'activité renseigné par l'enseignant. */
export function activityEmoji(name: string): string {
  const normalized = (name ?? "").toLowerCase();
  return ACTIVITY_EMOJIS.find((entry) => normalized.includes(entry.match))?.emoji ?? "🎽";
}
