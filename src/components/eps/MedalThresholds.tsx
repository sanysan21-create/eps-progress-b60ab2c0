import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";

import { getMedalThresholds, setMedalThresholds } from "@/lib/medals.functions";

/**
 * Seuils de réussites définis par l'enseignant. Ils servent uniquement de repère
 * de progression pour l'élève : la médaille reste attribuée manuellement.
 */
export function MedalThresholds() {
  const queryClient = useQueryClient();
  const fetchThresholds = useServerFn(getMedalThresholds);
  const save = useServerFn(setMedalThresholds);

  const thresholds = useQuery({
    queryKey: ["medal-thresholds"],
    queryFn: () => fetchThresholds(),
  });

  const [bronze, setBronze] = useState("5");
  const [silver, setSilver] = useState("10");
  const [gold, setGold] = useState("15");

  useEffect(() => {
    if (!thresholds.data) return;
    setBronze(String(thresholds.data.bronze));
    setSilver(String(thresholds.data.silver));
    setGold(String(thresholds.data.gold));
  }, [thresholds.data]);

  const mutation = useMutation({
    mutationFn: () =>
      save({
        data: { bronze: Number(bronze), silver: Number(silver), gold: Number(gold) },
      }),
    onSuccess: () => {
      toast.success("Seuils enregistrés.");
      void queryClient.invalidateQueries({ queryKey: ["medal-thresholds"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const fields = [
    { emoji: "🥉", label: "Bronze", value: bronze, set: setBronze },
    { emoji: "🥈", label: "Argent", value: silver, set: setSilver },
    { emoji: "🥇", label: "Or", value: gold, set: setGold },
  ];

  return (
    <section className="space-y-4 rounded-2xl border border-border bg-surface p-6">
      <div className="space-y-1">
        <h2 className="text-base font-semibold">Seuils de réussites des médailles</h2>
        <p className="text-sm text-muted-foreground">
          Nombre de réussites nécessaires affiché à l'élève comme repère de progression. La médaille
          reste attribuée manuellement par vous ci-dessous.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {fields.map((field) => (
          <label key={field.label} className="space-y-1.5">
            <span className="mono-label text-muted-foreground">
              <span aria-hidden>{field.emoji}</span> {field.label}
            </span>
            <NumberField
              value={String(field.value)}
              min={1}
              max={200}
              step={1}
              onValueChange={(next) => field.set(next)}
              aria-label={field.label}
              className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm"
            />

          </label>
        ))}
      </div>

      <button
        onClick={() => mutation.mutate()}
        disabled={mutation.isPending}
        className="rounded-full bg-primary px-5 py-2.5 text-xs font-bold uppercase text-primary-foreground disabled:opacity-60"
      >
        Enregistrer les seuils
      </button>
    </section>
  );
}
