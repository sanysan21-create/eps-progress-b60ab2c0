import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";

import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PowerIcon } from "@/components/eps/PowerIcon";
import { getMyTeamPowers, saveMyTeamPowers, type UltimatePower } from "@/lib/ultimate-powers.functions";
import { ultimateTeamLabel } from "@/lib/ultimate";

/** Pouvoirs de l'équipe : le/la capitaine choisit dans la limite du budget. */
export function CaptainPowers() {
  const fetchPowers = useServerFn(getMyTeamPowers);
  const query = useQuery({ queryKey: ["my-team-powers"], queryFn: () => fetchPowers() });
  const [open, setOpen] = useState<UltimatePower | null>(null);
  const save = useServerFn(saveMyTeamPowers);
  const qc = useQueryClient();
  const data = query.data;
  const [picked, setPicked] = useState<string[]>([]);
  useEffect(() => {
    if (data) setPicked(data.powers.map((p) => p.id));
  }, [data]);
  const mutation = useMutation({
    mutationFn: (powerIds: string[]) => save({ data: { powerIds } }),
    onSuccess: () => {
      toast.success("✓ Pouvoirs de l'équipe enregistrés.");
      qc.invalidateQueries({ queryKey: ["my-team-powers"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
  if (!data) return null;
  const costOf = (id: string) => data.available.find((p) => p.id === id)?.cost ?? 0;
  const used = picked.reduce((sum, id) => sum + costOf(id), 0);
  const dirty =
    picked.length !== data.powers.length || picked.some((id) => !data.powers.some((p) => p.id === id));
  const toggle = (p: UltimatePower) =>
    setPicked((prev) => (prev.includes(p.id) ? prev.filter((x) => x !== p.id) : [...prev, p.id]));

  return (
    <section className="space-y-3">
      <h2 className="text-sm font-semibold tracking-tight text-muted-foreground">⚡ Pouvoirs de mon équipe</h2>
      <div className="flex items-center justify-between gap-3 rounded-2xl border border-primary/40 bg-primary/10 px-5 py-4">
        <div>
          <p className="mono-label text-[0.6rem] text-muted-foreground">Équipe</p>
          <p className="display-title text-xl leading-none">{ultimateTeamLabel(data.team)}</p>
        </div>
        <div className="text-right">
          <p className="mono-label text-[0.6rem] text-muted-foreground">Classement</p>
          <p className="display-title text-xl leading-none">{data.rank ? `${data.rank}e` : "—"}</p>
        </div>
      </div>
      <div className="flex items-center justify-between gap-3">
        <p className="mono-label text-xs text-muted-foreground">
          Tu es capitaine : choisis les pouvoirs de ton équipe
        </p>
        <p className={`mono-label text-xs ${used > data.budget ? "text-destructive" : "text-primary"}`}>
          {used} / {data.budget} points utilisés
        </p>
      </div>
      {data.available.length === 0 ? (
        <p className="text-sm text-muted-foreground">Aucun pouvoir disponible pour le moment.</p>
      ) : (
        <ul className="grid gap-2 sm:grid-cols-2">
          {data.available.map((p) => {
            const on = picked.includes(p.id);
            const blocked = !on && used + p.cost > data.budget;
            return (
              <li key={p.id} className={`flex gap-2 rounded-2xl border bg-surface p-3 transition ${on ? "border-primary ring-1 ring-primary" : "border-border"} ${blocked ? "opacity-50" : ""}`}>
                <button type="button" onClick={() => !blocked && toggle(p)} disabled={blocked}
                  aria-pressed={on}
                  className="flex flex-1 items-start gap-2 text-left disabled:cursor-not-allowed">
                  <span className={`mt-1 grid h-5 w-5 shrink-0 place-items-center rounded-md border text-xs font-bold ${on ? "border-primary bg-primary text-primary-foreground" : "border-border"}`}>
                    {on ? "✓" : ""}
                  </span>
                  <span className="min-w-0 space-y-1">
                    <span className="flex items-center gap-2">
                      <PowerIcon value={p.icon} />
                      <span className="display-title text-lg leading-tight">{p.name}</span>
                    </span>
                    {(p.description || p.rule) && (
                      <span className="block text-sm text-muted-foreground">{p.description || p.rule}</span>
                    )}
                    <span className="mono-label block text-xs text-primary">{p.cost} pts</span>
                  </span>
                </button>
                <button type="button" onClick={() => setOpen(p)}
                  className="self-start rounded-lg border border-border px-2 py-1 text-xs text-muted-foreground hover:border-primary">
                  Règle
                </button>
              </li>
            );
          })}
        </ul>
      )}
      {dirty && (
        <button type="button" disabled={mutation.isPending || used > data.budget}
          onClick={() => mutation.mutate(picked)}
          className="w-full rounded-xl bg-primary px-4 py-3 text-sm font-bold text-primary-foreground disabled:opacity-50">
          {mutation.isPending ? "Enregistrement…" : "Valider les pouvoirs"}
        </button>
      )}

      <Dialog open={!!open} onOpenChange={(v) => !v && setOpen(null)}>
        <DialogContent className="max-w-sm rounded-2xl">
          {open && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-3 display-title text-2xl">
                  <PowerIcon value={open.icon} size="lg" /> {open.name}
                </DialogTitle>
              </DialogHeader>
              {open.description && <p className="text-sm text-muted-foreground">{open.description}</p>}
              <div className="space-y-1">
                <p className="mono-label text-xs text-muted-foreground">Règle</p>
                <p className="text-sm">« {open.rule || open.description} »</p>
              </div>
              <div className="space-y-1">
                <p className="mono-label text-xs text-muted-foreground">Coût</p>
                <p className="display-title text-lg text-primary">{open.cost} points</p>
              </div>
                            <DialogFooter>
                <button type="button" onClick={() => setOpen(null)}
                  className="rounded-xl bg-primary px-4 py-2 text-sm font-bold text-primary-foreground">
                  Fermer
                </button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
}
