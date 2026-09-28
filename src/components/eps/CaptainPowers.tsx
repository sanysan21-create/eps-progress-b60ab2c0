import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";

import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { getMyTeamPowers, type UltimatePower } from "@/lib/ultimate-powers.functions";
import { ultimateTeamLabel } from "@/lib/ultimate";

/** Pouvoirs de l'équipe, visibles uniquement par le/la capitaine (lecture seule). */
export function CaptainPowers() {
  const fetchPowers = useServerFn(getMyTeamPowers);
  const query = useQuery({ queryKey: ["my-team-powers"], queryFn: () => fetchPowers() });
  const [open, setOpen] = useState<UltimatePower | null>(null);
  const data = query.data;
  if (!data) return null;

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
      {data.powers.length === 0 ? (
        <p className="text-sm text-muted-foreground">Aucun pouvoir attribué pour le moment.</p>
      ) : (
        <ul className="grid gap-2 sm:grid-cols-2">
          {data.powers.map((p) => (
            <li key={p.id}>
              <button type="button" onClick={() => setOpen(p)}
                className="w-full space-y-1 rounded-2xl border border-border bg-surface p-4 text-left transition hover:border-primary active:scale-[0.99]">
                <p className="display-title text-lg leading-tight">{p.icon ?? "⚡"} {p.name}</p>
                {(p.description || p.rule) && (
                  <p className="text-sm text-muted-foreground">{p.description || p.rule}</p>
                )}
                <p className="mono-label text-xs text-primary">{p.cost} pts</p>
              </button>
            </li>
          ))}
        </ul>
      )}

      <Dialog open={!!open} onOpenChange={(v) => !v && setOpen(null)}>
        <DialogContent className="max-w-sm rounded-2xl">
          {open && (
            <>
              <DialogHeader>
                <DialogTitle className="display-title text-2xl">{open.icon ?? "⚡"} {open.name}</DialogTitle>
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
              <p className="text-xs text-muted-foreground">Attribué par ton professeur.</p>
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
