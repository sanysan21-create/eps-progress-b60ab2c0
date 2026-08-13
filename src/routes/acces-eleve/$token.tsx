import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Loader2 } from "lucide-react";

import { redeemStudentQr } from "@/lib/student-access.functions";

export const Route = createFileRoute("/acces-eleve/$token")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Connexion élève par QR code — EPS Progress" },
      {
        name: "description",
        content: "Vérification du QR code élève et ouverture de l'espace élève EPS Progress.",
      },
      { property: "og:title", content: "Connexion élève par QR code — EPS Progress" },
      {
        property: "og:description",
        content: "Vérification sécurisée du QR code d'accès à l'espace élève EPS Progress.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: TokenAccessPage,
});

const MESSAGES: Record<string, string> = {
  invalid: "QR code invalide",
  revoked: "Ce QR code n'est plus actif. Demande à ton enseignant de générer un nouveau QR code.",
  unknown: "QR code inconnu",
};

function TokenAccessPage() {
  const { token } = Route.useParams();
  const navigate = useNavigate();
  const redeem = useServerFn(redeemStudentQr);
  const [error, setError] = useState<string | null>(null);
  const done = useRef(false);

  useEffect(() => {
    if (done.current) return;
    done.current = true;
    redeem({ data: { token } })
      .then((result) => {
        if (result.ok) void navigate({ to: "/eleve", replace: true });
        else setError(MESSAGES[result.reason] ?? "QR code invalide");
      })
      .catch(() => setError("Vérification impossible. Réessaie dans un instant."));
  }, [token, redeem, navigate]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-sm space-y-6 text-center">
        <p className="display-title text-4xl italic tracking-tighter text-primary">EPS Progress</p>
        {error ? (
          <div className="rounded-3xl border border-border bg-surface p-6">
            <p className="text-sm text-destructive">{error}</p>
            <Link
              to="/acces-eleve"
              className="mono-label mt-5 inline-block rounded-xl bg-primary px-4 py-3 text-primary-foreground"
            >
              Scanner à nouveau
            </Link>
          </div>
        ) : (
          <div className="rounded-3xl border border-border bg-surface p-10">
            <Loader2 className="mx-auto size-6 animate-spin text-primary" />
            <p className="mono-label mt-3 text-muted-foreground">Vérification de ton QR code…</p>
          </div>
        )}
      </div>
    </main>
  );
}
