import type { VeilleChannel, Zone } from "@/lib/types";

/**
 * Ce que la passe 1 sait reconnaître sans intelligence artificielle : des mots-clés et des
 * entités. Un item qui ne matche ni un driver ni un canal est écarté avant même d'être
 * écrit — c'est ce qui rend une couverture large (GDELT, tout le flux institutionnel)
 * tenable sans passe 2.
 *
 * Vérification requise avant mise en service — voir la note en bas de fichier : les URLs de
 * flux et les mécaniques d'API tierces (codes pays GDELT, CIK EDGAR) n'ont pas pu être
 * confrontées à un appel réseau réel depuis cet environnement, comme pour `fred-series.ts`
 * en son temps. Un passage à blanc s'impose avant d'activer la collecte.
 */

// ---------------------------------------------------------------------------
// Mots-clés par driver — la même logique que `content/drivers.ts`, mais pour la détection,
// pas pour l'affichage. Un item qui cite un de ces termes est rattaché au driver.
// ---------------------------------------------------------------------------

export const DRIVER_KEYWORDS: Record<string, string[]> = {
  rates: [
    "Fed",
    "FOMC",
    "Federal Reserve",
    "Powell",
    "Fed funds",
    "fed funds rate",
    "taux directeur",
    "banque centrale",
    "BCE",
    "ECB",
    "Lagarde",
    "taux d'intérêt",
    "interest rate",
    "rate hike",
    "rate cut",
    "hausse de taux",
    "baisse de taux",
  ],
  iran: [
    "Iran",
    "Ormuz",
    "Hormuz",
    "détroit d'Hormuz",
    "Strait of Hormuz",
    "pétrolier",
    "tanker",
    "oil tanker",
    "sanctions iraniennes",
    "Iran sanctions",
    "Téhéran",
    "Tehran",
    "Revolutionary Guard",
    "IRGC",
    "Gardiens de la révolution",
    "Ormuz blockade",
    "blocus d'Ormuz",
  ],
  ai: [
    "intelligence artificielle",
    "artificial intelligence",
    "Nvidia",
    "capex",
    "data center",
    "datacenter",
    "centre de données",
    "hyperscaler",
    "compute",
    "GPU",
    "Microsoft Azure",
    "AWS",
    "Amazon Web Services",
    "Google Cloud",
    "OpenAI",
    "Anthropic",
    "AI chip",
    "puce IA",
  ],
};

// ---------------------------------------------------------------------------
// Mots-clés par canal de transmission — la grille des cinq canaux du cahier des charges,
// pour rattacher un item même quand aucun driver ne matche : une note sur le positionnement
// spéculatif sur le pétrole est pertinente sans citer « Iran ».
// ---------------------------------------------------------------------------

export const CHANNEL_KEYWORDS: Record<VeilleChannel, string[]> = {
  "taux-reel": ["real yield", "taux réel", "TIPS", "breakeven", "point mort d'inflation", "real rate"],
  "nature-choc": [
    "supply shock",
    "choc d'offre",
    "demand shock",
    "choc de demande",
    "embargo",
    "blockade",
    "blocus",
    "production cut",
    "réduction de production",
    "supply disruption",
  ],
  "fonction-reaction": [
    "dot plot",
    "forward guidance",
    "biais",
    "hawkish",
    "dovish",
    "réunion de politique monétaire",
    "policy meeting",
    "FOMC minutes",
    "compte-rendu",
  ],
  dollar: ["dollar index", "DXY", "devise refuge", "safe haven currency", "flux de capitaux", "capital flows"],
  positionnement: [
    "positioning",
    "positionnement",
    "CFTC",
    "commitment of traders",
    "flux vendeurs",
    "flux acheteurs",
    "short covering",
    "net long",
    "net short",
  ],
};

// ---------------------------------------------------------------------------
// Flux institutionnels — banques centrales, statistiques, énergie, institutions, entreprises.
// Un parseur RSS/Atom générique (lib/veille/sources/institutional.ts) les traite tous de la
// même façon ; seule cette liste distingue les sources entre elles.
// ---------------------------------------------------------------------------

export type InstitutionalFeed = {
  name: string;
  url: string;
  zones: Zone[];
};

