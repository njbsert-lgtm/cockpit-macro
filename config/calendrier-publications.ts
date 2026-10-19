/**
 * Les prochaines dates de publication des indicateurs de l'onglet Macro, relevées dans les
 * calendriers officiels des émetteurs — jamais déduites d'un rythme supposé.
 *
 * Remplace les `nextRelease` saisis un par un dans `data/seed.json` : une seule date par
 * indicateur, jamais resynchronisée, était dépassée pour presque tous au 19/10/2026, et l'écran
 * affichait « non communiquée » partout. Ici, chaque indicateur porte **toutes** les dates
 * publiées à l'avance par sa source ; la prochaine se lit au rendu (`prochainePublication`), si
 * bien que le calendrier reste juste aussi longtemps que la source a publié loin.
 *
 * Trois règles :
 * - Une date n'entre que si un calendrier officiel la porte, ou, à défaut, deux sources qui
 *   concordent. Rien n'est extrapolé d'une régularité (« le 12 de chaque mois ») : un férié ou
 *   un report rendrait la date fausse sans que rien ne le dise.
 * - Pour un taux directeur, la date est celle de la **décision**, pas celle à laquelle la série
 *   collectée enregistre le changement.
 * - Pour une série redistribuée (BRI, IMF, OCDE, OCDE via FRED), la date est celle de la
 *   publication **primaire** par l'institut national ou la banque centrale : c'est l'événement
 *   que l'on attend. La redistribution suit avec son propre retard, visible sur la date du
 *   dernier relevé.
 *
 * Un indicateur absent, ou dont toutes les dates sont passées, affiche « Prochaine date de
 * publication non communiquée » : c'est la seule réponse honnête quand le calendrier n'est pas
 * publié ou n'a pas été relevé.
 */

export type CalendrierPublication = {
  dates: string[];
  /** Le calendrier d'où viennent les dates, nommé pour pouvoir le rouvrir. */
  source: string;
};

/** Le jour où ce fichier a été confronté aux calendriers officiels. */
export const CALENDRIER_RELEVE_LE = "2026-10-19";

// --- Banques centrales : dates de décision ------------------------------------------------

const FOMC: CalendrierPublication = {
  // federalreserve.gov/monetarypolicy/fomccalendars.htm — 2027 « tentative » jusqu'à la réunion
  // précédente, communiqué du 05/09/2025.
  dates: [
    "2026-10-28", "2026-12-09",
    "2027-01-27", "2027-03-17", "2027-04-28", "2027-06-09",
    "2027-07-28", "2027-09-15", "2027-10-27", "2027-12-08",
  ],
  source: "Fed — calendrier du FOMC",
};

const BCE: CalendrierPublication = {
  // ecb.europa.eu/press/calendars/mgcgc — décision le second jour de chaque réunion.
  dates: [
    "2026-10-29", "2026-12-17",
    "2027-02-04", "2027-03-18", "2027-04-29", "2027-06-10",
    "2027-07-22", "2027-09-09", "2027-10-28", "2027-12-16",
  ],
  source: "BCE — calendrier du Conseil des gouverneurs",
};

const BOE: CalendrierPublication = {
  // bankofengland.co.uk — « MPC dates for 2026 » (09/2025) et « for 2027 » (12/2025).
  dates: [
    "2026-11-05", "2026-12-17",
    "2027-02-04", "2027-03-18", "2027-04-29", "2027-06-17",
    "2027-07-29", "2027-09-16", "2027-11-04", "2027-12-16",
  ],
  source: "Bank of England — dates du MPC",
};

const BOJ: CalendrierPublication = {
  // boj.or.jp — « Scheduled Dates of Monetary Policy Meetings in 2027 » (31/07/2026), PDF lu le
  // 19/10/2026 ; décision le second jour.
  dates: [
    "2026-10-30", "2026-12-18",
    "2027-01-22", "2027-03-18", "2027-04-28", "2027-06-11",
    "2027-07-22", "2027-09-22", "2027-10-29", "2027-12-17",
  ],
  source: "Bank of Japan — réunions de politique monétaire",
};

const RBI: CalendrierPublication = {
  // rbi.org.in — calendrier du MPC 2026-27 (23/03/2026) ; décision le dernier jour.
  dates: ["2026-12-04", "2027-02-05"],
  source: "Reserve Bank of India — calendrier du MPC 2026-27",
};

const LPR: CalendrierPublication = {
  // PBOC — le LPR est publié le 20 de chaque mois, reporté au jour ouvré suivant. Seules les
  // dates dont le jour ouvré a été vérifié sont écrites.
  dates: ["2026-10-20", "2026-11-20", "2026-12-21"],
  source: "Banque populaire de Chine — fixation du LPR",
};

