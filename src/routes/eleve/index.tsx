import { createFileRoute, redirect } from "@tanstack/react-router";

/**
 * Après le scan du QR code, l'élève arrive directement sur son profil :
 * aucune page intermédiaire n'est affichée.
 */
export const Route = createFileRoute("/eleve/")({
  beforeLoad: () => {
    throw redirect({ to: "/eleve/profil", replace: true });
  },
});
