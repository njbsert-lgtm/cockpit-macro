import { EDGAR_TRACKED_ISSUERS, type EdgarIssuer } from "@/config/veille-taxonomy";

/**
 * Les dix premières capitalisations mondiales, dont les résultats sont un déclencheur de note
 * spéciale (décision de Nicolas du 30/10/2026, J5.7).
 *
 * ⚠︎ **Vide à dessein.** La liste et les rangs sont des affirmations sur le monde, qui changent :
 * ils se relèvent à la main depuis un classement public consulté et daté (`CLASSEMENT_SOURCE`),
 * jamais de mémoire. Même règle que `config/calendrier-drivers.ts`. Tant que la source est
 * absente, la liste reste vide et rien d'aval ne change.
 *
 * Révision : chaque trimestre. `controlerEmetteursMajeurs` signale une liste de plus de 100 jours.
 */

/** Où se publient les résultats : dépôts SEC EDGAR (8-K, 10-Q, 10-K) ou communiqué de l'émetteur. */
export type CanalResultats = "edgar" | "communique";

export type EmetteurMajeur = {
  rang: number; // 1..10, tel que lu dans le classement sourcé
  nom: string;
  pays: string;
  ticker: string;
  /** CIK relevé sur sec.gov, 10 chiffres ; null pour un émetteur hors EDGAR. Jamais deviné. */
  cik: string | null;
  canal: CanalResultats;
};

export type ClassementSource = {
  libelle: string;
  url: string;
  /** Date de consultation du classement, AAAA-MM-JJ. */
  date: string;
};

/** Le classement qui justifie la liste. Null tant que rien n'a été réellement consulté. */
export const CLASSEMENT_SOURCE: ClassementSource | null = null;

export const EMETTEURS_MAJEURS: EmetteurMajeur[] = [];

/** Au-delà, la liste est tenue pour périmée : un classement de capitalisation bouge. */
export const AGE_MAX_LISTE_JOURS = 100;

const JOUR_MS = 86_400_000;

export type ControleEmetteurs = { erreurs: string[]; avertissements: string[] };

/**
 * Contrôle d'intégrité. Erreurs : liste non vide sans source datée valide, doublon (rang, ticker,
 * CIK), canal incohérent avec le CIK. Avertissement : source de plus de 100 jours.
 * Une liste vide sans source est légitime (état actuel).
 */
export function controlerEmetteursMajeurs(
  liste: EmetteurMajeur[],
  source: ClassementSource | null,
  aujourdhui: string,
): ControleEmetteurs {
  const erreurs: string[] = [];
  const avertissements: string[] = [];

  if (liste.length > 0) {
    if (!source) {
      erreurs.push("liste non vide sans classement source (libellé, URL, date)");
    } else {
      if (!source.libelle.trim()) erreurs.push("classement source sans libellé");
      if (!/^https?:\/\/\S+$/.test(source.url)) erreurs.push("classement source sans URL valide");
      const t = Date.parse(source.date);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(source.date) || Number.isNaN(t)) {
        erreurs.push("classement source sans date valide (AAAA-MM-JJ)");
      } else {
        const age = Math.floor((Date.parse(aujourdhui) - t) / JOUR_MS);
        if (age < 0) erreurs.push("date du classement dans le futur");
        else if (age > AGE_MAX_LISTE_JOURS) {
          avertissements.push(
            `classement vieux de ${age} jours (> ${AGE_MAX_LISTE_JOURS}) : à réviser chaque trimestre`,
          );
        }
      }
    }
  }
  if (liste.length > 10) erreurs.push("plus de dix émetteurs");

  const vus = { rang: new Set<number>(), ticker: new Set<string>(), cik: new Set<string>() };
  for (const e of liste) {
    if (!Number.isInteger(e.rang) || e.rang < 1 || e.rang > 10) {
      erreurs.push(`${e.nom} : rang ${e.rang} hors 1..10`);
    }
    if (vus.rang.has(e.rang)) erreurs.push(`rang en double : ${e.rang}`);
    vus.rang.add(e.rang);
    const tk = e.ticker.toUpperCase();
    if (vus.ticker.has(tk)) erreurs.push(`ticker en double : ${e.ticker}`);
    vus.ticker.add(tk);
    if (e.cik !== null) {
      if (!/^\d{10}$/.test(e.cik)) erreurs.push(`${e.nom} : CIK invalide (10 chiffres attendus)`);
      if (vus.cik.has(e.cik)) erreurs.push(`CIK en double : ${e.cik}`);
      vus.cik.add(e.cik);
    }
    if (e.canal === "edgar" && e.cik === null) {
      erreurs.push(`${e.nom} : canal EDGAR sans CIK`);
    }
  }
  return { erreurs, avertissements };
}

export type SuiviEmetteurs = {
  /** Soumis à EDGAR, CIK connu, pas encore suivis, et rattachables : prêts à être ajoutés. */
  aAjouter: EdgarIssuer[];
  /** Soumis à EDGAR mais sans driver évident : à rattacher par Nicolas, jamais au hasard. */
  sansDriver: EmetteurMajeur[];
  /** Hors EDGAR : demandent une source de communiqués (non construite). */
  besoinCommunique: EmetteurMajeur[];
  /** Déjà dans `EDGAR_TRACKED_ISSUERS`. */
  dejaSuivis: EmetteurMajeur[];
};

/**
 * Prépare le suivi sans rien écrire. `driversParTicker` est la décision explicite d'un humain ;
 * un émetteur absent de cette table n'est rattaché à aucun driver (la passe 1 en exige un).
 */
export function preparerSuivi(
  liste: EmetteurMajeur[],
  driversParTicker: Record<string, string[]> = {},
  suivis: EdgarIssuer[] = EDGAR_TRACKED_ISSUERS,
): SuiviEmetteurs {
  const out: SuiviEmetteurs = { aAjouter: [], sansDriver: [], besoinCommunique: [], dejaSuivis: [] };
  const ciks = new Set(suivis.map((s) => s.cik));
  for (const e of liste) {
    if (e.canal !== "edgar" || e.cik === null) out.besoinCommunique.push(e);
    else if (ciks.has(e.cik)) out.dejaSuivis.push(e);
    else {
      const drivers = driversParTicker[e.ticker] ?? [];
      if (drivers.length === 0) out.sansDriver.push(e);
      else out.aAjouter.push({ name: e.nom, cik: e.cik, driverRefs: drivers });
    }
  }
  return out;
}