export const INSTITUTIONAL_FEEDS: InstitutionalFeed[] = [
  // Banques centrales
  { name: "Federal Reserve", url: "https://www.federalreserve.gov/feeds/press_all.xml", zones: ["us"] },
  { name: "BCE", url: "https://www.ecb.europa.eu/rss/press.html", zones: ["ez"] },
  { name: "Bank of England", url: "https://www.bankofengland.co.uk/rss/news", zones: ["uk"] },
  { name: "Banque de France", url: "https://www.banque-france.fr/en/rss.xml", zones: ["fr", "ez"] },
  // Statistiques (celles qui publient un flux RSS de communiqués, pas l'API de données déjà
  // couverte par FRED/ECB Data Portal)
  { name: "BLS", url: "https://www.bls.gov/feed/bls_latest.rss", zones: ["us"] },
  { name: "Eurostat", url: "https://ec.europa.eu/eurostat/web/main/news/euro-indicators/rss", zones: ["ez"] },
  { name: "ONS", url: "https://www.ons.gov.uk/releases/rss", zones: ["uk"] },
  // Énergie
  { name: "EIA", url: "https://www.eia.gov/rss/todayinenergy.xml", zones: ["global"] },
  { name: "OPEP", url: "https://www.opec.org/opec_web/en/press_room/rss.xml", zones: ["global"] },
  // Institutions
  { name: "FMI", url: "https://www.imf.org/en/News/rss?language=eng", zones: ["global"] },
  { name: "OCDE", url: "https://www.oecd.org/en/about/news.rss.xml", zones: ["global"] },
  { name: "BRI", url: "https://www.bis.org/doclist/press_releases.rss", zones: ["global"] },
  // Flux institutionnels géopolitiques
  { name: "Conseil européen", url: "https://www.consilium.europa.eu/en/press/press-releases/rss/", zones: ["ez"] },
  { name: "Commission européenne", url: "https://ec.europa.eu/commission/presscorner/api/rss", zones: ["ez"] },
  { name: "ONU", url: "https://news.un.org/feed/subscribe/en/news/all/rss.xml", zones: ["global"] },
  { name: "AIEA", url: "https://www.iaea.org/feeds/topnews", zones: ["global"] },
  { name: "US State Department", url: "https://www.state.gov/rss-feeds/press-releases/feed/", zones: ["us"] },
];

// ---------------------------------------------------------------------------
// GDELT — détection large. Le DOC 2.0 API prend une requête booléenne en texte libre, pas un
// code de thème structuré : on approxime « conflit, énergie, sanctions, commerce » par des
// groupes de mots-clés, croisés avec les pays suivis.
// ---------------------------------------------------------------------------

export type GdeltThemeKey = "conflict" | "energy" | "sanctions" | "trade";

export const GDELT_THEME_QUERIES: Record<GdeltThemeKey, string> = {
  conflict: "(conflict OR war OR military OR strike OR attack OR clash)",
  energy: "(oil OR gas OR pipeline OR OPEC OR energy supply OR refinery)",
  sanctions: "(sanctions OR embargo OR export control OR asset freeze)",
  trade: "(tariff OR \"trade war\" OR \"export ban\" OR \"import restriction\")",
};

/**
 * Pays suivis, en code source GDELT (FIPS 10-4 — diffère de l'ISO sur plusieurs entrées,
 * notamment la Chine). **À vérifier contre la table de codes GDELT avant mise en service** :
 * source du doute exposée en tête de fichier.
 */
export type GdeltCountry = { fips: string; zone: Zone; label: string };

export const GDELT_TRACKED_COUNTRIES: GdeltCountry[] = [
  { fips: "US", zone: "us", label: "États-Unis" },
  { fips: "IR", zone: "global", label: "Iran" },
  { fips: "CH", zone: "cn", label: "Chine" }, // FIPS : CH = Chine, pas la Suisse (ISO le voudrait)
  { fips: "UK", zone: "uk", label: "Royaume-Uni" },
  { fips: "FR", zone: "fr", label: "France" },
  { fips: "GM", zone: "de", label: "Allemagne" }, // FIPS : GM, pas DE
  { fips: "SA", zone: "global", label: "Arabie saoudite" },
  { fips: "IZ", zone: "global", label: "Irak" }, // FIPS : IZ, pas IQ
];

/** Le produit cartésien thème × pays : l'unité de travail d'un passage de collecte GDELT. */
export type GdeltQuery = { theme: GdeltThemeKey; country: GdeltCountry };

export function buildGdeltQueries(): GdeltQuery[] {
  const themes = Object.keys(GDELT_THEME_QUERIES) as GdeltThemeKey[];
  return themes.flatMap((theme) =>
    GDELT_TRACKED_COUNTRIES.map((country) => ({ theme, country })),
  );
}

// ---------------------------------------------------------------------------
// SEC EDGAR — dépôts et communiqués des grands acheteurs de compute. CIK stables et publics,
// mais recopiés de mémoire : à confronter à https://www.sec.gov/cgi-bin/browse-edgar avant
// mise en service, même prudence que pour les codes GDELT ci-dessus.
// ---------------------------------------------------------------------------

export type EdgarIssuer = { name: string; cik: string; driverRefs: string[] };

export const EDGAR_TRACKED_ISSUERS: EdgarIssuer[] = [
  { name: "Microsoft", cik: "0000789019", driverRefs: ["ai"] },
  { name: "Amazon", cik: "0001018724", driverRefs: ["ai"] },
  { name: "Alphabet", cik: "0001652044", driverRefs: ["ai"] },
  { name: "Meta Platforms", cik: "0001326801", driverRefs: ["ai"] },
  { name: "Nvidia", cik: "0001045810", driverRefs: ["ai"] },
  { name: "Oracle", cik: "0001341439", driverRefs: ["ai"] },
];
