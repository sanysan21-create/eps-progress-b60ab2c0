export function LevelRing({
  level,
  score,
  caption,
}: {
  level: number;
  score?: number;
  caption?: string;
}) {
  const circumference = 283;
  const offset = circumference - (circumference * level) / 5;

  return (
    <section className="group relative mx-auto aspect-square w-full max-w-[280px]">
      <div className="absolute inset-0 rounded-full border-[12px] border-surface-2/60" />
      <svg className="h-full w-full -rotate-90" viewBox="0 0 100 100">
        <circle
          cx="50"
          cy="50"
          r="45"
          className="fill-none stroke-primary"
          strokeWidth="9"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ animation: "ring-fill 1.1s var(--ease-out-expo) both" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="display-title text-8xl leading-none text-primary">{level}</span>
        <span className="mono-label -mt-1 text-muted-foreground">Niveau global</span>
        {score !== undefined && (
          <span className="mt-2 font-mono text-xs text-muted-foreground">{score} / 5 moyenne</span>
        )}
      </div>
      {caption && (
        <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-foreground px-4 py-1 text-[10px] font-bold uppercase tracking-tight text-background">
          {caption}
        </div>
      )}
    </section>
  );
}
