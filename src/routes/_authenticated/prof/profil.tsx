import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2, Mail, Trash2, Upload, UserRound } from "lucide-react";
import { ThemeSetting } from "@/components/eps/ThemeSetting";
import { toast } from "sonner";

import { teacherProfileKey, useTeacherProfile } from "@/hooks/use-teacher-profile";
import {
  AVATAR_MIME_TYPES,
  changeTeacherEmail,
  removeTeacherAvatar,
  saveTeacherIdentity,
  teacherInitials,
  uploadTeacherAvatar,
  validateAvatarFile,
} from "@/lib/teacher-profile";

export const Route = createFileRoute("/_authenticated/prof/profil")({
  head: () => ({
    meta: [
      { title: "Profil de l'enseignant — EPS Progress" },
      {
        name: "description",
        content:
          "Consultez et modifiez votre profil enseignant EPS Progress : photo, prénom, nom et adresse e-mail.",
      },
      { property: "og:title", content: "Profil de l'enseignant — EPS Progress" },
      {
        property: "og:description",
        content: "Paramètres du profil enseignant EPS Progress : identité, e-mail et photo.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: TeacherProfilePage,
});

function TeacherProfilePage() {
  const queryClient = useQueryClient();
  const { data: profile, isLoading, error } = useTeacherProfile();
  const fileRef = useRef<HTMLInputElement>(null);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [savingIdentity, setSavingIdentity] = useState(false);
  const [savingEmail, setSavingEmail] = useState(false);
  const [photoBusy, setPhotoBusy] = useState(false);

  useEffect(() => {
    if (!profile) return;
    setFirstName(profile.firstName);
    setLastName(profile.lastName);
    setEmail(profile.email);
  }, [profile]);

  async function refresh() {
    await queryClient.invalidateQueries({ queryKey: teacherProfileKey });
  }

  async function submitIdentity(e: React.FormEvent) {
    e.preventDefault();
    if (!firstName.trim() || !lastName.trim()) {
      toast.error("Le prénom et le nom sont obligatoires");
      return;
    }
    setSavingIdentity(true);
    try {
      await saveTeacherIdentity({ firstName, lastName });
      await refresh();
      toast.success("Profil mis à jour");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Enregistrement impossible");
    } finally {
      setSavingIdentity(false);
    }
  }

  async function submitEmail(e: React.FormEvent) {
    e.preventDefault();
    if (!profile) return;
    const next = email.trim().toLowerCase();
    if (next === profile.email.toLowerCase()) {
      toast.info("Cette adresse e-mail est déjà la vôtre");
      return;
    }
    setSavingEmail(true);
    try {
      const { pending } = await changeTeacherEmail(next);
      await refresh();
      toast.success(
        pending
          ? "Un e-mail de confirmation vous a été envoyé pour valider la nouvelle adresse."
          : "Adresse e-mail mise à jour",
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Modification impossible");
    } finally {
      setSavingEmail(false);
    }
  }

  async function onPickFile(file: File) {
    const problem = validateAvatarFile(file);
    if (problem) {
      toast.error(problem);
      return;
    }
    setPhotoBusy(true);
    try {
      await uploadTeacherAvatar(file, profile?.avatarPath ?? null);
      await refresh();
      toast.success("Photo de profil enregistrée");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Envoi de la photo impossible");
    } finally {
      setPhotoBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function deletePhoto() {
    setPhotoBusy(true);
    try {
      await removeTeacherAvatar(profile?.avatarPath ?? null);
      await refresh();
      toast.success("Photo supprimée");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Suppression impossible");
    } finally {
      setPhotoBusy(false);
    }
  }

  if (isLoading) {
    return (
      <div className="grid min-h-[40vh] place-items-center">
        <Loader2 className="size-6 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !profile) {
    return (
      <p className="rounded-2xl border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
        Impossible de charger votre profil enseignant.
      </p>
    );
  }

  return (
    <div className="space-y-8">
      <header>
        <p className="mono-label text-muted-foreground">Mon compte</p>
        <h1 className="display-title text-3xl lg:text-4xl">Profil de l'enseignant</h1>
      </header>

      <section className="rounded-3xl border border-border bg-surface p-6">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
          <div className="relative">
            {profile.avatarUrl ? (
              <img
                src={profile.avatarUrl}
                alt={`Photo de profil de ${profile.firstName} ${profile.lastName}`}
                className="size-24 rounded-full object-cover ring-2 ring-primary/30"
              />
            ) : (
              <div className="grid size-24 place-items-center rounded-full bg-surface-2 ring-2 ring-primary/20">
                <span className="display-title text-2xl text-primary">
                  {teacherInitials(profile)}
                </span>
              </div>
            )}
            {photoBusy && (
              <div className="absolute inset-0 grid place-items-center rounded-full bg-background/70">
                <Loader2 className="size-5 animate-spin text-primary" />
              </div>
            )}
          </div>

          <div className="min-w-0 flex-1">
            <p className="display-title truncate text-2xl">
              {`${profile.firstName} ${profile.lastName}`.trim() || "Profil à compléter"}
            </p>
            <p className="mono-label mt-1 flex items-center gap-2 text-muted-foreground">
              <Mail className="size-3" />
              <span className="truncate">{profile.email}</span>
            </p>

            <div className="mt-4 flex flex-wrap gap-2">
              <button
                onClick={() => fileRef.current?.click()}
                disabled={photoBusy}
                className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-[10px] font-bold uppercase text-primary-foreground disabled:opacity-60"
              >
                <Upload className="size-3.5" />
                {profile.avatarUrl ? "Remplacer la photo" : "Ajouter une photo"}
              </button>
              {profile.avatarUrl && (
                <button
                  onClick={() => void deletePhoto()}
                  disabled={photoBusy}
                  className="flex items-center gap-2 rounded-xl border border-border bg-surface-2 px-4 py-2.5 text-[10px] font-bold uppercase text-foreground disabled:opacity-60"
                >
                  <Trash2 className="size-3.5" /> Supprimer la photo
                </button>
              )}
              <input
                ref={fileRef}
                type="file"
                accept={AVATAR_MIME_TYPES.join(",")}
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void onPickFile(file);
                }}
              />
            </div>
            <p className="mono-label mt-3 text-muted-foreground">JPG, PNG, WEBP ou GIF · 3 Mo max</p>
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-border bg-surface p-6">
        <h2 className="display-title flex items-center gap-2 text-xl">
          <UserRound className="size-4 text-primary" /> Paramètres du profil
        </h2>

        <form onSubmit={submitIdentity} className="mt-5 grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mono-label text-muted-foreground" htmlFor="firstName">
              Prénom
            </label>
            <input
              id="firstName"
              required
              maxLength={80}
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="mt-1 w-full rounded-xl border border-border bg-surface-2 px-4 py-3 text-sm outline-none focus:border-primary"
            />
          </div>
          <div>
            <label className="mono-label text-muted-foreground" htmlFor="lastName">
              Nom
            </label>
            <input
              id="lastName"
              required
              maxLength={80}
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className="mt-1 w-full rounded-xl border border-border bg-surface-2 px-4 py-3 text-sm outline-none focus:border-primary"
            />
          </div>
          <button
            type="submit"
            disabled={savingIdentity}
            className="rounded-xl bg-primary px-4 py-3 text-xs font-bold uppercase text-primary-foreground disabled:opacity-60 sm:col-span-2 sm:w-fit sm:px-8"
          >
            {savingIdentity ? "Enregistrement…" : "Enregistrer"}
          </button>
        </form>

        <div className="my-6 h-px bg-border" />

        <form onSubmit={submitEmail} className="space-y-4">
          <div>
            <label className="mono-label text-muted-foreground" htmlFor="email">
              Adresse e-mail du compte
            </label>
            <input
              id="email"
              type="email"
              required
              maxLength={255}
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-xl border border-border bg-surface-2 px-4 py-3 text-sm outline-none focus:border-primary sm:max-w-md"
            />
            <p className="mono-label mt-2 text-muted-foreground">
              Sert à la connexion : le changement passe par une confirmation par e-mail.
            </p>
          </div>
          <button
            type="submit"
            disabled={savingEmail}
            className="rounded-xl border border-border bg-surface-2 px-8 py-3 text-xs font-bold uppercase text-foreground disabled:opacity-60"
          >
            {savingEmail ? "Modification…" : "Modifier l'e-mail"}
          </button>
        </form>
      </section>

      <section className="rounded-3xl border border-border bg-surface p-6">
        <h2 className="display-title text-xl">🌗 Apparence de l'application</h2>
        <ThemeSetting className="mt-5" />
      </section>
    </div>
  );
}
