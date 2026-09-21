import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import {
  addSessionMatch,
  deleteSessionMatch,
  listSessionMatches,
  updateSessionMatch,
} from "@/lib/ultimate-matches.functions";
import { ULTIMATE_TEAMS, ultimateTeamLabel } from "@/lib/ultimate";
import type { UltimateTeamCode } from "@/lib/ultimate";

const FIELD =
  "w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary";
const LABEL = "text-xs text-muted-foreground";

/** Scores des rencontres entre équipes pour une séance d'ultimate. */
export function UltimateMatchScores({ sessionId }: { sessionId: string }) {
  const queryClient = useQueryClient();
  const fetchMatches = useServerFn(listSessionMatches);
  const add = useServerFn(addSessionMatch);
  const update = useServerFn(updateSessionMatch);
  const remove = useServerFn(deleteSessionMatch);

  const [busy, setBusy] = useState(false);
  const [draft, setDraft] = useState<{
    teamA: UltimateTeamCode;
    teamB: UltimateTeamCode;
    scoreA: string;
    scoreB: string;
  }>({
    teamA: ULTIMATE_TEAMS[0]!.code,
    teamB: ULTIMATE_TEAMS[1]!.code,
    scoreA: "0",
    scoreB: "0",
  });

  const key = ["session-matches", sessionId];
  const matches = useQuery({
    queryKey: key,
    queryFn: () => fetchMatches({ data: { sessionId } }),
  });

  const refresh = () => queryClient.invalidateQueries({ queryKey: key });

  async function handleAdd() {
    if (busy) return;
    setBusy(true);
    try {
      await add({
        data: {
          sessionId,
          teamA: draft.teamA,
          teamB: draft.teamB,
          scoreA: Number(draft.scoreA) || 0,
          scoreB: Number(draft.scoreB) || 0,
        },
      });
      setDraft({ ...draft, scoreA: "0", scoreB: "0" });
      await refresh();
      toast.success("Rencontre ajoutée");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Ajout impossible");
    } finally {
      setBusy(false);
    }
  }

  async function handleScore(id: string, scoreA: number, scoreB: number) {
    try {
      await update({ data: { id, scoreA, scoreB } });
      await refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Enregistrement impossible");
    }
  }

  const list = matches.data ?? [];

  return (
    <div className="space-y-3 rounded-2xl border border-border bg-surface p-4">
      <h4 className="mono-label text-muted-foreground">🥏 Scores des rencontres</h4>

      {list.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          Aucune rencontre enregistrée pour cette séance.
        </p>
      ) : (
        <ul className="space-y-2">
          {list.map((row) => (
            <li
              key={row.id}
              className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-background px-3 py-2 text-sm"
            >
              <span className="min-w-0 flex-1 truncate font-semibold">
                {ultimateTeamLabel(row.team_a)} <span className="text-muted-foreground">vs</span>{" "}
                {ultimateTeamLabel(row.team_b)}
              </span>
              <input
                type="number"
                min={0}
                max={200}
                defaultValue={row.score_a}
                onBlur={(event) =>
                  void handleScore(row.id, Number(event.target.value) || 0, row.score_b)
                }
                aria-label={`Score ${ultimateTeamLabel(row.team_a)}`}
                className="w-16 rounded-xl border border-border bg-surface px-2 py-1 text-center font-mono font-bold outline-none focus:border-primary"
              />
              <span className="text-muted-foreground">—</span>
              <input
                type="number"
                min={0}
                max={200}
                defaultValue={row.score_b}
                onBlur={(event) =>
                  void handleScore(row.id, row.score_a, Number(event.target.value) || 0)
                }
                aria-label={`Score ${ultimateTeamLabel(row.team_b)}`}
                className="w-16 rounded-xl border border-border bg-surface px-2 py-1 text-center font-mono font-bold outline-none focus:border-primary"
              />
              <button
                type="button"
                onClick={async () => {
                  if (!window.confirm("Supprimer cette rencontre ?")) return;
                  await remove({ data: { id: row.id } });
                  await refresh();
                }}
                className="text-muted-foreground hover:text-destructive"
                aria-label="Supprimer la rencontre"
              >
                <Trash2 className="size-4" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="grid gap-2 sm:grid-cols-[1fr_1fr_auto_auto]">
        <label className="block space-y-1">
          <span className={LABEL}>Équipe A</span>
          <select
            value={draft.teamA}
            onChange={(event) => setDraft({ ...draft, teamA: event.target.value as UltimateTeamCode })}
            className={FIELD}
          >
            {ULTIMATE_TEAMS.map((team) => (
              <option key={team.code} value={team.code}>
                {team.emoji} {team.label}
              </option>
            ))}
          </select>
        </label>
        <label className="block space-y-1">
          <span className={LABEL}>Équipe B</span>
          <select
            value={draft.teamB}
            onChange={(event) => setDraft({ ...draft, teamB: event.target.value as UltimateTeamCode })}
            className={FIELD}
          >
            {ULTIMATE_TEAMS.map((team) => (
              <option key={team.code} value={team.code}>
                {team.emoji} {team.label}
              </option>
            ))}
          </select>
        </label>
        <label className="block space-y-1">
          <span className={LABEL}>Score</span>
          <div className="flex items-center gap-1">
            <input
              type="number"
              min={0}
              max={200}
              value={draft.scoreA}
              onChange={(event) => setDraft({ ...draft, scoreA: event.target.value })}
              aria-label="Score équipe A"
              className="w-16 rounded-xl border border-border bg-background px-2 py-2 text-center font-mono font-bold outline-none focus:border-primary"
            />
            <span className="text-muted-foreground">—</span>
            <input
              type="number"
              min={0}
              max={200}
              value={draft.scoreB}
              onChange={(event) => setDraft({ ...draft, scoreB: event.target.value })}
              aria-label="Score équipe B"
              className="w-16 rounded-xl border border-border bg-background px-2 py-2 text-center font-mono font-bold outline-none focus:border-primary"
            />
          </div>
        </label>
        <button
          type="button"
          onClick={() => void handleAdd()}
          disabled={busy}
          className="mt-auto inline-flex items-center justify-center gap-1 rounded-xl border border-border px-3 py-2 text-xs font-semibold hover:border-primary disabled:opacity-60"
        >
          <Plus className="size-3.5" /> Ajouter
        </button>
      </div>
    </div>
  );
}
