import { useState } from "react";
import { Check, Star } from "lucide-react";
import { toast } from "sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";

import { MAX_STRENGTHS, STRENGTHS, strength as findStrength } from "@/lib/engagement";
import { setMyStrengths } from "@/lib/engagement.functions";

/**
 * Saisie réservée à l'élève : ses 3 points forts personnels, modifiables à tout moment.
 * Toutes les autres données du profil restent en lecture seule (renseignées par l'enseignant).
 */
export function StrengthPicker({ current }: { current: string[] }) {
  const queryClient = useQueryClient();
  const save = useServerFn(setMyStrengths);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<string[]>(current);

  const selected = current.map((code) => findStrength(code)).filter(Boolean);

  const mutation = useMutation({
    mutationFn: (strengthCodes: string[]) => save({ data: { strengthCodes } }),
    onSuccess: async () => {
      setOpen(false);
      toast.success("Tes points forts sont enregistrés");
      await queryClient.invalidateQueries({ queryKey: ["my-strengths"] });
    },
    onError: (error: unknown) =>
      toast.error(error instanceof Error ? error.message : "Enregistrement impossible"),
  });

  function openPicker() {
    setDraft(current);
    setOpen(true);
  }

  function toggle(code: string) {
    setDraft((previous) => {
      if (previous.includes(code)) return previous.filter((item) => item !== code);
      if (previous.length >= MAX_STRENGTHS) return previous;
      return [...previous, code];
    });
  }

  if (!open) {
    return (
      <div className="rounded-3xl border border-border bg-surface p-5">
        {selected.length > 0 ? (
          <div className="space-y-4">
            <ul className="flex flex-wrap gap-2">
              {selected.map((item) => (
                <li
                  key={item!.code}
                  className="flex items-center gap-2 rounded-full border border-border bg-background px-3 py-2 text-sm font-medium"
                >
                  <span aria-hidden>{item!.emoji}</span>
                  {item!.label}
                </li>
              ))}
            </ul>
            <button
              onClick={openPicker}
              className="mono-label rounded-full border border-border px-3 py-2 text-muted-foreground hover:border-primary/50 hover:text-primary"
            >
              Modifier mes points forts
            </button>
          </div>
        ) : (
          <div className="space-y-3 text-center">
            <Star className="mx-auto size-6 text-primary" />
            <p className="font-semibold">Quels sont tes 3 points forts en EPS ?</p>
            <button
              onClick={openPicker}
              className="rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground"
            >
              Choisir mes points forts
            </button>
          </div>
        )}
      </div>
    );
  }

  const full = draft.length >= MAX_STRENGTHS;

  return (
    <div className="space-y-4 rounded-3xl border border-border bg-surface p-5">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold">Quels sont tes 3 points forts en EPS ?</p>
        <button
          onClick={() => setOpen(false)}
          className="mono-label text-muted-foreground hover:text-primary"
        >
          Annuler
        </button>
      </div>

      <p aria-live="polite" className="mono-label text-primary">
        {draft.length} / {MAX_STRENGTHS} points forts sélectionnés
      </p>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {STRENGTHS.map((item) => {
          const isSelected = draft.includes(item.code);
          const disabled = mutation.isPending || (full && !isSelected);
          return (
            <button
              key={item.code}
              onClick={() => toggle(item.code)}
              disabled={disabled}
              aria-pressed={isSelected}
              className={`flex flex-col items-center gap-2 rounded-2xl border p-4 text-center transition-colors disabled:opacity-40 ${
                isSelected
                  ? "border-primary bg-primary/10"
                  : "border-border bg-background hover:border-primary/40"
              }`}
            >
              <span className="text-2xl" aria-hidden>
                {item.emoji}
              </span>
              <span className="text-xs font-medium leading-tight">{item.label}</span>
              {isSelected && <Check className="size-3.5 text-primary" />}
            </button>
          );
        })}
      </div>

      <button
        onClick={() => mutation.mutate(draft)}
        disabled={!full || mutation.isPending}
        className="w-full rounded-full bg-primary px-5 py-3 text-sm font-bold text-primary-foreground disabled:opacity-50"
      >
        {mutation.isPending ? "Enregistrement…" : "Valider mes 3 points forts"}
      </button>
    </div>
  );
}
