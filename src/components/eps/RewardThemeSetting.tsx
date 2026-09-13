import { toast } from "sonner";

import { useMyMedal } from "@/hooks/use-student-profile";
import { useMyRewards, useSetRewardTheme } from "@/hooks/use-rewards";
import { REWARD_THEMES, isRewardThemeUnlocked, type RewardThemeCode } from "@/lib/rewards";
import { useTheme, type ThemeChoice } from "@/lib/theme";
import type { MedalCode } from "@/lib/medals";

/**
 * Apparences débloquées par les médailles. Une récompense obtenue reste
 * disponible : l'élève choisit librement parmi ses thèmes.
 */
export function RewardThemeSetting() {
  const medalQuery = useMyMedal();
  const rewards = useMyRewards();
  const setRewardTheme = useSetRewardTheme();
  const { theme, setTheme } = useTheme();

  const medal = (medalQuery.data ?? null) as MedalCode | null;
  const savedTheme = rewards.data?.theme ?? null;

  function choose(code: RewardThemeCode, applied: ThemeChoice) {
    setTheme(applied);
    setRewardTheme.mutate(code, {
      onError: (error: Error) => toast.error(error.message),
    });
  }

  return (
    <div className="space-y-3">
      <div className="grid gap-2 sm:grid-cols-2">
        {REWARD_THEMES.map((option) => {
          const unlocked = isRewardThemeUnlocked(option.code, medal);
          const active = unlocked && (savedTheme === option.code || theme === option.theme);

          return (
            <button
              key={option.code}
              type="button"
              disabled={!unlocked}
              aria-pressed={active}
              onClick={() => choose(option.code, option.theme)}
              className={`rounded-2xl border px-4 py-3 text-left transition-colors ${
                active
                  ? "bg-surface-2"
                  : unlocked
                    ? "border-border bg-surface-2 hover:border-primary/50"
                    : "cursor-not-allowed border-border/60 bg-surface/50 opacity-60"
              }`}
              style={
                active
                  ? {
                      borderColor: "var(--color-medal)",
                      backgroundColor: "color-mix(in oklab, var(--color-medal) 10%, transparent)",
                    }
                  : undefined
              }
            >
              <p className="flex items-center gap-2 text-sm font-semibold">
                <span aria-hidden>{option.emoji}</span>
                {option.label}
                <span aria-hidden>{unlocked ? "✓" : "🔒"}</span>
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {unlocked
                  ? option.hint
                  : `Se débloque avec la médaille ${
                      REWARD_THEMES.find((item) => item.code === option.code)?.label
                    }.`}
              </p>
              <span
                aria-hidden
                className={`theme-swatch mt-2 ${unlocked ? "" : "opacity-40"}`}
                style={{ background: themeSwatch(option.theme) }}
              />
            </button>
          );
        })}
      </div>
      <p className="mono-label text-muted-foreground">
        Ton apparence est conservée pour tes prochaines connexions.
      </p>
    </div>
  );
}
