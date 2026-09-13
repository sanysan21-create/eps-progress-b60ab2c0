import { getLevelProgress } from "@/lib/levels";

/**
 * Jauge circulaire compacte : le numéro du niveau au centre, l'anneau se
 * remplit à mesure que l'élève approche du niveau 1 (meilleur niveau).
 * Le pourcentage est calculé à partir du nombre réel de niveaux configurés
 * pour LA compétence concernée (source unique : getLevelProgress).
 */
export function LevelProgressIcon({
  currentLevel,
  totalLevels,
  size = 34,
  label,
}: {
  currentLevel: number;
  totalLevels: number;
  size?: number;
  label?: string;
}) {
  const percent = getLevelProgress(currentLevel, totalLevels);
  const rounded = Math.round(percent);
  const isBest = currentLevel <= 1;
  const stroke = Math.max(3, Math.round(size * 0.1));
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const dash = (percent / 100) * circumference;

  return (
    <span
      role="img"
      aria-label={label ?? `Niveau ${currentLevel} sur ${totalLevels} — progression ${rounded} %`}
      className="relative inline-grid shrink-0 place-items-center"
      style={{ width: size, height: size }}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        aria-hidden
        className={isBest ? "drop-shadow-[0_0_4px_hsl(var(--primary)/0.55)]" : undefined}
        style={
          isBest
            ? { filter: "drop-shadow(0 0 4px color-mix(in oklab, var(--color-primary) 60%, transparent))" }
            : undefined
        }
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={stroke}
          className="stroke-surface-2"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          className="stroke-primary motion-safe:transition-[stroke-dasharray] motion-safe:duration-500"
          strokeDasharray={`${dash} ${circumference - dash}`}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      <span
        className={`absolute font-mono font-bold leading-none ${
          isBest ? "text-primary" : "text-foreground"
        }`}
        style={{ fontSize: Math.max(10, Math.round(size * 0.38)) }}
      >
        {currentLevel}
      </span>
    </span>
  );
}
