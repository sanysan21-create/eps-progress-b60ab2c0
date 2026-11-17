import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";

import {
  addToMyAcrosportGroup,
  getMyAcrosportGroup,
  leaveMyAcrosportGroup,
} from "@/lib/acrosport.functions";

/** Choix du groupe d'acrosport par l'élève, parmi les élèves de sa classe. */
export function AcrosportGroupPicker() {
  const queryClient = useQueryClient();
  const fetchBoard = useServerFn(getMyAcrosportGroup);
  const add = useServerFn(addToMyAcrosportGroup);
  const leave = useServerFn(leaveMyAcrosportGroup);
  const board = useQuery({ queryKey: ["acrosport-group"], queryFn: () => fetchBoard() });
  const [pick, setPick] = useState("");
  const [busy, setBusy] = useState(false);

  const data = board.data;
  if (!data) return null;

  const members = data.my_group_id
    ? data.classmates.filter((row) => row.group_id === data.my_group_id)
    : [];
  const available = data.classmates.filter((row) => !row.group_id && row.id !== data.my_id);
  const size = data.my_group_id ? members.length : 1;
  const full = size >= data.max;

  async function run(fn: () => Promise<unknown>, ok: string) {
    setBusy(true);
    try {
      await fn();
      toast.success(ok);
      setPick("");
      await queryClient.invalidateQueries({ queryKey: ["acrosport-group"] });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Action impossible");
      await queryClient.invalidateQueries({ queryKey: ["acrosport-group"] });
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="space-y-3 rounded-2xl border border-border bg-surface p-5">
      <div>
        <h2 className="text-sm font-bold uppercase">🤸 Mon groupe d'acrosport</h2>
        <p className="text-xs text-muted-foreground">
          Choisis tes partenaires parmi les élèves de ta classe ({data.max} élèves maximum).
        </p>
      </div>

      {members.length > 0 ? (
        <ul className="flex flex-wrap gap-2">
          {members.map((row) => (
            <li
              key={row.id}
              className={`rounded-full border px-3 py-1.5 text-sm font-medium ${
                row.id === data.my_id ? "border-primary text-primary" : "border-border"
              }`}
            >
              {row.first_name} {row.last_name}
              {row.id === data.my_id && " (moi)"}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">Tu n'as pas encore de groupe.</p>
      )}

      {!full && (
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={pick}
            onChange={(e) => setPick(e.target.value)}
            className="min-w-[220px] flex-1 rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
          >
            <option value="">Choisir un élève…</option>
            {available.map((row) => (
              <option key={row.id} value={row.id}>
                {row.first_name} {row.last_name}
              </option>
            ))}
          </select>
          <button
            type="button"
            disabled={!pick || busy}
            onClick={() => void run(() => add({ data: { classmateId: pick } }), "Élève ajouté au groupe")}
            className="rounded-xl bg-primary px-4 py-2 text-sm font-bold text-primary-foreground disabled:opacity-40"
          >
            Ajouter
          </button>
        </div>
      )}
      {full && <p className="text-xs text-muted-foreground">Ton groupe est complet.</p>}
      {available.length === 0 && !full && (
        <p className="text-xs text-muted-foreground">Tous les élèves ont déjà un groupe.</p>
      )}

      {data.my_group_id && (
        <button
          type="button"
          disabled={busy}
          onClick={() => void run(() => leave(), "Tu as quitté le groupe")}
          className="text-xs text-muted-foreground underline hover:text-destructive"
        >
          Quitter mon groupe
        </button>
      )}
    </section>
  );
}
