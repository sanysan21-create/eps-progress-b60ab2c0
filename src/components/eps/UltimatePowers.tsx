import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Copy, Pencil, Plus, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";

import {
  deletePower,
  duplicatePower,
  getPowersBoard,
  savePower,
  saveRankBudgets,
  saveTeamPowers,
  type PowersTeam,
  type RankBudget,
  type UltimatePower,
} from "@/lib/ultimate-powers.functions";
import { ultimateTeamLabel } from "@/lib/ultimate";

const FIELD =
  "w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary";
const BTN =
  "inline-flex items-center gap-1 rounded-xl border border-border px-3 py-1.5 text-xs font-semibold hover:border-primary disabled:opacity-50";
const PRIMARY =
  "inline-flex items-center gap-1 rounded-xl bg-primary px-3 py-2 text-xs font-bold text-primary-foreground disabled:opacity-50";

type Draft = Omit<UltimatePower, "id"> & { id?: string };
const EMPTY: Draft = { name: "", icon: "⚡", description: "", rule: "", cost: 1, active: true };

function errorMessage(e: unknown) {
  return e instanceof Error ? e.message : "Erreur";
}

/** Pouvoirs Ultimate : gestion complète par l'enseignant pour une classe. */
export function UltimatePowers({ classId, activityId }: { classId: string; activityId: string }) {
  const queryClient = useQueryClient();
  const fetchBoard = useServerFn(getPowersBoard);
  const save = useServerFn(savePower);
  const duplicate = useServerFn(duplicatePower);
  const remove = useServerFn(deletePower);
  const saveBudgets = useServerFn(saveRankBudgets);

  const key = ["ultimate-powers", classId, activityId];
  const board = useQuery({ queryKey: key, queryFn: () => fetchBoard({ data: { classId, activityId } }) });
  const refresh = () => queryClient.invalidateQueries({ queryKey: key });

  const [draft, setDraft] = useState<Draft | null>(null);
  const [budgets, setBudgets] = useState<RankBudget[]>([]);
  useEffect(() => {
    if (board.data) setBudgets(board.data.budgets);
  }, [board.data]);

  async function run(fn: () => Promise<unknown>, ok: string) {
    try {
      await fn();
      toast.success(ok);
      await refresh();
      return true;
    } catch (e) {
      toast.error(errorMessage(e));
      return false;
    }
  }

  const powers = board.data?.powers ?? [];
  const teams = board.data?.teams ?? [];

  return (
    <section className="space-y-5 rounded-3xl border border-border bg-surface p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="display-title text-xl">⚡ Pouvoirs</h2>
        <button type="button" className={PRIMARY} onClick={() => setDraft({ ...EMPTY })}>
          <Plus className="size-4" /> Créer un pouvoir
        </button>
      </div>

      {draft && (
        <div className="space-y-2 rounded-2xl border border-primary/40 bg-background/60 p-4">
          <div className="grid gap-2 sm:grid-cols-[5rem_1fr_6rem]">
            <input className={FIELD} placeholder="⚡" value={draft.icon ?? ""} maxLength={8}
              onChange={(e) => setDraft({ ...draft, icon: e.target.value })} aria-label="Icône" />
            <input className={FIELD} placeholder="Nom du pouvoir" value={draft.name}
              onChange={(e) => setDraft({ ...draft, name: e.target.value })} aria-label="Nom" />
            <input className={FIELD} type="number" min={0} max={99} value={draft.cost}
              onChange={(e) => setDraft({ ...draft, cost: Math.max(0, Number(e.target.value) || 0) })}
              aria-label="Coût en points" />
          </div>
          <input className={FIELD} placeholder="Description courte" value={draft.description}
            onChange={(e) => setDraft({ ...draft, description: e.target.value })} />
          <textarea className={FIELD} rows={3} placeholder="Règle complète" value={draft.rule}
            onChange={(e) => setDraft({ ...draft, rule: e.target.value })} />
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={draft.active}
              onChange={(e) => setDraft({ ...draft, active: e.target.checked })} />
            Actif
          </label>
          <div className="flex gap-2">
            <button type="button" className={PRIMARY} disabled={!draft.name.trim()}
              onClick={async () => {
                const ok = await run(
                  () => save({ data: { ...draft, icon: draft.icon || null } }),
                  "Pouvoir enregistré",
                );
                if (ok) setDraft(null);
              }}>
              <Save className="size-4" /> Enregistrer
            </button>
            <button type="button" className={BTN} onClick={() => setDraft(null)}>Annuler</button>
          </div>
        </div>
      )}

      {powers.length === 0 ? (
        <p className="text-sm text-muted-foreground">Aucun pouvoir créé pour l'instant.</p>
      ) : (
        <ul className="grid gap-2 sm:grid-cols-2">
          {powers.map((p) => (
            <li key={p.id} className={`space-y-2 rounded-2xl border border-border bg-background/60 p-3 ${p.active ? "" : "opacity-50"}`}>
              <div className="flex items-start justify-between gap-2">
                <p className="font-semibold">{p.icon ?? "⚡"} {p.name}</p>
                <span className="mono-label shrink-0 text-xs text-primary">{p.cost} pts</span>
              </div>
              {p.description && <p className="text-xs text-muted-foreground">{p.description}</p>}
              <div className="flex flex-wrap gap-1.5">
                <button type="button" className={BTN} onClick={() => setDraft({ ...p })}>
                  <Pencil className="size-3" /> Modifier
                </button>
                <button type="button" className={BTN}
                  onClick={() => void run(() => duplicate({ data: { id: p.id } }), "Pouvoir dupliqué")}>
                  <Copy className="size-3" /> Dupliquer
                </button>
                <button type="button" className={BTN}
                  onClick={() => void run(() => save({ data: { ...p, active: !p.active } }),
                    p.active ? "Pouvoir désactivé" : "Pouvoir activé")}>
                  {p.active ? "Désactiver" : "Activer"}
                </button>
                <button type="button" className={`${BTN} hover:border-destructive hover:text-destructive`}
                  onClick={() => {
                    if (window.confirm(`Supprimer « ${p.name} » ?`))
                      void run(() => remove({ data: { id: p.id } }), "Pouvoir supprimé");
                  }}>
                  <Trash2 className="size-3" /> Supprimer
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="space-y-2">
        <h3 className="mono-label text-muted-foreground">Classement → points disponibles</h3>
        <div className="flex flex-wrap gap-2">
          {budgets.map((b, i) => (
            <div key={b.rank} className="flex items-center gap-1 rounded-xl border border-border px-2 py-1 text-sm">
              <span className="font-semibold">{b.rank}e</span>→
              <input type="number" min={0} max={99} value={b.points}
                className="w-14 rounded-lg border border-border bg-background px-1 py-0.5 text-center"
                onChange={(e) => setBudgets(budgets.map((row, j) =>
                  j === i ? { ...row, points: Math.max(0, Number(e.target.value) || 0) } : row))} />
              pts
            </div>
          ))}
          <button type="button" className={BTN}
            onClick={() => setBudgets([...budgets, { rank: budgets.length + 1, points: 0 }])}
            disabled={budgets.length >= 20}>
            <Plus className="size-3" /> Rang
          </button>
          {budgets.length > 0 && (
            <button type="button" className={BTN} onClick={() => setBudgets(budgets.slice(0, -1))}>
              <Trash2 className="size-3" />
            </button>
          )}
          <button type="button" className={PRIMARY}
            onClick={() => void run(() => saveBudgets({ data: { budgets } }), "Barème enregistré")}>
            <Save className="size-3" /> Enregistrer
          </button>
        </div>
      </div>

      <div className="space-y-3">
        <h3 className="mono-label text-muted-foreground">Équipes</h3>
        {teams.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Aucune équipe de couleur dans cette classe (à créer dans Évaluer les compétences).
          </p>
        ) : (
          <div className="grid gap-3 lg:grid-cols-2">
            {teams.map((team) => (
              <TeamCard key={team.team} team={team} powers={powers} budgets={budgets}
                classId={classId} activityId={activityId} onSaved={refresh} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function TeamCard({
  team, powers, budgets, classId, activityId, onSaved,
}: {
  team: PowersTeam; powers: UltimatePower[]; budgets: RankBudget[];
  classId: string; activityId: string; onSaved: () => Promise<unknown>;
}) {
  const saveTeam = useServerFn(saveTeamPowers);
  const [captain, setCaptain] = useState(team.captain_id ?? "");
  const [rank, setRank] = useState(team.rank ? String(team.rank) : "");
  const [selected, setSelected] = useState<string[]>(team.power_ids);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setCaptain(team.captain_id ?? "");
    setRank(team.rank ? String(team.rank) : "");
    setSelected(team.power_ids);
  }, [team]);

  const rankNum = rank ? Number(rank) : null;
  const budget = rankNum ? (budgets.find((b) => b.rank === rankNum)?.points ?? 0) : 0;
  const cost = (id: string) => powers.find((p) => p.id === id)?.cost ?? 0;
  const used = selected.reduce((s, id) => s + cost(id), 0);
  const rankOptions = Math.max(budgets.length, team.rank ?? 0, 1);

  return (
    <article className="space-y-3 rounded-2xl border border-border bg-background/60 p-4">
      <p className="display-title text-lg">Équipe {ultimateTeamLabel(team.team)}</p>
      <p className="text-xs text-muted-foreground">
        {team.members.map((m) => `${m.first_name} ${m.last_name}`).join(", ")}
      </p>
      <div className="grid gap-2 sm:grid-cols-2">
        <label className="space-y-1 text-xs text-muted-foreground">Capitaine
          <select className={FIELD} value={captain} onChange={(e) => setCaptain(e.target.value)}>
            <option value="">— Aucun —</option>
            {team.members.map((m) => (
              <option key={m.id} value={m.id}>{m.first_name} {m.last_name}</option>
            ))}
          </select>
        </label>
        <label className="space-y-1 text-xs text-muted-foreground">Classement
          <select className={FIELD} value={rank} onChange={(e) => setRank(e.target.value)}>
            <option value="">— Non classé —</option>
            {Array.from({ length: rankOptions }, (_, i) => i + 1).map((r) => (
              <option key={r} value={r}>{r}e</option>
            ))}
          </select>
        </label>
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <p className="mono-label text-xs text-muted-foreground">⚡ Attribuer des pouvoirs</p>
          <p className={`mono-label text-xs ${used > budget ? "text-destructive" : "text-primary"}`}>
            {used} / {budget} points utilisés
          </p>
        </div>
        {powers.filter((p) => p.active || selected.includes(p.id)).map((p) => {
          const checked = selected.includes(p.id);
          const disabled = !checked && used + p.cost > budget;
          return (
            <label key={p.id} className={`flex items-center gap-2 text-sm ${disabled ? "opacity-40" : ""}`}>
              <input type="checkbox" checked={checked} disabled={disabled}
                onChange={() => setSelected(checked ? selected.filter((x) => x !== p.id) : [...selected, p.id])} />
              {p.icon ?? "⚡"} {p.name} — {p.cost} pts
            </label>
          );
        })}
      </div>

      <button type="button" className={PRIMARY} disabled={busy || used > budget}
        onClick={async () => {
          setBusy(true);
          try {
            await saveTeam({ data: { classId, activityId, team: team.team,
              captainId: captain || null, rank: rankNum, powerIds: selected } });
            toast.success("Équipe enregistrée");
            await onSaved();
          } catch (e) {
            toast.error(errorMessage(e));
          } finally {
            setBusy(false);
          }
        }}>
        <Save className="size-3" /> Enregistrer l'équipe
      </button>
    </article>
  );
}
