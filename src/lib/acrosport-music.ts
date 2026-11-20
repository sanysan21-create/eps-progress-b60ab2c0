import { z } from "zod";

export const musicProposalSchema = z.object({
  title: z.string().trim().min(1, "Renseigne le titre de la musique").max(160),
  url: z.string().trim().max(2000).url("Renseigne un lien internet valide").refine((value) => {
    const url = new URL(value);
    return ["https:", "http:"].includes(url.protocol) && !url.username && !url.password;
  }, "Utilise un lien http ou https sans identifiants"),
});

export type MusicProposal = { id: string; title: string; url: string; author: string; mine: boolean };