import { useState } from "react";
import { Check, Rocket } from "lucide-react";
import { toast } from "sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";

import { GOALS, goal as findGoal } from "@/lib/engagement";
import { setMyGoal } from "@/lib/engagement.functions";

/**
 * Saisie réservée à l'élève : son point à travailler (un seul objectif), modifiable.
 */
export function GoalPicker({ current }: { current: string | null }) {
  const queryClient = useQueryClient();
  const save = useServerFn(setMyGoal);
  const [open, setOpen] = useState(false);

  const selected = current ? findGoal(current) : undefined;

  const mutation = useMutation({
    mutationFn: (goalCode: string) => save({ data: { goalCode } }),
    onSuccess: async () => {
      setOpen(false);
      toast.success("Ton objectif est enregistré");
      await queryClient.invalidateQueries({ queryKey: ["my-goal"] });
    },
    onError: (error: unknown) =>
      toast.error(error instanceof Error ? error.message : "Enregistrement impossible"),
  });

  if (!open) {
    return (
      <div className="rounded-3xl border border-primary/40 bg-primary/5 p-5">
        {selected ? (
          <div className="space-y-4">
            <p className="text-lg font-semibold leading-snug">
              <span className="mr-2" aria-hidden>
                {selected.emoji}
              </span>
              {selected.label}
            </p>
            <button
              onClick={() => setOpen(true)}
              className="mono-label rounded-full border border-border px-3 py-2 text-muted-foreground hover:border-primary/50 hover:text-primary"
            >
              Modifier mon objectif
            </button>
          </div>
        ) : (
          <div className="space-y-3 text-center">
            <Rocket className="mx-auto size-6 text-primary" />
            <p className="font-semibold">Sur quoi veux-tu progresser en EPS ?</p>
            <button
              onClick={() => setOpen(true)}
              className="rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground"
            >
              Choisir mon objectif
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4 rounded-3xl border border-border bg-surface p-5">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold">Sur quoi veux-tu progresser en EPS ?</p>
        <button
          onClick={() => setOpen(false)}
          className="mono-label text-muted-foreground hover:text-primary"
        >
          Annuler
        </button>
      </div>

      <div className="space-y-2">
        {GOALS.map((item) => {
          const isCurrent = item.code === current;
          return (
            <button
              key={item.code}
              onClick={() => mutation.mutate(item.code)}
              disabled={mutation.isPending}
              aria-pressed={isCurrent}
              className={`flex w-full items-center gap-3 rounded-2xl border p-4 text-left transition-colors disabled:opacity-60 ${
                isCurrent
                  ? "border-primary bg-primary/10"
                  : "border-border bg-background hover:border-primary/40"
              }`}
            >
              <span className="text-xl" aria-hidden>
                {item.emoji}
              </span>
              <span className="flex-1 text-sm font-medium leading-snug">{item.label}</span>
              {isCurrent && <Check className="size-4 shrink-0 text-primary" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}
