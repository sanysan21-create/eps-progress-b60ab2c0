import { useState } from "react";
import { Check, Star } from "lucide-react";
import { toast } from "sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";

import { STRENGTHS, strength as findStrength } from "@/lib/engagement";
import { setMyStrength } from "@/lib/engagement.functions";

/**
 * Seule saisie autorisée à l'élève : son point fort personnel, unique et modifiable.
 * Toutes les autres données du profil restent en lecture seule (renseignées par l'enseignant).
 */
export function StrengthPicker({ current }: { current: string | null }) {
  const queryClient = useQueryClient();
  const save = useServerFn(setMyStrength);
  const [open, setOpen] = useState(false);

  const selected = current ? findStrength(current) : undefined;

  const mutation = useMutation({
    mutationFn: (strengthCode: string) => save({ data: { strengthCode } }),
    onSuccess: async () => {
      setOpen(false);
      toast.success("Ton point fort est enregistré");
      await queryClient.invalidateQueries({ queryKey: ["my-strength"] });
    },
    onError: (error: unknown) =>
      toast.error(error instanceof Error ? error.message : "Enregistrement impossible"),
  });

  if (!open) {
    return (
      <div className="rounded-3xl border border-border bg-surface p-5">
        {selected ? (
          <div className="flex items-center justify-between gap-4">
            <div className="flex min-w-0 items-center gap-3">
              <span className="text-2xl" aria-hidden>
                {selected.emoji}
              </span>
              <p className="truncate text-lg font-semibold">{selected.label}</p>
            </div>
            <button
              onClick={() => setOpen(true)}
              className="mono-label shrink-0 rounded-full border border-border px-3 py-2 text-muted-foreground hover:border-primary/50 hover:text-primary"
            >
              Modifier
            </button>
          </div>
        ) : (
          <div className="space-y-3 text-center">
            <Star className="mx-auto size-6 text-primary" />
            <p className="font-semibold">Quel est ton point fort en EPS ?</p>
            <button
              onClick={() => setOpen(true)}
              className="rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground"
            >
              Choisir mon point fort
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4 rounded-3xl border border-border bg-surface p-5">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold">Choisis celui qui te ressemble le plus</p>
        <button
          onClick={() => setOpen(false)}
          className="mono-label text-muted-foreground hover:text-primary"
        >
          Annuler
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {STRENGTHS.map((item) => {
          const isCurrent = item.code === current;
          return (
            <button
              key={item.code}
              onClick={() => mutation.mutate(item.code)}
              disabled={mutation.isPending}
              aria-pressed={isCurrent}
              className={`flex flex-col items-center gap-2 rounded-2xl border p-4 text-center transition-colors disabled:opacity-60 ${
                isCurrent
                  ? "border-primary bg-primary/10"
                  : "border-border bg-background hover:border-primary/40"
              }`}
            >
              <span className="text-2xl" aria-hidden>
                {item.emoji}
              </span>
              <span className="text-xs font-medium leading-tight">{item.label}</span>
              {isCurrent && <Check className="size-3.5 text-primary" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}