// --- États-Unis : calendrier FRED (release/dates), relevé le 19/10/2026 ---------------------

const BLS_CPI: CalendrierPublication = {
  dates: ["2026-11-10", "2026-12-10"],
  source: "BLS — Consumer Price Index (FRED, release 10)",
};

const BLS_EMPLOI: CalendrierPublication = {
  dates: ["2026-11-06", "2026-12-04"],
  source: "BLS — Employment Situation (FRED, release 50)",
};

const BEA_PIB: CalendrierPublication = {
  dates: ["2026-10-29", "2026-11-25", "2026-12-23"],
  source: "BEA — Gross Domestic Product (FRED, release 53)",
};

const FRED_DETTE: CalendrierPublication = {
  dates: ["2026-10-29", "2026-11-25", "2026-12-23"],
  source: "FRED — Debt to Gross Domestic Product Ratios (release 263)",
};

// --- Zone euro : communiqués « euro indicators » d'Eurostat --------------------------------

const EUROSTAT_IPCH: CalendrierPublication = {
  // Communiqué du 16/10/2026 : « next release 18 November 2026 » (données complètes d'octobre).
  dates: ["2026-11-18"],
  source: "Eurostat — IPCH, données complètes",
};

const EUROSTAT_CHOMAGE: CalendrierPublication = {
  // Communiqué du 01/10/2026 : « next release 30 October 2026 ».
  dates: ["2026-10-30"],
  source: "Eurostat — chômage",
};

const EUROSTAT_PIB_ZONE: CalendrierPublication = {
  dates: ["2026-10-30", "2026-11-13"],
  source: "Eurostat — PIB, estimation préliminaire puis flash à t+45",
};

const EUROSTAT_PIB_PAYS: CalendrierPublication = {
  // Communiqué du 14/08/2026 : prochain flash PIB et emploi le 13/11/2026, avec les pays.
  dates: ["2026-11-13"],
  source: "Eurostat — PIB et emploi, flash à t+45",
};

const EUROSTAT_FINANCES_PUBLIQUES: CalendrierPublication = {
  // Communiqués du 22/04 et du 21/07/2026 : « next release 21 October 2026 », dette et déficit.
  dates: ["2026-10-21"],
  source: "Eurostat — dette et déficit trimestriels",
};

// --- Royaume-Uni : ONS --------------------------------------------------------------------

const ONS_IPC: CalendrierPublication = {
  // ons.gov.uk/releasecalendar, « Consumer price inflation, UK », relevé le 19/10/2026.
  dates: [
    "2026-10-21", "2026-11-18", "2026-12-16",
    "2027-01-20", "2027-02-17", "2027-03-24", "2027-04-21", "2027-05-19",
  ],
  source: "ONS — Consumer price inflation",
};

const ONS_EMPLOI: CalendrierPublication = {
  // ons.gov.uk/releasecalendar, « Labour market overview, UK », relevé le 19/10/2026 — le
  // 20/10 concorde avec `description.nextRelease` de MGSX et KAC3 dans l'API.
  dates: [
    "2026-10-20", "2026-11-17", "2026-12-15",
    "2027-01-19", "2027-02-16", "2027-03-16", "2027-04-20", "2027-05-18",
    "2027-06-15", "2027-07-20", "2027-08-17", "2027-09-14", "2027-10-19",
  ],
  source: "ONS — Labour market overview",
};

const ONS_PIB: CalendrierPublication = {
  // Bibliothèque de la Chambre des communes, « Economic Indicators » du 30/09/2026.
  dates: ["2026-11-12", "2026-12-22"],
  source: "ONS — GDP first quarterly estimate, puis quarterly national accounts",
};

// --- Japon --------------------------------------------------------------------------------

const JAPON_IPC: CalendrierPublication = {
  // stat.go.jp/english/data/cpi/1582.html — IPC national.
  dates: ["2026-10-23", "2026-11-20"],
  source: "Statistics Bureau of Japan — IPC",
};

const JAPON_CHOMAGE: CalendrierPublication = {
  // stat.go.jp/english/data/roudou/1543.html — Labour Force Survey, tabulation de base.
  dates: ["2026-10-30", "2026-12-01"],
  source: "Statistics Bureau of Japan — Labour Force Survey",
};

const JAPON_PIB: CalendrierPublication = {
  // esri.cao.go.jp — première puis seconde estimation préliminaire du T3 2026.
  dates: ["2026-11-16", "2026-12-08"],
  source: "Cabinet Office (ESRI) — PIB trimestriel",
};

