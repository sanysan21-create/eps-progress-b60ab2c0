import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ChevronDown } from "lucide-react";

import { getMyGrades } from "@/lib/grades.functions";
import { formatPoints, gradeTotals, type GradeRow } from "@/lib/grades";
import { activityEmoji } from "@/lib/activity-emoji";

export const Route = createFileRoute("/eleve/notes")({
  head: () => ({
    meta: [
      { title: "Mes notes EPS — EPS Progress" },
      {
        name: "description",
        content:
          "Notes d'EPS de l'élève : note globale par activité et détail des AFL renseignés par l'enseignant.",
      },
      { property: "og:title", content: "Mes notes EPS — EPS Progress" },
      {
        property: "og:description",
        content: "Note globale par activité et détail de chaque AFL, en lecture seule.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: StudentGrades,
});

function GradeCard({ grade }: { grade: GradeRow }) {
  const [open, setOpen] = useState(false);
  const totals = gradeTotals(grade.items);

  return (
    <article className="overflow-hidden rounded-2xl border border-border bg-surface">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left"
      >
        <span className="flex min-w-0 items-center gap-2">
          <span aria-hidden>{activityEmoji(grade.activity_name)}</span>
          <span className="truncate text-base font-semibold">{grade.activity_name}</span>
        </span>
        <span className="flex shrink-0 items-center gap-2">
          <span className="display-title text-2xl text-primary">
            {formatPoints(totals.points)} / {formatPoints(totals.max)}
          </span>
          <ChevronDown
            className={`size-4 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`}
          />
        </span>
      </button>

      {open && (
        <div className="space-y-4 border-t border-border/60 px-5 py-4">
          {totals.percent !== null && (
            <p className="text-xs text-muted-foreground">{totals.percent} % du barème</p>
          )}
          <ul className="space-y-3">
            {grade.items.map((item) => (
              <li key={item.id} className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="mono-label text-primary">{item.label}</p>
                  <p className="text-sm leading-snug">
                    {item.competency_label ?? "Compétence non précisée"}
                  </p>
                </div>
                <p className="shrink-0 text-sm font-semibold">
                  {formatPoints(item.points)} / {formatPoints(item.max_points)}
                </p>
              </li>
            ))}
          </ul>
          {grade.comment && (
            <p className="rounded-xl bg-surface-2 px-4 py-3 text-sm text-foreground/80">
              {grade.comment}
            </p>
          )}
        </div>
      )}
    </article>
  );
}

function StudentGrades() {
  const fetchGrades = useServerFn(getMyGrades);
  const grades = useQuery({ queryKey: ["my-grades"], queryFn: () => fetchGrades() });
  const rows = grades.data ?? [];

  return (
    <div className="animate-slide-up space-y-6 pb-4">
      <header className="space-y-1">
        <h1 className="display-title text-2xl leading-tight">📝 Mes notes</h1>
        <p className="text-sm text-muted-foreground">
          Les notes sont attribuées par ton enseignant. Tu peux uniquement les consulter.
        </p>
      </header>

      {grades.isPending ? (
        <div className="h-24 animate-pulse rounded-2xl border border-border bg-surface" />
      ) : rows.length === 0 ? (
        <div className="space-y-2 rounded-2xl border border-border/60 bg-surface/60 px-5 py-6 text-sm text-muted-foreground">
          <p className="font-medium text-foreground">Aucune note disponible pour le moment.</p>
          <p>Les notes apparaîtront ici lorsque ton enseignant aura évalué tes activités.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {rows.map((grade) => (
            <GradeCard key={grade.id} grade={grade} />
          ))}
        </div>
      )}
    </div>
  );
}
