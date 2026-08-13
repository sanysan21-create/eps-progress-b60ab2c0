import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Plus, TrendingUp } from "lucide-react";
import { LevelChips } from "@/components/eps/LevelBars";
import { classes, pupils, LEVEL_LABELS, type Level } from "@/data/demo";

export const Route = createFileRoute("/prof/")({
  head: () => ({
    meta: [
      { title: "Mes classes et élèves — EPS Progress" },
      {
        name: "description",
        content:
          "Espace enseignant EPS : gestion des classes, roster des élèves et niveau atteint sur 5 par élève.",
      },
      { property: "og:title", content: "Mes classes et élèves — EPS Progress" },
      {
        property: "og:description",
        content: "Gestion des classes et suivi du niveau de chaque élève en EPS.",
      },
    ],
  }),
  component: TeacherClasses,
});

function TeacherClasses() {
  const [activeClass, setActiveClass] = useState(classes[0]!.id);
  const current = classes.find((c) => c.id === activeClass)!;
  const roster = pupils.filter((p) => p.classId === activeClass);

  return (
    <div className="animate-slide-up space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mono-label text-primary">Année 2025 / 2026</p>
          <h1 className="display-title text-3xl lg:text-4xl">Mes classes</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <button className="flex items-center gap-2 rounded-lg border border-border bg-surface px-4 py-2 text-xs font-bold uppercase">
            <Plus className="size-3.5" /> Ajouter élève
          </button>
          <Link
            to="/prof/evaluer"
            className="rounded-lg bg-primary px-4 py-2 text-xs font-bold uppercase text-primary-foreground"
          >
            Évaluer session
          </Link>
        </div>
      </header>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {classes.map((c) => (
          <button
            key={c.id}
            onClick={() => setActiveClass(c.id)}
            className={`rounded-2xl border p-4 text-left transition-colors ${
              c.id === activeClass
                ? "border-primary bg-primary/10"
                : "border-border bg-surface hover:border-primary/40"
            }`}
          >
            <div className="mb-4 flex items-start justify-between">
              <span className="display-title text-xl italic text-primary">{c.code}</span>
              <span className="mono-label text-muted-foreground">{c.studentCount} élèves</span>
            </div>
            <p className="text-sm font-bold uppercase">{c.name}</p>
            <p className="mono-label mt-1 text-muted-foreground">{c.option}</p>
            <p className="mono-label mt-3 flex items-center gap-1 text-primary">
              <TrendingUp className="size-3" /> moy. {c.averageLevel}/5
            </p>
          </button>
        ))}
      </section>

      <section className="space-y-4">
        <h2 className="display-title text-2xl">Roster de classe : {current.name}</h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {roster.map((p) => (
            <article
              key={p.id}
              className="flex items-center justify-between gap-4 rounded-2xl border border-border bg-surface/40 p-4 transition-colors hover:bg-surface"
            >
              <div className="flex items-center gap-4">
                <div className="grid size-12 place-items-center rounded-xl bg-surface-2 ring-1 ring-border">
                  <span className="display-title text-sm text-primary">
                    {p.name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")}
                  </span>
                </div>
                <div>
                  <p className="text-sm font-bold">{p.name}</p>
                  <p className="mono-label text-muted-foreground">Éval : {p.lastEval}</p>
                  <p className="mono-label text-primary">{LEVEL_LABELS[p.level as Level]}</p>
                </div>
              </div>
              <LevelChips level={p.level} />
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