// --- Chine et Inde --------------------------------------------------------------------------

const CHINE_PIB: CalendrierPublication = {
  // Calendrier 2026 du NBS et publications annoncées pour 2027.
  dates: ["2026-10-19", "2027-01-18", "2027-04-16"],
  source: "NBS — National Economic Performance",
};

const CHINE_IPC: CalendrierPublication = {
  dates: ["2026-11-09"],
  source: "NBS — Consumer Price Index",
};

const INDE_IPC: CalendrierPublication = {
  // mospi.gov.in — Advance Release Calendar 2026-27 (version du 25/05/2026).
  dates: ["2026-11-12", "2026-12-12", "2027-01-12", "2027-02-12", "2027-03-12"],
  source: "MoSPI — All India CPI",
};

const INDE_PIB: CalendrierPublication = {
  dates: ["2026-11-30"],
  source: "MoSPI — estimations trimestrielles du PIB",
};

export const CALENDRIER_PUBLICATIONS: Record<string, CalendrierPublication> = {
  "us-policy-rate": FOMC,
  "us-policy-rate-lower": FOMC,
  "us-cpi": BLS_CPI,
  "us-cpi-core": BLS_CPI,
  "us-unemployment": BLS_EMPLOI,
  "us-wages": BLS_EMPLOI,
  "us-gdp": BEA_PIB,
  "us-debt-gdp": FRED_DETTE,
  "us-budget-balance": FRED_DETTE,

  "ez-policy-rate": BCE,
  "ez-cpi": EUROSTAT_IPCH,
  "ez-cpi-core": EUROSTAT_IPCH,
  "ez-unemployment": EUROSTAT_CHOMAGE,
  "ez-gdp": EUROSTAT_PIB_ZONE,
  "ez-debt-gdp": EUROSTAT_FINANCES_PUBLIQUES,
  "ez-budget-balance": EUROSTAT_FINANCES_PUBLIQUES,

  "fr-cpi": EUROSTAT_IPCH,
  "fr-cpi-core": EUROSTAT_IPCH,
  "fr-unemployment": EUROSTAT_CHOMAGE,
  "fr-gdp": EUROSTAT_PIB_PAYS,
  "fr-debt-gdp": EUROSTAT_FINANCES_PUBLIQUES,
  "fr-budget-balance": EUROSTAT_FINANCES_PUBLIQUES,

  "de-cpi": EUROSTAT_IPCH,
  "de-cpi-core": EUROSTAT_IPCH,
  "de-unemployment": EUROSTAT_CHOMAGE,
  "de-gdp": EUROSTAT_PIB_PAYS,

  "es-cpi": EUROSTAT_IPCH,
  "es-cpi-core": EUROSTAT_IPCH,
  "es-unemployment": EUROSTAT_CHOMAGE,
  "es-gdp": EUROSTAT_PIB_PAYS,

  "it-cpi": EUROSTAT_IPCH,
  "it-cpi-core": EUROSTAT_IPCH,
  "it-unemployment": EUROSTAT_CHOMAGE,
  "it-gdp": EUROSTAT_PIB_PAYS,
  "it-debt-gdp": EUROSTAT_FINANCES_PUBLIQUES,

  "uk-policy-rate": BOE,
  "uk-cpi": ONS_IPC,
  "uk-cpi-core": ONS_IPC,
  "uk-unemployment": ONS_EMPLOI,
  "uk-wages": ONS_EMPLOI,
  "uk-gdp": ONS_PIB,

  "jp-policy-rate": BOJ,
  "jp-cpi": JAPON_IPC,
  "jp-cpi-core": JAPON_IPC,
  "jp-unemployment": JAPON_CHOMAGE,
  "jp-gdp": JAPON_PIB,

  "cn-policy-rate": LPR,
  "cn-gdp": CHINE_PIB,
  "cn-cpi": CHINE_IPC,

  "in-policy-rate": RBI,
  "in-cpi": INDE_IPC,
  "in-gdp": INDE_PIB,
};

/**
 * La première date de publication à venir — aujourd'hui compris, puisque la donnée du jour
 * n'est pas encore là au moment où on la consulte le matin —, ou `null`.
 */
export function prochainePublication(
  indicatorId: string,
  today: string = new Date().toISOString().slice(0, 10),
): string | null {
  const calendrier = CALENDRIER_PUBLICATIONS[indicatorId];
  if (!calendrier) return null;
  return [...calendrier.dates].sort().find((d) => d >= today) ?? null;
}
