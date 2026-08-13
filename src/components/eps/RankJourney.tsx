import { RANKS, type ProgressionState } from "@/lib/progression";

/**
 * Carte de parcours : étape actuelle, explication et avancement vers l'étape
 * suivante. Aucune comparaison entre élèves, aucun classement.
 */
export function RankJourney({ state }: { state: ProgressionState }) {
  const { rank, nextRank, toNext, stepIndex } = state;

  return (
    <div className="overflow-hidden rounded-3xl border border-border bg-surface">
      <div className="space-y-4 p-6">
        <div className="flex items-start gap-4">
          <span
            aria-hidden
            className="grid size-14 shrink-0 place-items-center rounded-2xl bg-primary/10 text-2xl"
          >
            {rank.emoji}
          </span>
          <div className="min-w-0 space-y-1">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              Mon étape actuelle
            </p>
            <h3 className="display-title text-2xl leading-tight">{rank.label}</h3>
          </div>
        </div>

        <p className="text-sm leading-relaxed text-foreground/80">{rank.message}</p>

        {nextRank ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Vers {nextRank.label}</span>
              <span aria-hidden>{nextRank.emoji}</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-surface-2">
              <div
                className="h-full origin-left rounded-full bg-primary transition-[width] duration-700 ease-out"
                style={{ width: `${toNext}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Tu avances à ton rythme, par rapport à toi-même.
            </p>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">
            Tu continues d'enrichir ton parcours en variant les situations.
          </p>
        )}
      </div>

      {/* Chemin des étapes */}
      <ol className="flex items-stretch gap-1 border-t border-border/60 bg-surface-2/40 px-3 py-4">
        {RANKS.map((step, index) => {
          const reached = index <= stepIndex;
          return (
            <li key={step.code} className="flex flex-1 flex-col items-center gap-1.5">
              <span
                aria-hidden
                className={`grid size-8 place-items-center rounded-full text-sm transition-colors duration-500 ${
                  reached
                    ? "bg-primary/15 ring-1 ring-primary/40"
                    : "bg-surface text-muted-foreground/60 ring-1 ring-border/60 grayscale"
                }`}
              >
                {step.emoji}
              </span>
              <span
                className={`text-center text-[10px] leading-tight ${
                  index === stepIndex ? "font-semibold text-foreground" : "text-muted-foreground"
                }`}
              >
                {step.label}
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
