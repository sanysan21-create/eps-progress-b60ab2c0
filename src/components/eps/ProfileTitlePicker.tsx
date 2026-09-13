import { toast } from "sonner";

import { useMyMedal } from "@/hooks/use-student-profile";
import { useMyRewards, useSetProfileTitle } from "@/hooks/use-rewards";
import { PROFILE_TITLES, canChooseTitle } from "@/lib/rewards";
import type { MedalCode } from "@/lib/medals";

/** Titre de profil : bonus de personnalisation débloqué avec la médaille Argent. */
export function ProfileTitlePicker() {
  const medalQuery = useMyMedal();
  const rewards = useMyRewards();
  const setTitle = useSetProfileTitle();

  const medal = (medalQuery.data ?? null) as MedalCode | null;
  const unlocked = canChooseTitle(medal);
  const current = rewards.data?.title ?? null;

  if (!unlocked) {
    return (
      <div className="rounded-2xl border border-border/60 bg-surface/60 px-5 py-6 text-sm text-muted-foreground">
        🔒 Les titres de profil se débloquent avec la médaille Argent. Ton titre apparaîtra sous ton
        nom.
      </div>
    );
  }

  function choose(code: string) {
    setTitle.mutate(code === current ? "" : code, {
      onError: (error: Error) => toast.error(error.message),
    });
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {PROFILE_TITLES.map((title) => {
          const active = current === title.code;
          return (
            <button
              key={title.code}
              type="button"
              aria-pressed={active}
              onClick={() => choose(title.code)}
              className={`rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
                active ? "" : "border-border bg-surface-2 hover:border-primary/50"
              }`}
              style={
                active
                  ? {
                      borderColor: "var(--color-medal)",
                      backgroundColor: "color-mix(in oklab, var(--color-medal) 12%, transparent)",
                      color: "var(--color-medal)",
                    }
                  : undefined
              }
            >
              <span aria-hidden>{title.emoji}</span> {title.label}
            </button>
          );
        })}
      </div>
      <p className="mono-label text-muted-foreground">
        Touche à nouveau ton titre pour le retirer. D'autres titres pourront s'ajouter plus tard.
      </p>
    </div>
  );
}
