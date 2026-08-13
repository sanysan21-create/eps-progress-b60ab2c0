import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import {
  ArrowLeft,
  Plus,
  Upload,
  Search,
  MoreHorizontal,
  Loader2,
  QrCode,
  Users,
} from "lucide-react";
import { toast } from "sonner";

import {
  getClassDetail,
  listClasses,
  addStudent,
  importStudents,
  updateStudent,
  moveStudent,
  removeFromClass,
  deleteStudent,
  regenerateQrToken,
  type StudentRow,
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export const Route = createFileRoute("/_authenticated/prof/classes/$classId")({
  head: () => ({
    meta: [
      { title: "Gestion d'une classe — EPS Progress" },
      {
        name: "description",
        content:
          "Ajoutez, modifiez, déplacez ou retirez les élèves d'une classe, et importez une liste depuis un fichier CSV.",
      },
      { property: "og:title", content: "Gestion d'une classe — EPS Progress" },
      {
        property: "og:description",
        content: "Gestion manuelle des élèves d'une classe dans EPS Progress.",
      },
    ],
  }),
  component: ClassDetailPage,
});

type ParsedRow = { firstName: string; lastName: string; duplicate: boolean };

function parseCsv(text: string): { firstName: string; lastName: string }[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => line.split(/[;,\t]/).map((c) => c.trim().replace(/^"|"$/g, "")))
    .filter((cells) => cells.length >= 2 && cells[0] && cells[1])
    .filter(
      (cells) =>
        !/^(pr[ée]nom|first ?name)$/i.test(cells[0]!) && !/^(nom|last ?name)$/i.test(cells[1]!),
    )
    .map((cells) => ({ firstName: cells[0]!, lastName: cells[1]! }));
}

