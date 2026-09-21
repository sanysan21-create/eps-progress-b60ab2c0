import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";

import { getMyUltimateMatches } from "@/lib/ultimate-matches.functions";
import {
  computeUltimateStandings,
  ultimatePoints,
  ultimateTeamLabel,
  type UltimateMatch,
} from "@/lib/ultimate";
import { shortDate } from "@/lib/program-builder";

/** Rencontres d'ultimate de l'élève : résultats de son équipe et classement cumulé. */
export function UltimateStudentMatches() {
  const fetchMatches = useServerFn(getMyUltimateMatches);
  const query = useQuery({
    queryKey: ["my-ultimate-matches"],
    queryFn: () => fetchMatches(),
  });

  const matches = (query.data?.matches ?? []) as UltimateMatch[];
  const myTeam = query.data?.my_team ?? null;
  if (matches.length === 0) return null;

  const standings = computeUltimateStandings(matches);
  const mine = matches.filter((row) => row.team_a === myTeam || row.team_b === myTeam);
  const won = mine.filter((row) =>
    row.team_a === myTeam ? row.score_a > row.score_b : row.score_b > row.score_a,
  ).length;

  return (
    <section className="space-y-3">
      <h2 className="text-sm font-semibold tracking-tight text-muted-foreground">
        🥏 Mes rencontres d'ultimate
      </h2>

      {myTeam && (
        <div className="flex items-center justify-between gap-3 rounded-2xl border border-primary/40 bg-primary/10 px-5 py-4">
          <div>
            <p className="mono-label text-[0.6rem] text-muted-foreground">Mon équipe</p>
            <p className="display-title text-xl leading-none">{ultimateTeamLabel(myTeam)}</p>
          </div>
          <div className="text-right">
            <p className="mono-label text-[0.6rem] text-muted-foreground">Matchs gagnés</p>
            <p className="display-title text-xl leading-none">
              {won}/{mine.length}
            </p>
          </div>
        </div>
      )}

      {mine.length > 0 && (
        <ul className="space-y-2">
          {mine.map((row) => {
            const isA = row.team_a === myTeam;
            const myScore = isA ? row.score_a : row.score_b;
            const other = isA ? row.score_b : row.score_a;
            const opponent = isA ? row.team_b : row.team_a;
            const result =
              myScore > other ? "✅ Victoire" : myScore < other ? "❌ Défaite" : "➖ Match nul";
            return (
              <li
                key={row.id}
                className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-surface px-4 py-3 text-sm"
              >
                <div className="min-w-0">
                  <p className="font-semibold">
                    {result} contre {ultimateTeamLabel(opponent)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {row.session_number ? `S${row.session_number} · ` : ""}
                    {shortDate(row.session_date)}
                  </p>
                </div>
                <span className="display-title text-lg leading-none">
                  {myScore}–{other}
                </span>
              </li>
            );
          })}
        </ul>
      )}

      <div className="space-y-2 rounded-2xl border border-border bg-surface px-4 py-4">
        <h3 className="mono-label text-muted-foreground">🏆 Classement cumulé</h3>
        <ul className="space-y-1.5">
          {standings.map((row, index) => (
            <li
              key={row.team}
              className={`flex items-center gap-3 rounded-xl px-3 py-2 text-sm ${
                row.team === myTeam ? "border border-primary/40 bg-primary/10" : ""
              }`}
            >
              <span className="w-5 font-mono text-xs text-muted-foreground">{index + 1}</span>
              <span className="min-w-0 flex-1 truncate font-semibold">
                {ultimateTeamLabel(row.team)}
              </span>
              <span className="text-xs text-muted-foreground">
                {row.won}V · {row.drawn}N · {row.lost}D
              </span>
              <span className="display-title text-base leading-none">{ultimatePoints(row)} pts</span>
            </li>
          ))}
        </ul>
        <p className="text-xs text-muted-foreground">
          Victoire = 3 points, match nul = 1 point, sur toutes les séances.
        </p>
      </div>
    </section>
  );
}
