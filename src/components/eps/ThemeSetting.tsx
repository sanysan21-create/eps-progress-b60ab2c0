import { THEME_OPTIONS, themeSwatch, useTheme } from "@/lib/theme";

const MEDAL_THEMES = ["bronze", "silver", "gold"];

/** Sélecteur d'apparence (sombre / clair / automatique), appliqué instantanément. */
export function ThemeSetting({ className = "" }: { className?: string }) {
  const { theme, setTheme } = useTheme();

  return (
    <div className={className}>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {THEME_OPTIONS.map((option) => {
          const active = theme === option.value;
          const medal = MEDAL_THEMES.includes(option.value);
          return (
            <button
              key={option.value}
              type="button"
              aria-pressed={active}
              onClick={() => setTheme(option.value)}
              className={`rounded-2xl border px-4 py-3 text-left transition-colors ${
                active
                  ? medal
                    ? "bg-surface-2"
                    : "border-primary bg-primary/10"
                  : "border-border bg-surface-2 hover:border-primary/50"
              }`}
              style={
                active && medal
                  ? {
                      borderColor: "var(--color-medal)",
                      backgroundColor: "color-mix(in oklab, var(--color-medal) 12%, transparent)",
                    }
                  : undefined
              }
            >
              <p className="flex items-center gap-2 text-sm font-semibold">
                <span aria-hidden>{option.emoji}</span>
                {option.label}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">{option.hint}</p>
              <span
                aria-hidden
                className="theme-swatch mt-2"
                style={{ background: themeSwatch(option.value) }}
              />
            </button>
          );
        })}
      </div>
      <p className="mono-label mt-3 text-muted-foreground">
        Ton choix est conservé pour tes prochaines connexions.
      </p>
    </div>
  );
}