function ClassDetailPage() {
  const { classId } = Route.useParams();
  const queryClient = useQueryClient();

  const fetchDetail = useServerFn(getClassDetail);
  const fetchClasses = useServerFn(listClasses);
  const addOne = useServerFn(addStudent);
  const importMany = useServerFn(importStudents);
  const editOne = useServerFn(updateStudent);
  const moveOne = useServerFn(moveStudent);
  const removeOne = useServerFn(removeFromClass);
  const destroyOne = useServerFn(deleteStudent);
  const regenerate = useServerFn(regenerateQrToken);

  const detail = useQuery({
    queryKey: ["class", classId],
    queryFn: () => fetchDetail({ data: { id: classId } }),
  });
  const classesQuery = useQuery({ queryKey: ["classes"], queryFn: () => fetchClasses() });

  const [term, setTerm] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");

  const [editTarget, setEditTarget] = useState<StudentRow | null>(null);
  const [moveTarget, setMoveTarget] = useState<StudentRow | null>(null);
  const [moveTo, setMoveTo] = useState("");
  const [removeTarget, setRemoveTarget] = useState<StudentRow | null>(null);
  const [profileTarget, setProfileTarget] = useState<StudentRow | null>(null);

  const [importOpen, setImportOpen] = useState(false);
  const [parsed, setParsed] = useState<ParsedRow[]>([]);

  const students = detail.data?.students ?? [];
  const klass = detail.data?.klass;

  const filtered = useMemo(() => {
    const q = term.trim().toLowerCase();
    if (!q) return students;
    return students.filter((s) =>
      `${s.first_name} ${s.last_name} ${s.student_code}`.toLowerCase().includes(q),
    );
  }, [students, term]);

  function refresh() {
    queryClient.invalidateQueries({ queryKey: ["class", classId] });
    queryClient.invalidateQueries({ queryKey: ["classes"] });
  }

  const addMutation = useMutation({
    mutationFn: () => addOne({ data: { classId, firstName, lastName } }),
    onSuccess: (result) => {
      toast.success(`Élève ajouté · identifiant ${result.studentCode}`);
      setFirstName("");
      setLastName("");
      setAddOpen(false);
      refresh();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const editMutation = useMutation({
    mutationFn: () =>
      editOne({ data: { id: editTarget!.id, firstName, lastName } }),
    onSuccess: () => {
      toast.success("Élève modifié");
      setEditTarget(null);
      refresh();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const moveMutation = useMutation({
    mutationFn: () =>
      moveOne({ data: { studentId: moveTarget!.id, fromClassId: classId, toClassId: moveTo } }),
    onSuccess: () => {
      toast.success("Élève déplacé — historique et identifiant conservés");
      setMoveTarget(null);
      refresh();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const removeMutation = useMutation({
    mutationFn: () => removeOne({ data: { studentId: removeTarget!.id, classId } }),
    onSuccess: () => {
      toast.success("Élève retiré de la classe (historique conservé)");
      setRemoveTarget(null);
      refresh();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const destroyMutation = useMutation({
    mutationFn: () => destroyOne({ data: { id: removeTarget!.id } }),
    onSuccess: () => {
      toast.success("Élève supprimé définitivement");
      setRemoveTarget(null);
      refresh();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const qrMutation = useMutation({
    mutationFn: (id: string) => regenerate({ data: { id } }),
    onSuccess: () => {
      toast.success("QR code régénéré");
      refresh();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const importMutation = useMutation({
    mutationFn: () =>
      importMany({
        data: {
          classId,
          rows: parsed
            .filter((r) => !r.duplicate)
            .map(({ firstName: f, lastName: l }) => ({ firstName: f, lastName: l })),
        },
      }),
    onSuccess: (result) => {
      toast.success(`${result.imported} élève(s) importé(s)`);
      setParsed([]);
      setImportOpen(false);
      refresh();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  async function handleFile(file: File) {
    const rows = parseCsv(await file.text());
    const existing = new Set(
      students.map((s) => `${s.first_name.toLowerCase()}|${s.last_name.toLowerCase()}`),
    );
    const seen = new Set<string>();
    setParsed(
      rows.map((row) => {
        const key = `${row.firstName.toLowerCase()}|${row.lastName.toLowerCase()}`;
        const duplicate = existing.has(key) || seen.has(key);
        seen.add(key);
        return { ...row, duplicate };
      }),
    );
  }

  const otherClasses = (classesQuery.data ?? []).filter((c) => c.id !== classId);
  const newCount = parsed.filter((r) => !r.duplicate).length;
  const dupCount = parsed.length - newCount;

  return (
    <div className="animate-slide-up space-y-8">
      <Link to="/prof" className="mono-label inline-flex items-center gap-2 text-muted-foreground hover:text-primary">
        <ArrowLeft className="size-3.5" /> Mes classes
      </Link>

      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mono-label text-primary">{klass?.school_year ?? "—"}</p>
          <h1 className="display-title text-3xl lg:text-4xl">{klass?.name ?? "Classe"}</h1>
          <p className="mono-label mt-2 flex items-center gap-2 text-muted-foreground">
            <Users className="size-3.5 text-primary" /> {students.length} élève
            {students.length === 1 ? "" : "s"}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => {
              setFirstName("");
              setLastName("");
              setAddOpen(true);
            }}
            className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-xs font-bold uppercase text-primary-foreground"
          >
            <Plus className="size-4" /> Ajouter un élève
          </button>
          <button
            onClick={() => setImportOpen(true)}
            className="flex items-center gap-2 rounded-lg border border-border bg-surface px-4 py-2.5 text-xs font-bold uppercase"
          >
            <Upload className="size-4" /> Importer des élèves
          </button>
        </div>
      </header>

      <div className="relative max-w-xl">
        <Search className="absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <input
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          placeholder="Rechercher dans la classe"
          className="w-full rounded-xl border border-border bg-surface py-3 pl-11 pr-4 text-sm outline-none focus:border-primary"
        />
      </div>

      {detail.isLoading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> Chargement des élèves…
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-border p-10 text-center">
          <p className="display-title text-xl">Aucun élève {term ? "trouvé" : "dans cette classe"}</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Ajoutez-les un par un ou importez un fichier CSV (prénom ; nom).
          </p>
        </div>
      ) : (
        <ul className="space-y-2">
          {filtered.map((student) => (
            <li
              key={student.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-surface/40 p-4 transition-colors hover:bg-surface"
            >
              <div className="flex items-center gap-4">
                <div className="grid size-11 place-items-center rounded-xl bg-surface-2 ring-1 ring-border">
                  <span className="display-title text-sm text-primary">
                    {student.first_name[0]}
                    {student.last_name[0]}
                  </span>
                </div>
                <div>
                  <p className="text-sm font-bold">
                    {student.first_name} {student.last_name}
                  </p>
                  <p className="mono-label text-muted-foreground">{student.student_code}</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setProfileTarget(student)}
                  className="rounded-lg border border-border px-3 py-2 text-[10px] font-bold uppercase"
                >
                  Profil
                </button>
                <button
                  onClick={() => {
                    setEditTarget(student);
                    setFirstName(student.first_name);
                    setLastName(student.last_name);
                  }}
                  className="rounded-lg border border-border px-3 py-2 text-[10px] font-bold uppercase"
                >
                  Modifier
                </button>
                <DropdownMenu>
                  <DropdownMenuTrigger
                    aria-label={`Actions pour ${student.first_name} ${student.last_name}`}
                    className="grid size-9 place-items-center rounded-lg border border-border text-muted-foreground hover:text-primary"
                  >
                    <MoreHorizontal className="size-4" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuLabel>
                      {student.first_name} {student.last_name}
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => setProfileTarget(student)}>
                      Consulter le profil
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setProfileTarget(student)}>
                      Consulter l'historique
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => {
                        setMoveTarget(student);
                        setMoveTo(otherClasses[0]?.id ?? "");
                      }}
                    >
                      Déplacer vers une autre classe
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => qrMutation.mutate(student.id)}>
                      <QrCode className="mr-2 size-4" /> Régénérer le QR code
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="text-destructive focus:text-destructive"
                      onClick={() => setRemoveTarget(student)}
                    >
                      Retirer / supprimer…
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* Ajouter / modifier un élève */}
      <Dialog
        open={addOpen || Boolean(editTarget)}
        onOpenChange={(open) => {
          if (!open) {
            setAddOpen(false);
            setEditTarget(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editTarget ? "Modifier l'élève" : "Nouvel élève"}</DialogTitle>
            <DialogDescription>
              {editTarget
                ? "Corrigez le prénom ou le nom de l'élève."
                : "L'identifiant unique de l'élève est généré automatiquement."}
            </DialogDescription>
          </DialogHeader>
          <form
            id="student-form"
            onSubmit={(e) => {
              e.preventDefault();
              if (editTarget) editMutation.mutate();
              else addMutation.mutate();
            }}
            className="space-y-4"
          >
            <div>
              <label className="mono-label text-muted-foreground" htmlFor="student-first">
                Prénom
              </label>
              <input
                id="student-first"
                required
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="mt-1 w-full rounded-xl border border-border bg-surface-2 px-4 py-3 text-sm outline-none focus:border-primary"
              />
            </div>
            <div>
              <label className="mono-label text-muted-foreground" htmlFor="student-last">
                Nom
              </label>
              <input
                id="student-last"
                required
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="mt-1 w-full rounded-xl border border-border bg-surface-2 px-4 py-3 text-sm outline-none focus:border-primary"
              />
            </div>
          </form>
          <DialogFooter>
            <button
              type="submit"
              form="student-form"
              disabled={addMutation.isPending || editMutation.isPending}
              className="rounded-lg bg-primary px-4 py-2.5 text-xs font-bold uppercase text-primary-foreground disabled:opacity-60"
            >
              {editTarget ? "Enregistrer" : "Ajouter l'élève"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Profil / historique */}
      <Dialog open={Boolean(profileTarget)} onOpenChange={(open) => !open && setProfileTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {profileTarget?.first_name} {profileTarget?.last_name}
            </DialogTitle>
            <DialogDescription>Fiche élève et suivi pédagogique</DialogDescription>
          </DialogHeader>
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="mono-label text-muted-foreground">Identifiant</dt>
              <dd className="font-bold">{profileTarget?.student_code}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="mono-label text-muted-foreground">Classe</dt>
              <dd className="font-bold">{klass?.name}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="mono-label text-muted-foreground">Jeton QR</dt>
              <dd className="truncate font-mono text-xs">{profileTarget?.qr_token}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="mono-label text-muted-foreground">Ajouté le</dt>
              <dd className="font-bold">
                {profileTarget
                  ? new Date(profileTarget.created_at).toLocaleDateString("fr-FR")
                  : "—"}
              </dd>
            </div>
          </dl>
          <p className="rounded-xl border border-border bg-surface-2 p-4 text-xs text-muted-foreground">
            L'historique d'évaluations de cet élève s'affichera ici dès que des évaluations auront
            été enregistrées.
          </p>
        </DialogContent>
      </Dialog>

      {/* Déplacer */}
      <Dialog open={Boolean(moveTarget)} onOpenChange={(open) => !open && setMoveTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Déplacer vers une autre classe</DialogTitle>
            <DialogDescription>
              L'identifiant, le profil, l'historique, les objectifs, les compétences et le QR code de{" "}
              {moveTarget?.first_name} sont conservés.
            </DialogDescription>
          </DialogHeader>
          {otherClasses.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Vous n'avez pas d'autre classe pour l'instant.
            </p>
          ) : (
            <select
              value={moveTo}
              onChange={(e) => setMoveTo(e.target.value)}
              className="w-full rounded-xl border border-border bg-surface-2 px-4 py-3 text-sm outline-none focus:border-primary"
            >
              {otherClasses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} · {c.school_year}
                </option>
              ))}
            </select>
          )}
          <DialogFooter>
            <button
              onClick={() => setMoveTarget(null)}
              className="rounded-lg border border-border px-4 py-2.5 text-xs font-bold uppercase"
            >
              Annuler
            </button>
            <button
              disabled={!moveTo || moveMutation.isPending}
              onClick={() => moveMutation.mutate()}
              className="rounded-lg bg-primary px-4 py-2.5 text-xs font-bold uppercase text-primary-foreground disabled:opacity-60"
            >
              Déplacer
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Retirer / supprimer */}
      <AlertDialog
        open={Boolean(removeTarget)}
        onOpenChange={(open) => !open && setRemoveTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {removeTarget?.first_name} {removeTarget?.last_name}
            </AlertDialogTitle>
            <AlertDialogDescription>
              « Retirer de la classe » conserve l'élève et tout son historique pédagogique (option
              recommandée). « Supprimer définitivement » efface l'élève, ses évaluations et son
              historique : cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col gap-2 sm:flex-row">
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <button
              onClick={() => removeMutation.mutate()}
              disabled={removeMutation.isPending}
              className="rounded-lg bg-primary px-4 py-2.5 text-xs font-bold uppercase text-primary-foreground disabled:opacity-60"
            >
              Retirer de la classe
            </button>
            <button
              onClick={() => destroyMutation.mutate()}
              disabled={destroyMutation.isPending}
              className="rounded-lg bg-destructive px-4 py-2.5 text-xs font-bold uppercase text-destructive-foreground disabled:opacity-60"
            >
              Supprimer définitivement
            </button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Import CSV */}
      <Dialog
        open={importOpen}
        onOpenChange={(open) => {
          setImportOpen(open);
          if (!open) setParsed([]);
        }}
      >
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Importer des élèves dans {klass?.name}</DialogTitle>
            <DialogDescription>
              Fichier CSV avec une ligne par élève : prénom ; nom. Vérifiez le résumé avant
              validation.
            </DialogDescription>
          </DialogHeader>

          <input
            type="file"
            accept=".csv,text/csv,text/plain"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void handleFile(file);
            }}
            className="w-full rounded-xl border border-border bg-surface-2 p-3 text-xs"
          />

          {parsed.length > 0 && (
            <>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="rounded-xl border border-border bg-surface-2 p-3">
                  <p className="display-title text-xl text-primary">{parsed.length}</p>
                  <p className="mono-label text-muted-foreground">lignes</p>
                </div>
                <div className="rounded-xl border border-border bg-surface-2 p-3">
                  <p className="display-title text-xl text-primary">{newCount}</p>
                  <p className="mono-label text-muted-foreground">à importer</p>
                </div>
                <div className="rounded-xl border border-border bg-surface-2 p-3">
                  <p className="display-title text-xl text-destructive">{dupCount}</p>
                  <p className="mono-label text-muted-foreground">doublons</p>
                </div>
              </div>

              <ul className="max-h-56 space-y-1 overflow-y-auto">
                {parsed.map((row, index) => (
                  <li
                    key={`${row.firstName}-${row.lastName}-${index}`}
                    className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-xs"
                  >
                    <span>
                      {row.firstName} {row.lastName}
                    </span>
                    <span
                      className={
                        row.duplicate ? "mono-label text-destructive" : "mono-label text-primary"
                      }
                    >
                      {row.duplicate ? "doublon ignoré" : "nouveau"}
                    </span>
                  </li>
                ))}
              </ul>
            </>
          )}

          <DialogFooter>
            <button
              onClick={() => setImportOpen(false)}
              className="rounded-lg border border-border px-4 py-2.5 text-xs font-bold uppercase"
            >
              Annuler
            </button>
            <button
              disabled={newCount === 0 || importMutation.isPending}
              onClick={() => importMutation.mutate()}
              className="rounded-lg bg-primary px-4 py-2.5 text-xs font-bold uppercase text-primary-foreground disabled:opacity-60"
            >
              Importer {newCount} élève(s)
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
