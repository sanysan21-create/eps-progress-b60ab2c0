import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { ChevronRight, History, Loader2, Search } from "lucide-react";
import { toast } from "sonner";

import { listStudentLogins } from "@/lib/classes.functions";
import { viewStudentAsTeacher } from "@/lib/student-access.functions";

export const Route = createFileRoute("/_authenticated/prof/historique")({
  head: () => ({
    meta: [
      { title: "Historique des connexions — EPS Progress" },
      {
        name: "description",
        content:
          "Suivez les dernières connexions de vos élèves à leur espace EPS Progress, classe par classe.",
      },
      { property: "og:title", content: "Historique des connexions — EPS Progress" },
      {
        property: "og:description",
        content: "Dernières connexions des élèves à leur espace EPS Progress.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: LoginHistoryPage,
});

const dateFormatter = new Intl.DateTimeFormat("fr-FR", {
  dateStyle: "full",
  timeStyle: "short",
});

function relativeLabel(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.round(diff / 60000);
  if (minutes < 1) return "à l'instant";
  if (minutes < 60) return `il y a ${minutes} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `il y a ${hours} h`;
  const days = Math.round(hours / 24);
  if (days < 31) return `il y a ${days} j`;
  const months = Math.round(days / 30);
  return `il y a ${months} mois`;
}

function LoginHistoryPage() {
  const fetchLogins = useServerFn(listStudentLogins);
  const { data, isLoading } = useQuery({
    queryKey: ["student-logins"],
    queryFn: () => fetchLogins({}),
  });

  const [query, setQuery] = useState("");
  const [onlyConnected, setOnlyConnected] = useState(false);

  const rows = useMemo(() => {
    const term = query.trim().toLowerCase();
    return (data ?? []).filter((row) => {
      if (onlyConnected && !row.last_login_at) return false;
      if (!term) return true;
      return (
        `${row.first_name} ${row.last_name}`.toLowerCase().includes(term) ||
        row.student_code.toLowerCase().includes(term) ||
        row.classes.some((c) => c.toLowerCase().includes(term))
      );
    });
  }, [data, query, onlyConnected]);

  const connected = (data ?? []).filter((r) => r.last_login_at).length;

  return (
    <div className="space-y-8">
      <header>
        <p className="mono-label text-muted-foreground">Suivi des accès</p>
        <h1 className="display-title text-3xl lg:text-4xl">Historique</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Dernière connexion de chaque élève à son espace personnel, de la plus récente à la plus
          ancienne.
        </p>
      </header>

      <section className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-border bg-surface p-5">
          <p className="mono-label text-muted-foreground">Élèves</p>
          <p className="display-title text-3xl">{data?.length ?? 0}</p>
        </div>
        <div className="rounded-2xl border border-border bg-surface p-5">
          <p className="mono-label text-muted-foreground">Déjà connectés</p>
          <p className="display-title text-3xl text-primary">{connected}</p>
        </div>
        <div className="rounded-2xl border border-border bg-surface p-5">
          <p className="mono-label text-muted-foreground">Jamais connectés</p>
          <p className="display-title text-3xl">{(data?.length ?? 0) - connected}</p>
        </div>
      </section>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher un élève, un code ou une classe"
            className="w-full rounded-xl border border-border bg-surface py-3 pl-11 pr-4 text-sm outline-none focus:border-primary"
          />
        </div>
        <button
          onClick={() => setOnlyConnected((v) => !v)}
          className={`rounded-xl border px-4 py-3 text-xs font-bold uppercase tracking-tight transition-colors ${
            onlyConnected
              ? "border-primary bg-primary/10 text-primary"
              : "border-border bg-surface text-foreground/80 hover:border-primary"
          }`}
        >
          Connectés uniquement
        </button>
      </div>

      {isLoading ? (
        <div className="flex items-center gap-3 rounded-3xl border border-border bg-surface p-8 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> Chargement de l'historique…
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-3xl border border-border bg-surface p-10 text-center">
          <History className="mx-auto size-8 text-muted-foreground" />
          <p className="mt-4 text-sm text-muted-foreground">Aucune connexion à afficher.</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {rows.map((row) => (
            <li
              key={row.id}
              className="flex flex-col gap-2 rounded-2xl border border-border bg-surface p-5 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-bold uppercase tracking-tight">
                  {row.last_name} {row.first_name}
                </p>
                <p className="mono-label truncate text-muted-foreground">
                  {row.student_code}
                  {row.classes.length > 0 ? ` · ${row.classes.join(", ")}` : ""}
                </p>
              </div>
              <div className="sm:text-right">
                {row.last_login_at ? (
                  <>
                    <p className="text-sm font-medium text-primary">
                      {relativeLabel(row.last_login_at)}
                    </p>
                    <p className="mono-label text-muted-foreground">
                      {dateFormatter.format(new Date(row.last_login_at))}
                    </p>
                  </>
                ) : (
                  <p className="mono-label text-muted-foreground">Jamais connecté</p>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
