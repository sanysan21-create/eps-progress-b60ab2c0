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
const SCORE =
  "w-16 rounded-xl border border-border bg-background px-2 py-2 text-center font-mono font-bold outline-none focus:border-primary";

type Draft = { teamA: UltimateTeamCode; teamB: UltimateTeamCode; scoreA: string; scoreB: string };

function emptyDraft(indexA: number, indexB: number): Draft {
  return {
    teamA: (ULTIMATE_TEAMS[indexA] ?? ULTIMATE_TEAMS[0]!).code,
    teamB: (ULTIMATE_TEAMS[indexB] ?? ULTIMATE_TEAMS[1]!).code,
    scoreA: "0",
    scoreB: "0",
  };
}

/** Scores des rencontres entre équipes pour une séance d'ultimate (deux matchs à la fois). */
export function UltimateMatchScores({ sessionId }: { sessionId: string }) {
  const queryClient = useQueryClient();
  const fetchMatches = useServerFn(listSessionMatches);
  const add = useServerFn(addSessionMatch);
  const update = useServerFn(updateSessionMatch);
  const remove = useServerFn(deleteSessionMatch);

  const [busy, setBusy] = useState(false);
  const [drafts, setDrafts] = useState<Draft[]>([emptyDraft(0, 1), emptyDraft(2, 3)]);

  const key = ["session-matches", sessionId];
  const matches = useQuery({
    queryKey: key,
    queryFn: () => fetchMatches({ data: { sessionId } }),
  });

  const refresh = () => queryClient.invalidateQueries({ queryKey: key });

  function patch(index: number, values: Partial<Draft>) {
    setDrafts((prev) => prev.map((row, i) => (i === index ? { ...row, ...values } : row)));
  }

  async function handleAdd(only?: number) {
    if (busy) return;
    const selected = only === undefined ? drafts : drafts.filter((_, i) => i === only);
    if (selected.some((row) => row.teamA === row.teamB)) {
      toast.error("Choisis deux équipes différentes dans chaque rencontre.");
      return;
    }
    setBusy(true);
    try {
      for (const row of selected) {
        await add({
          data: {
            sessionId,
            teamA: row.teamA,
            teamB: row.teamB,
            scoreA: Number(row.scoreA) || 0,
            scoreB: Number(row.scoreB) || 0,
          },
        });
      }
      setDrafts((prev) => prev.map((row) => ({ ...row, scoreA: "0", scoreB: "0" })));
      await refresh();
      toast.success(selected.length > 1 ? "Rencontres ajoutées" : "Rencontre ajoutée");
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
                className={SCORE}
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
                className={SCORE}
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

      <div className="space-y-3">
        {drafts.map((draft, index) => (
          <div key={index} className="space-y-2 rounded-xl border border-border bg-background p-3">
            <p className="mono-label text-muted-foreground">Match {index + 1}</p>
            <div className="grid gap-2 sm:grid-cols-[1fr_1fr_auto_auto]">
              <label className="block space-y-1">
                <span className={LABEL}>Équipe A</span>
                <select
                  value={draft.teamA}
                  onChange={(event) =>
                    patch(index, { teamA: event.target.value as UltimateTeamCode })
                  }
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
                  onChange={(event) =>
                    patch(index, { teamB: event.target.value as UltimateTeamCode })
                  }
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
                    onChange={(event) => patch(index, { scoreA: event.target.value })}
                    aria-label={`Score ${ultimateTeamLabel(draft.teamA)}`}
                    className={SCORE}
                  />
                  <span className="text-muted-foreground">—</span>
                  <input
                    type="number"
                    min={0}
                    max={200}
                    value={draft.scoreB}
                    onChange={(event) => patch(index, { scoreB: event.target.value })}
                    aria-label={`Score ${ultimateTeamLabel(draft.teamB)}`}
                    className={SCORE}
                  />
                </div>
              </label>
              <button
                type="button"
                onClick={() => void handleAdd(index)}
                disabled={busy}
                className="mt-auto inline-flex items-center justify-center gap-1 rounded-xl border border-border px-3 py-2 text-xs font-semibold hover:border-primary disabled:opacity-60"
              >
                <Plus className="size-3.5" /> Ajouter
              </button>
            </div>
            <p className="text-xs text-muted-foreground">
              {ultimateTeamLabel(draft.teamA)} <span>vs</span> {ultimateTeamLabel(draft.teamB)}
            </p>
          </div>
        ))}

        <button
          type="button"
          onClick={() => void handleAdd()}
          disabled={busy}
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-bold uppercase text-primary-foreground disabled:opacity-60"
        >
          <Plus className="size-4" /> {busy ? "Ajout…" : "Ajouter les 2 matchs"}
        </button>
      </div>
    </div>
  );
}
