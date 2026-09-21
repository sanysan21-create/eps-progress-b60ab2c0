import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Loader2 } from "lucide-react";

import { GOALS, STRENGTHS } from "@/lib/engagement";
import { getClassChoiceStats, type ChoiceCount } from "@/lib/engagement.functions";

function Row({ emoji, label, count, max }: { emoji: string; label: string; count: number; max: number }) {
  const percent = max > 0 ? Math.round((count / max) * 100) : 0;
  return (
    <li className="space-y-1.5">
      <div className="flex items-center justify-between gap-3 text-sm">
        <span className="flex min-w-0 items-center gap-2">
          <span aria-hidden>{emoji}</span>
          <span className="truncate font-medium">{label}</span>
        </span>
        <span className="mono-label shrink-0 text-primary">{count}</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-surface-2">
        <div className="h-full rounded-full bg-primary" style={{ width: `${percent}%` }} />
      </div>
    </li>
  );
}

function Section({
  title,
  rows,
  catalog,
  empty,
}: {
  title: string;
  rows: ChoiceCount[];
  catalog: { code: string; label: string; emoji: string }[];
  empty: string;
}) {
  const max = rows.reduce((best, row) => Math.max(best, row.count), 0);
  return (
    <section className="space-y-4 rounded-3xl border border-border bg-surface/40 p-5">
      <h2 className="display-title text-lg">{title}</h2>
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">{empty}</p>
      ) : (
        <ul className="space-y-3">
          {rows.map((row) => {
            const item = catalog.find((entry) => entry.code === row.code);
            return (
              <Row
                key={row.code}
                emoji={item?.emoji ?? "•"}
                label={item?.label ?? row.code}
                count={row.count}
                max={max}
              />
            );
          })}
        </ul>
      )}
    </section>
  );
}

/** Lecture seule : ce que les élèves de la classe ont choisi eux-mêmes. */
export function ClassChoiceStats({ classId }: { classId: string }) {
  const fetchStats = useServerFn(getClassChoiceStats);
  const stats = useQuery({
    queryKey: ["class-choice-stats", classId],
    queryFn: () => fetchStats({ data: { classId } }),
  });

  if (stats.isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" /> Chargement des statistiques…
      </div>
    );
  }

  const data = stats.data;
  if (!data) return null;

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-3">
        {[
          { label: "Élèves", value: data.studentCount },
          { label: "Points forts renseignés", value: data.withStrengths },
          { label: "Objectif renseigné", value: data.withGoal },
        ].map((card) => (
          <div key={card.label} className="rounded-2xl border border-border bg-surface/40 p-4">
            <p className="mono-label text-muted-foreground">{card.label}</p>
            <p className="display-title text-2xl text-primary">{card.value}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Section
          title="⭐ Mes points forts"
          rows={data.strengths}
          catalog={STRENGTHS}
          empty="Aucun élève n'a encore choisi ses points forts."
        />
        <Section
          title="🚀 Mon objectif"
          rows={data.goals}
          catalog={GOALS}
          empty="Aucun élève n'a encore choisi son objectif."
        />
      </div>
    </div>
  );
}
