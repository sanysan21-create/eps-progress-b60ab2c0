import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Plus, Users, Pencil, Trash2, Search, ChevronRight, Loader2 } from "lucide-react";
import { toast } from "sonner";

import {
  listClasses,
  createClass,
  updateClass,
  deleteClass,
  searchStudents,
  type ClassRow,
} from "@/lib/classes.functions";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export const Route = createFileRoute("/_authenticated/prof/")({
  head: () => ({
    meta: [
      { title: "Mes classes — EPS Progress" },
      {
        name: "description",
        content:
          "Espace enseignant EPS : créez, renommez et organisez vos classes, et retrouvez chaque élève en un instant.",
      },
      { property: "og:title", content: "Mes classes — EPS Progress" },
      {
        property: "og:description",
        content: "Gestion complète des classes et des élèves dans EPS Progress.",
      },
    ],
  }),
  component: MyClassesPage,
});

const currentYear = new Date().getMonth() >= 7 ? new Date().getFullYear() : new Date().getFullYear() - 1;
const defaultYear = `${currentYear}/${currentYear + 1}`;

function MyClassesPage() {
  const queryClient = useQueryClient();
  const fetchClasses = useServerFn(listClasses);
  const runSearch = useServerFn(searchStudents);
  const create = useServerFn(createClass);
  const update = useServerFn(updateClass);
  const remove = useServerFn(deleteClass);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<ClassRow | null>(null);
  const [name, setName] = useState("");
  const [year, setYear] = useState(defaultYear);
  const [toDelete, setToDelete] = useState<ClassRow | null>(null);
  const [term, setTerm] = useState("");

  const classesQuery = useQuery({ queryKey: ["classes"], queryFn: () => fetchClasses() });
  const searchQuery = useQuery({
    queryKey: ["student-search", term],
    queryFn: () => runSearch({ data: { query: term } }),
    enabled: term.trim().length >= 2,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["classes"] });

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (editing) {
        await update({ data: { id: editing.id, name, schoolYear: year } });
      } else {
        await create({ data: { name, schoolYear: year } });
      }
    },
    onSuccess: () => {
      toast.success(editing ? "Classe modifiée" : "Classe créée");
      setFormOpen(false);
      setEditing(null);
      invalidate();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => remove({ data: { id } }),
    onSuccess: () => {
      toast.success("Classe supprimée");
      setToDelete(null);
      invalidate();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  function openCreate() {
    setEditing(null);
    setName("");
    setYear(defaultYear);
    setFormOpen(true);
  }

  function openEdit(klass: ClassRow) {
    setEditing(klass);
    setName(klass.name);
    setYear(klass.school_year);
    setFormOpen(true);
  }

  const classes = classesQuery.data ?? [];

  return (
    <div className="animate-slide-up space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mono-label text-primary">Espace enseignant</p>
          <h1 className="display-title text-3xl lg:text-4xl">Mes classes</h1>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-xs font-bold uppercase text-primary-foreground"
        >
          <Plus className="size-4" /> Ajouter une classe
        </button>
      </header>

      <div className="relative max-w-xl">
        <Search className="absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <input
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          placeholder="Rechercher un élève (prénom, nom, classe…)"
          className="w-full rounded-xl border border-border bg-surface py-3 pl-11 pr-4 text-sm outline-none focus:border-primary"
        />
      </div>

      {term.trim().length >= 2 && (
        <section className="space-y-3">
          <h2 className="mono-label text-muted-foreground">
            Résultats {searchQuery.isFetching ? "…" : `(${searchQuery.data?.length ?? 0})`}
          </h2>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {(searchQuery.data ?? []).map((student) => (
              <article
                key={student.id}
                className="rounded-2xl border border-border bg-surface/40 p-4"
              >
                <p className="text-sm font-bold">
                  {student.first_name} {student.last_name}
                </p>
                <p className="mono-label text-muted-foreground">{student.student_code}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {student.classes.map((c) => (
                    <Link
                      key={c.id}
                      to="/prof/classes/$classId"
                      params={{ classId: c.id }}
                      className="mono-label rounded-full border border-primary/40 px-2 py-1 text-primary"
                    >
                      {c.name}
                    </Link>
                  ))}
                  {student.classes.length === 0 && (
                    <span className="mono-label text-muted-foreground">Sans classe</span>
                  )}
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      <section className="space-y-4">
        {classesQuery.isLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" /> Chargement des classes…
          </div>
        ) : classes.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-border p-10 text-center">
            <Users className="mx-auto size-8 text-muted-foreground" />
            <p className="display-title mt-4 text-xl">Aucune classe pour l'instant</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Créez votre première classe pour commencer à ajouter des élèves.
            </p>
            <button
              onClick={openCreate}
              className="mt-6 rounded-lg bg-primary px-4 py-2.5 text-xs font-bold uppercase text-primary-foreground"
            >
              + Ajouter une classe
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {classes.map((klass) => (
              <article
                key={klass.id}
                className="group rounded-2xl border border-border bg-surface p-5 transition-colors hover:border-primary/50"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="display-title text-2xl italic text-primary">{klass.name}</h3>
                    <p className="mono-label mt-1 text-muted-foreground">{klass.school_year}</p>
                  </div>
                  <div className="flex gap-1">
                    <button
                      aria-label={`Modifier ${klass.name}`}
                      onClick={() => openEdit(klass)}
                      className="grid size-9 place-items-center rounded-lg border border-border text-muted-foreground hover:text-primary"
                    >
                      <Pencil className="size-4" />
                    </button>
                    <button
                      aria-label={`Supprimer ${klass.name}`}
                      onClick={() => setToDelete(klass)}
                      className="grid size-9 place-items-center rounded-lg border border-border text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                </div>

                <p className="mono-label mt-6 flex items-center gap-2 text-foreground/80">
                  <Users className="size-3.5 text-primary" /> {klass.student_count} élève
                  {klass.student_count === 1 ? "" : "s"}
                </p>

                <Link
                  to="/prof/classes/$classId"
                  params={{ classId: klass.id }}
                  className="mt-5 flex items-center justify-between rounded-xl bg-surface-2 px-4 py-3 text-xs font-bold uppercase transition-colors group-hover:bg-primary group-hover:text-primary-foreground"
                >
                  Ouvrir la classe <ChevronRight className="size-4" />
                </Link>
              </article>
            ))}
          </div>
        )}
      </section>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Modifier la classe" : "Nouvelle classe"}</DialogTitle>
            <DialogDescription>
              Indiquez le nom de la classe et l'année scolaire concernée.
            </DialogDescription>
          </DialogHeader>
          <form
            id="class-form"
            onSubmit={(e) => {
              e.preventDefault();
              saveMutation.mutate();
            }}
            className="space-y-4"
          >
            <div>
              <label className="mono-label text-muted-foreground" htmlFor="class-name">
                Nom de la classe
              </label>
              <input
                id="class-name"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="5e B"
                className="mt-1 w-full rounded-xl border border-border bg-surface-2 px-4 py-3 text-sm outline-none focus:border-primary"
              />
            </div>
            <div>
              <label className="mono-label text-muted-foreground" htmlFor="class-year">
                Année scolaire
              </label>
              <input
                id="class-year"
                required
                value={year}
                onChange={(e) => setYear(e.target.value)}
                placeholder={defaultYear}
                className="mt-1 w-full rounded-xl border border-border bg-surface-2 px-4 py-3 text-sm outline-none focus:border-primary"
              />
            </div>
          </form>
          <DialogFooter>
            <button
              type="button"
              onClick={() => setFormOpen(false)}
              className="rounded-lg border border-border px-4 py-2.5 text-xs font-bold uppercase"
            >
              Annuler
            </button>
            <button
              type="submit"
              form="class-form"
              disabled={saveMutation.isPending}
              className="rounded-lg bg-primary px-4 py-2.5 text-xs font-bold uppercase text-primary-foreground disabled:opacity-60"
            >
              {editing ? "Enregistrer" : "Créer la classe"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={Boolean(toDelete)} onOpenChange={(open) => !open && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer la classe « {toDelete?.name} » ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est définitive. La classe et les rattachements de ses{" "}
              {toDelete?.student_count ?? 0} élève(s) seront supprimés. Les élèves eux-mêmes et leur
              historique sont conservés.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => toDelete && deleteMutation.mutate(toDelete.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Supprimer définitivement
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
