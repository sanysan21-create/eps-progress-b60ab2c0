import type { Level } from "@/data/demo";

export function LevelBars({ level, size = "md" }: { level: Level | number; size?: "sm" | "md" }) {
  const h = size === "sm" ? "h-4" : "h-6";
  const w = size === "sm" ? "w-1" : "w-1.5";
  return (
    <div className="flex gap-1" aria-label={`Niveau ${level} sur 5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <div
          key={i}
          className={`${h} ${w} rounded-full ${i <= level ? "bg-primary" : "bg-surface-2"}`}
        />
      ))}
    </div>
  );
}

export function LevelChips({ level }: { level: Level | number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <div
          key={i}
          className={`rounded px-2 py-1 text-[9px] font-bold ${
            i === level ? "bg-primary text-primary-foreground" : "bg-surface-2 text-muted-foreground"
          }`}
        >
          {i}
        </div>
      ))}
    </div>
  );
}
