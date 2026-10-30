import { z } from "zod";
import type { VeilleChannel } from "@/lib/types";
import type { WeeklyResult } from "@/lib/performance";

/**
 * « Les marchés par driver » — le bloc qui remplace « Ce que j'avais mal lu » à partir de la S45
 * (CLAUDE.md, J1, décidé le 30/10/2026).
 *
 * **La frontière qui compte : le chiffre est écrit par le code, jamais par le modèle.** Sens et
 * ampleur viennent de `weeklyChange` (`lib/performance.ts`), recalculés depuis deux clôtures en
 * base. Le modèle ne propose, par instrument, qu'une *cause* tirée de la fiche — avec l'émetteur
 * nommé — ou `null`, qui s'écrit « Sans lien clair avec ce driver » et qui est préférable à un
 * lien forcé. Ce module porte la forme de ces lignes ; le rendu MDX est plus bas.
 */

export const CANAUX_MARCHES = [
  "taux-reel",
  "nature-choc",
  "fonction-reaction",
  "dollar",
  "positionnement",
] as const satisfies readonly VeilleChannel[];

/** Une ligne : un instrument, et ce qui — dans la fiche — expliquerait son mouvement. */
export const ligneMarcheSchema = z
  .object({
    instrumentId: z.string().min(1),
    cause: z.string().min(1).nullable(),
    emetteur: z.string().min(1).nullable(),
    canal: z.enum(CANAUX_MARCHES).nullable(),
  })
  .superRefine((l, ctx) => {
    if (l.cause !== null && l.emetteur === null) {
      ctx.addIssue({
        code: "custom",
        path: ["emetteur"],
        message: `la cause de « ${l.instrumentId} » n'a pas d'émetteur : une cause sans émetteur nommé n'est pas attribuable`,
      });
    }
    if (l.cause !== null && l.canal === null) {
      ctx.addIssue({
        code: "custom",
        path: ["canal"],
        message: `la cause de « ${l.instrumentId} » ne dit pas par quel canal de transmission elle passe`,
      });
    }
    if (l.cause === null && (l.emetteur !== null || l.canal !== null)) {
      ctx.addIssue({
        code: "custom",
        path: ["cause"],
        message: `« ${l.instrumentId} » : sans cause (« Sans lien clair »), l'émetteur et le canal doivent être null`,
      });
    }
  });

export const marcheDriverSchema = z.object({
  driverId: z.string().min(1),
  lignes: z.array(ligneMarcheSchema),
});

export type LigneMarche = z.infer<typeof ligneMarcheSchema>;
export type MarcheDriver = z.infer<typeof marcheDriverSchema>;

/** Ce que le paquet sait d'un instrument pour ce bloc : sa variation de la semaine, ou pourquoi il n'en a pas. */
export type InstrumentMarche = {
  instrumentId: string;
  label: string;
  /** Telle que `weeklyChange` la renvoie — « non suivi », « donnée absente au JJ/MM » compris. */
  mesure: WeeklyResult;
};

/** Un driver et les instruments qu'il pilote (`Driver.instrumentRefs`), dans cet ordre. */
export type MarcheContexte = {
  driverId: string;
  label: string;
  instruments: InstrumentMarche[];
};

/**
 * Ce que le vivier sait de ce bloc pour confronter la réponse du modèle. `null` pour une note qui
 * n'a pas ce bloc (avant la S45, ou une spéciale) : le modèle n'a alors rien à y mettre.
 */
export type VivierMarches = {
  /** Les instruments de chaque driver : `Driver.instrumentRefs`, rien d'autre. */
  instrumentsParDriver: Map<string, string[]>;
  /** `driverId/instrumentId` pour lesquels `weeklyChange` n'a pas de variation : aucune cause à proposer. */
  sansMesure: Set<string>;
  /** Les seuls émetteurs que la cause peut nommer : ceux que la fiche cite. */
  emetteurs: string[];
};

export const cleLigne = (driverId: string, instrumentId: string): string => `${driverId}/${instrumentId}`;

/**
 * Les invariants d'une réponse du modèle sur ce bloc, appliqués dans le `superRefine` de la
 * réponse entière : un unique message d'échec renvoyé au modèle, une seule réparation.
 * `ordreDrivers` est le `driverOrder` du frontmatter — le bloc ne parle que des drivers de la note.
 */
