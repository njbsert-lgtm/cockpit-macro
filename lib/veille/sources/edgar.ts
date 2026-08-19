import { z } from "zod";
import type { RawVeilleCandidate } from "../filter";
import type { VeilleCollectorContext } from "../collect";
import { EDGAR_TRACKED_ISSUERS, type EdgarIssuer } from "@/config/veille-taxonomy";
import { fetchWithTimeout } from "@/lib/http";

// Dépôt réglementaire officiel — même autorité que les flux institutionnels.
const SOURCE_AUTHORITY = 3;
export const EDGAR_SOURCE = "SEC EDGAR";

// Un passage par jour ; large marge pour absorber un cron qui aurait sauté un jour sans pour
// autant faire remonter tout l'historique d'un émetteur à chaque passage.
const RECENT_FILINGS_LOOKBACK_DAYS = 7;

// La SEC exige un User-Agent identifiable pour l'API `data.sec.gov` — voir
// https://www.sec.gov/os/webmaster-faq#developers. À renseigner en variable d'environnement
// avec une adresse de contact réelle avant mise en service.
const USER_AGENT = process.env.SEC_EDGAR_USER_AGENT ?? "Marguerite (contact non renseigné)";

const submissionsSchema = z.object({
  filings: z.object({
    recent: z.object({
      form: z.array(z.string()),
      filingDate: z.array(z.string()),
      accessionNumber: z.array(z.string()),
      primaryDocument: z.array(z.string()),
    }),
  }),
});

function filingUrl(cik: string, accessionNumber: string, primaryDocument: string): string {
  const cikNoLeadingZeros = String(Number(cik));
  const accessionNoDashes = accessionNumber.replace(/-/g, "");
  return `https://www.sec.gov/Archives/edgar/data/${cikNoLeadingZeros}/${accessionNoDashes}/${primaryDocument}`;
}

/** Séparée de l'appel réseau pour être testable sur des charges utiles synthétiques. */
export function parseEdgarSubmissions(
  issuer: EdgarIssuer,
  payload: unknown,
  now: Date,
): RawVeilleCandidate[] {
  const parsed = submissionsSchema.safeParse(payload);
  if (!parsed.success) return [];

  const { form, filingDate, accessionNumber, primaryDocument } = parsed.data.filings.recent;
  const cutoff = new Date(now);
  cutoff.setUTCDate(cutoff.getUTCDate() - RECENT_FILINGS_LOOKBACK_DAYS);

  const candidates: RawVeilleCandidate[] = [];
  for (let i = 0; i < form.length; i += 1) {
    const date = filingDate[i];
    if (!date || new Date(date) < cutoff) continue;

    candidates.push({
      title: `${issuer.name} — dépôt ${form[i]} du ${date}`,
      url: filingUrl(issuer.cik, accessionNumber[i], primaryDocument[i]),
      source: EDGAR_SOURCE,
      sourceAuthority: SOURCE_AUTHORITY,
      publishedAt: new Date(`${date}T00:00:00Z`).toISOString(),
      zones: ["us"],
      // Posé en configuration : un titre de dépôt réglementaire ne contient jamais le mot-clé
      // qui trahirait son driver, mais l'émetteur en est déjà rattaché à un dans la taxonomie.
      driverRefs: issuer.driverRefs,
    });
  }
  return candidates;
}

/** Dépôts SEC EDGAR des grands acheteurs de compute suivis (`EDGAR_TRACKED_ISSUERS`). */
export async function collectEdgar(ctx: VeilleCollectorContext): Promise<{ candidates: RawVeilleCandidate[] }> {
  const candidates: RawVeilleCandidate[] = [];
  const deadline = Date.now() + ctx.budgetMs;

  for (const issuer of EDGAR_TRACKED_ISSUERS) {
    if (Date.now() > deadline) break;

    try {
      const cikPadded = issuer.cik.padStart(10, "0");
      const response = await fetchWithTimeout(`https://data.sec.gov/submissions/CIK${cikPadded}.json`, {
        headers: { Accept: "application/json", "User-Agent": USER_AGENT },
        cache: "no-store",
      });
      if (!response.ok) continue;

      const payload = await response.json();
      candidates.push(...parseEdgarSubmissions(issuer, payload, ctx.now));
    } catch {
      // Un émetteur injoignable n'empêche pas les suivants.
    }
  }

  return { candidates };
}
