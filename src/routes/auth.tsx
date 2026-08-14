import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { GraduationCap, QrCode } from "lucide-react";
import { toast } from "sonner";

import { getTeacherAccount, signInTeacher, signUpTeacher } from "@/lib/auth.functions";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Connexion enseignant — EPS Progress" },
      {
        name: "description",
        content:
          "Connectez-vous à votre espace enseignant EPS Progress pour gérer vos classes et vos élèves.",
      },
      { property: "og:title", content: "Connexion enseignant — EPS Progress" },
      {
        property: "og:description",
        content: "Accès à l'espace enseignant EPS Progress : classes, élèves et évaluations.",
      },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [space, setSpace] = useState<"choice" | "teacher">("choice");
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    getTeacherAccount()
      .then((account) => {
        if (account) navigate({ to: "/prof" });
      })
      .catch(() => null);
  }, [navigate]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (mode === "signup") {
      if (!firstName.trim() || !lastName.trim()) {
        toast.error("Le prénom et le nom sont obligatoires");
        return;
      }
      if (password !== confirmPassword) {
        toast.error("Les deux mots de passe ne correspondent pas");
        return;
      }
    }
    setBusy(true);
    try {
      if (mode === "signup") {
        await signUpTeacher({
          data: {
            email: email.trim().toLowerCase(),
            password,
            firstName: firstName.trim(),
            lastName: lastName.trim(),
          },
        });
        toast.success("Compte créé. Vous êtes connecté.");
      } else {
        await signInTeacher({ data: { email: email.trim().toLowerCase(), password } });
      }
      navigate({ to: "/prof" });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Connexion impossible");
    } finally {
      setBusy(false);
    }
  }



  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center">
          <Link to="/" className="display-title block text-4xl italic tracking-tighter text-primary">
            EPS Progress
          </Link>
          <p className="mono-label mt-2 text-muted-foreground">
            {space === "choice" ? "Choisis ton espace" : "Espace enseignant"}
          </p>
        </div>

        {space === "choice" && (
          <div className="space-y-3 rounded-3xl border border-border bg-surface p-6">
            <h1 className="display-title text-2xl">Se connecter</h1>
            <button
              onClick={() => setSpace("teacher")}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-4 text-xs font-bold uppercase text-primary-foreground"
            >
              <GraduationCap className="size-4" /> Espace enseignant
            </button>
            <Link
              to="/acces-eleve"
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-surface-2 px-4 py-4 text-xs font-bold uppercase text-foreground"
            >
              <QrCode className="size-4" /> Espace élève
            </Link>
            <p className="mono-label pt-1 text-center text-muted-foreground">
              Élèves : connexion par QR code
            </p>
          </div>
        )}

        <div className={space === "teacher" ? "rounded-3xl border border-border bg-surface p-6" : "hidden"}>
          <h1 className="display-title text-2xl">
            {mode === "signin" ? "Connexion" : "Créer mon compte enseignant"}
          </h1>

          <form onSubmit={submit} className="mt-6 space-y-4">
            {mode === "signup" && (
              <>
                <div>
                  <label className="mono-label text-muted-foreground" htmlFor="firstName">
                    Prénom
                  </label>
                  <input
                    id="firstName"
                    required
                    maxLength={80}
                    autoComplete="given-name"
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
                    autoComplete="family-name"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-border bg-surface-2 px-4 py-3 text-sm outline-none focus:border-primary"
                  />
                </div>
              </>
            )}
            <div>
              <label className="mono-label text-muted-foreground" htmlFor="email">
                Email
              </label>
              <input
                id="email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 w-full rounded-xl border border-border bg-surface-2 px-4 py-3 text-sm outline-none focus:border-primary"
              />
            </div>
            <div>
              <label className="mono-label text-muted-foreground" htmlFor="password">
                Mot de passe
              </label>
              <input
                id="password"
                type="password"
                required
                minLength={6}
                autoComplete={mode === "signin" ? "current-password" : "new-password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 w-full rounded-xl border border-border bg-surface-2 px-4 py-3 text-sm outline-none focus:border-primary"
              />
            </div>
            {mode === "signup" && (
              <div>
                <label className="mono-label text-muted-foreground" htmlFor="confirmPassword">
                  Confirmer le mot de passe
                </label>
                <input
                  id="confirmPassword"
                  type="password"
                  required
                  minLength={6}
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-border bg-surface-2 px-4 py-3 text-sm outline-none focus:border-primary"
                />
              </div>
            )}
            <button
              type="submit"
              disabled={busy}
              className="w-full rounded-xl bg-primary px-4 py-3 text-xs font-bold uppercase text-primary-foreground disabled:opacity-60"
            >
              {mode === "signin" ? "Se connecter" : "Créer mon compte"}
            </button>
          </form>

          <div className="my-5 flex items-center gap-3">
            <span className="h-px flex-1 bg-border" />
            <span className="mono-label text-muted-foreground">ou</span>
            <span className="h-px flex-1 bg-border" />
          </div>

          <button
            onClick={google}
            disabled={busy}
            className="w-full rounded-xl border border-border bg-surface-2 px-4 py-3 text-xs font-bold uppercase text-foreground disabled:opacity-60"
          >
            Continuer avec Google
          </button>

          <button
            onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
            className="mono-label mt-6 w-full text-center text-muted-foreground hover:text-primary"
          >
            {mode === "signin" ? "Pas encore de compte ? S'inscrire" : "J'ai déjà un compte"}
          </button>

          <button
            onClick={() => setSpace("choice")}
            className="mono-label mt-3 w-full text-center text-muted-foreground hover:text-primary"
          >
            ← Retour au choix de l'espace
          </button>
        </div>

        <Link
          to="/acces-eleve"
          className="mono-label block text-center text-muted-foreground hover:text-primary"
        >
          → Espace élève (QR code)
        </Link>
      </div>
    </main>
  );
}
