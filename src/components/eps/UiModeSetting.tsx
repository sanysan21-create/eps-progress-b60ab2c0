import { UI_MODE_OPTIONS, useUiMode } from "@/lib/ui-mode";

/** Sélecteur d'interface (automatique / ordinateur / mobile), appliqué instantanément. */
export function UiModeSetting({ className = "" }: { className?: string }) {
  const { mode, setMode } = useUiMode();

  return (
    <div className={className}>
      <div className="grid gap-2 sm:grid-cols-3">
        {UI_MODE_OPTIONS.map((option) => {
          const active = mode === option.value;
          return (
            <button
              key={option.value}
              type="button"
              aria-pressed={active}
              onClick={() => setMode(option.value)}
              className={`rounded-2xl border px-4 py-3 text-left transition-colors ${
                active
                  ? "border-primary bg-primary/10"
                  : "border-border bg-surface-2 hover:border-primary/50"
              }`}
            >
              <p className="flex items-center gap-2 text-sm font-semibold">
                <span aria-hidden>{option.emoji}</span>
                {option.label}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">{option.hint}</p>
            </button>
          );
        })}
      </div>
      <p className="mono-label mt-3 text-muted-foreground">
        En mode ordinateur, l'application s'affiche comme sur un PC (menu latéral, colonnes larges),
        même sur une tablette ou un téléphone.
      </p>
    </div>
  );
}
