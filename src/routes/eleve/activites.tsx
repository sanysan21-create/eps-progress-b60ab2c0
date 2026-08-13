import { createFileRoute } from "@tanstack/react-router";
import { Flame } from "lucide-react";

import { useStudentActivities } from "@/hooks/use-student-profile";

export const Route = createFileRoute("/eleve/activites")({
  head: () => ({
    meta: [
      { title: "Mes activités et compétences — EPS Progress" },
      {
        name: "description",
        content:
          "Détail des activités EPS de l'élève : compétences évaluées et niveau atteint pour chacune.",
      },
      { property: "og:title", content: "Mes activités et compétences — EPS Progress" },
      {
        property: "og:description",
        content: "Compétences évaluées et niveau atteint pour chaque activité EPS.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: StudentActivities,
});

function StudentActivities() {
  const activities = useStudentActivities();
  const data = activities.data ?? [];

  return (
    <div className="animate-slide-up space-y-6">
      <header className="space-y-1">
        <p className="mono-label text-primary">Suivi de mes compétences</p>
        <h1 className="display-title text-4xl">Mes activités</h1>
      </header>

      {activities.isLoading && <p className="text-sm text-muted-foreground">Chargement…</p>}

      {!activities.isLoading && data.length === 0 && (
        <div className="rounded-3xl border border-border bg-surface p-6 text-center">
          <Flame className="mx-auto size-8 text-primary" />
          <p className="mt-3 font-bold">Aucune activité évaluée pour le moment.</p>
          <p className="text-sm text-muted-foreground">
            Tes activités apparaîtront dès que ton professeur aura renseigné tes niveaux.
          </p>
        </div>
      )}

      {data.map((activity) => (
        <article key={activity.activity_id} className="rounded-3xl border border-border bg-surface p-5">
          <div className="mb-5">
            <h2 className="display-title text-2xl italic">{activity.activity_name}</h2>
            <p className="mono-label mt-1 text-muted-foreground">
              {activity.competencies.length} compétence{activity.competencies.length > 1 ? "s" : ""}{" "}
              évaluée{activity.competencies.length > 1 ? "s" : ""}
            </p>
          </div>

          <div className="space-y-4">
            {activity.competencies.map((c) => (
              <div key={c.id} className="space-y-2">
                <div className="flex items-center justify-between gap-3 text-xs">
                  <span className="font-semibold">{c.label}</span>
                  <span className="shrink-0 font-mono text-muted-foreground">
                    Niv. {c.level_position}/{c.level_max} · {c.level_label}
                  </span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-surface-2">
                  <div
                    className="animate-bar-grow h-full origin-left rounded-full bg-primary"
                    style={{
                      width: `${c.level_max > 0 ? (c.level_position / c.level_max) * 100 : 0}%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </article>
      ))}
    </div>
  );
}
