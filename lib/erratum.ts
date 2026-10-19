import { z } from "zod";

/**
 * L'erratum : une correction ajoutée, jamais une réécriture. Un texte publié et une version de
 * scénario validée ne changent pas ; si un passage renvoie à quelque chose qui n'existe plus
 * (une note retirée à la remise à zéro du corpus, config/suivi.ts), on le dit à côté, daté.
 *
 * Il se déclare dans le frontmatter d'une note ou sur une `ScenarioVersion`, et se valide de la
 * même façon dans les deux cas. Il n'entre ni dans le contrôle des chiffres ni dans le paquet de
 * contexte de rédaction : c'est une mention de lecteur, pas de la matière.
 */
export const erratumSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "date AAAA-MM-JJ attendue"),
  texte: z.string().trim().min(1, "texte d'erratum vide"),
});

export type Erratum = z.infer<typeof erratumSchema>;

/** « 19/10/2026 » — le format de l'intitulé « Erratum du JJ/MM/AAAA ». */
export function dateErratum(iso: string): string {
  return `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`;
}