export function invariantsMarches(
  marches: MarcheDriver[],
  vivier: VivierMarches | null,
  ordreDrivers: string[],
  ctx: z.RefinementCtx,
): void {
  if (vivier === null) {
    if (marches.length > 0) {
      ctx.addIssue({
        code: "custom",
        path: ["marchesParDriver"],
        message: "cette note ne porte pas de bloc « Les marchés par driver » : marchesParDriver doit être vide",
      });
    }
    return;
  }

  const vus = new Set<string>();
  for (const [i, marche] of marches.entries()) {
    const at = (...suite: Array<string | number>) => ["marchesParDriver", i, ...suite];
    if (!vivier.instrumentsParDriver.has(marche.driverId)) {
      ctx.addIssue({
        code: "custom",
        path: at("driverId"),
        message: `driver inconnu « ${marche.driverId} » — drivers du bloc : ${[...vivier.instrumentsParDriver.keys()].join(", ") || "aucun"}`,
      });
      continue;
    }
    if (!ordreDrivers.includes(marche.driverId)) {
      ctx.addIssue({
        code: "custom",
        path: at("driverId"),
        message: `« ${marche.driverId} » n'est pas dans driverOrder : le bloc ne traite que les drivers de la note`,
      });
    }
    if (vus.has(marche.driverId)) {
      ctx.addIssue({ code: "custom", path: at("driverId"), message: `driver « ${marche.driverId} » présent deux fois` });
    }
    vus.add(marche.driverId);

    const attendus = vivier.instrumentsParDriver.get(marche.driverId) ?? [];
    const instrumentsVus = new Set<string>();
    for (const [j, ligne] of marche.lignes.entries()) {
      if (!attendus.includes(ligne.instrumentId)) {
        ctx.addIssue({
          code: "custom",
          path: at("lignes", j, "instrumentId"),
          message:
            `« ${ligne.instrumentId} » n'est pas un instrument piloté par « ${marche.driverId} » ` +
            `(Driver.instrumentRefs : ${attendus.join(", ") || "aucun"}) — le bloc ne traite que ce que le driver pilote`,
        });
        continue;
      }
      if (instrumentsVus.has(ligne.instrumentId)) {
        ctx.addIssue({
          code: "custom",
          path: at("lignes", j, "instrumentId"),
          message: `« ${ligne.instrumentId} » présent deux fois sous « ${marche.driverId} »`,
        });
      }
      instrumentsVus.add(ligne.instrumentId);

      if (ligne.cause !== null && vivier.sansMesure.has(cleLigne(marche.driverId, ligne.instrumentId))) {
        ctx.addIssue({
          code: "custom",
          path: at("lignes", j, "cause"),
          message: `« ${ligne.instrumentId} » n'a pas de variation cette semaine (non suivi ou donnée absente) : il n'y a rien à expliquer, cause null`,
        });
      }
      if (ligne.emetteur !== null && !vivier.emetteurs.includes(ligne.emetteur)) {
        ctx.addIssue({
          code: "custom",
          path: at("lignes", j, "emetteur"),
          message:
            `émetteur « ${ligne.emetteur} » absent de la fiche — une cause ne nomme que les émetteurs que la fiche cite ` +
            `(${vivier.emetteurs.join(", ") || "aucun cette semaine"}) ; sinon la cause est null`,
        });
      }
    }
  }
}

/**
 * Le bloc tel que la note le portera : **une entrée par driver de `driverOrder` qui pilote au moins
 * un instrument, une ligne par instrument**, dans l'ordre de `driverOrder` puis de
 * `Driver.instrumentRefs`. Ce que le modèle n'a pas mentionné est complété par une ligne sans
 * cause — « Sans lien clair » est une réponse admise, et un instrument absent de sa réponse n'a
 * pas à faire échouer un run. Le code reste maître de la liste ; le modèle n'écrit que des causes.
 */
export function normaliserMarches(
  propose: MarcheDriver[],
  instrumentsParDriver: Map<string, string[]>,
  ordreDrivers: string[],
): MarcheDriver[] {
  const proposeParDriver = new Map(propose.map((m) => [m.driverId, m]));
  const resultat: MarcheDriver[] = [];

  for (const driverId of ordreDrivers) {
    const instruments = instrumentsParDriver.get(driverId) ?? [];
    if (instruments.length === 0) continue;
    const lignesProposees = new Map((proposeParDriver.get(driverId)?.lignes ?? []).map((l) => [l.instrumentId, l]));
    resultat.push({
      driverId,
      lignes: instruments.map(
        (instrumentId) =>
          lignesProposees.get(instrumentId) ?? { instrumentId, cause: null, emetteur: null, canal: null },
      ),
    });
  }
  return resultat;
}
