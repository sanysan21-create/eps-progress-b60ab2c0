import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";

import { getMySessionUltimateMatches } from "@/lib/ultimate-matches.functions";
import { ultimateTeamLabel } from "@/lib/ultimate";

/** Rencontres d'ultimate enregistrées sur une séance précise, côté élève. */
export function UltimateSessionMatches({ sessionId }: { sessionId: string }) {
  const fetchMatches = useServerFn(getMySessionUltimateMatches);
  const query = useQuery({
    queryKey: ["my-ultimate-matches", sessionId],
    queryFn: () => fetchMatches({ data: { sessionId } }),
  });

  const matches = query.data?.matches ?? [];
  const myTeam = query.data?.my_team ?? null;
  if (matches.length === 0) return null;

  return (
    <div className="space-y-2 rounded-2xl border border-border bg-surface px-4 py-4">
      <h3 className="mono-label text-muted-foreground">🥏 Rencontres de la séance</h3>
      <ul className="space-y-1.5">
        {matches.map((row) => {
          const mine = myTeam !== null && (row.team_a === myTeam || row.team_b === myTeam);
          const isA = row.team_a === myTeam;
          const myScore = isA ? row.score_a : row.score_b;
          const other = isA ? row.score_b : row.score_a;
          const result = mine
            ? myScore > other
              ? "✅"
              : myScore < other
                ? "❌"
                : "➖"
            : null;
          return (
            <li
              key={row.id}
              className={`flex items-center gap-3 rounded-xl px-3 py-2 text-sm ${
                mine ? "border border-primary/40 bg-primary/10" : ""
              }`}
            >
              <span className="min-w-0 flex-1 truncate font-semibold">
                {result ? `${result} ` : ""}
                {ultimateTeamLabel(row.team_a)} contre {ultimateTeamLabel(row.team_b)}
              </span>
              <span className="display-title text-base leading-none">
                {row.score_a}–{row.score_b}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
