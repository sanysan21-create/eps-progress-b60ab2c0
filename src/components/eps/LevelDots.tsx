/**
 * Indicateur de niveau minimaliste : autant de points que de niveaux réellement
 * configurés (jamais un nombre imposé).
 */
export function LevelDots({
  level,
  max,
  label,
}: {
  level: number;
  max: number;
  label?: string;
}) {
  const total = Math.max(max, level, 1);
  return (
    <div
      className="flex items-center gap-1.5"
      aria-label={label ?? `Niveau ${level} sur ${total}`}
    >
      {Array.from({ length: total }, (_, i) => i + 1).map((i) => (
        <span
          key={i}
          className={`size-2.5 rounded-full transition-colors ${
            i <= level ? "bg-primary" : "bg-surface-2"
          }`}
        />
      ))}
    </div>
  );
}
