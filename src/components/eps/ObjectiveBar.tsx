import { objectivePercent } from "@/lib/orientation";

/** Barre de complétion d'un objectif quantifié (x/y). */
export function ObjectiveBar({ achieved, target }: { achieved: number; target: number }) {
  const percent = objectivePercent(achieved, target);
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="mono-label text-muted-foreground">🎯 Objectif quantifié</span>
        <span className="font-mono font-bold text-primary">
          {achieved}/{target}
        </span>
      </div>
      <div
        className="h-2.5 overflow-hidden rounded-full bg-surface-2"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={target}
        aria-valuenow={achieved}
        aria-label={`Objectif : ${achieved} sur ${target}, ${percent} %`}
      >
        <div
          className="h-full rounded-full bg-primary transition-[width] duration-500 motion-reduce:transition-none"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
