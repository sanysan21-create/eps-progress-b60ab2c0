import { createServerFn } from "@tanstack/react-start";

/**
 * Réveille la base de données sans rien attendre en retour.
 *
 * Neon met son calcul en veille après quelques minutes d'inactivité : la
 * première visite qui suit doit alors attendre le redémarrage (5 secondes
 * mesurées). Appelé dès l'ouverture d'une page d'entrée, ce simple aller-retour
 * fait démarrer la base pendant que la personne lit la page, au lieu de le
 * faire attendre au moment où elle clique.
 *
 * Ne renvoie aucune donnée : uniquement un aller-retour minimal.
 */
export const warmDatabase = createServerFn({ method: "POST" })
  .inputValidator((input: { ping?: string }) => input ?? {})
  .handler(async (): Promise<{ ok: true }> => {
    const { db } = await import("./db.server");
    const sql = await db();
    await sql`select 1`;
    return { ok: true };
  });
