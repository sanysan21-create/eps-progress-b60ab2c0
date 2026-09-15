import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";

import { MOODS } from "@/lib/mood";
import { setMyMood } from "@/lib/student-access.functions";

/**
 * L'élève choisit lui-même son état du moment parmi des smileys.
 * Ce bloc n'est affiché que si l'enseignant a activé l'option pour cet élève.
 */
export function MoodPicker({ current, at }: { current: string | null; at: string | null }) {
  const queryClient = useQueryClient();
  const save = useServerFn(setMyMood);

  const mutation = useMutation({
    mutationFn: (moodCode: string) => save({ data: { moodCode } }),
    onSuccess: () => {
      toast.success("Ton état est enregistré");
      queryClient.invalidateQueries({ queryKey: ["my-mood"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <div className="rounded-2xl border border-border bg-surface p-5">
      <p className="text-sm text-muted-foreground">Comment te sens-tu en ce moment ?</p>
      <div className="mt-4 grid grid-cols-4 gap-2">
        {MOODS.map((item) => {
          const active = current === item.code;
          return (
            <button
              key={item.code}
              type="button"
              disabled={mutation.isPending}
              aria-pressed={active}
              onClick={() => mutation.mutate(item.code)}
              className={`flex flex-col items-center gap-1 rounded-xl border px-2 py-3 transition active:scale-95 disabled:opacity-60 ${
                active
                  ? "border-primary/60 bg-primary/10"
                  : "border-border bg-surface-2 hover:border-primary/40"
              }`}
            >
              <span aria-hidden className="text-2xl leading-none">
                {item.emoji}
              </span>
              <span
                className={`text-[0.65rem] font-semibold leading-tight ${
                  active ? "text-primary" : "text-muted-foreground"
                }`}
              >
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
      {at && (
        <p className="mt-3 text-xs text-muted-foreground">
          Dernière mise à jour :{" "}
          {new Date(at).toLocaleString("fr-FR", {
            day: "2-digit",
            month: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
          })}
        </p>
      )}
    </div>
  );
}
