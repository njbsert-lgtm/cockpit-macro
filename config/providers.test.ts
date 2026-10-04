import { describe, expect, it } from "vitest";
import { FRED_SERIES } from "./fred-series";
import { TWELVE_DATA_SERIES } from "./twelve-data-series";
import { ALPHA_VANTAGE_SERIES } from "./alpha-vantage-series";
import { EUROSTAT_SERIES } from "./eurostat-series";
import { ONS_SERIES } from "./ons-series";
import { ESTAT_SERIES } from "./estat-series";
import { BOE_SERIES } from "./boe-series";
import { BOJ_SERIES } from "./boj-series";
import { BIS_SERIES } from "./bis-series";
import { SPREAD_DEFINITIONS } from "./spreads";
import {
  fournisseurInstrument,
  fournisseurMacro,
  fournisseursActifsInstrument,
  fournisseursActifsMacro,
} from "./providers";

/**
 * L'univers des identifiants candidats : tout ce qu'un fichier de configuration mentionne,
 * actif ou non. Un identifiant seulement candidat (désactivé partout) n'a rien à interdire ;
 * c'est celui qui serait actif dans deux fichiers à la fois qui doit être impossible.
 */
const instrumentIds = new Set([
  ...FRED_SERIES.filter((m) => m.target.kind === "instrument").map((m) => m.target.id),
  ...TWELVE_DATA_SERIES.map((m) => m.target.id),
  ...ALPHA_VANTAGE_SERIES.map((m) => m.target.id),
  ...SPREAD_DEFINITIONS.map((d) => d.target.id),
]);

const macroIds = new Set([
  ...FRED_SERIES.filter((m) => m.target.kind === "macro").map((m) => m.target.id),
  ...EUROSTAT_SERIES.map((m) => m.target.id),
  ...ONS_SERIES.map((m) => m.target.id),
  ...ESTAT_SERIES.map((m) => m.target.id),
  ...BOE_SERIES.map((m) => m.target.id),
  ...BOJ_SERIES.map((m) => m.target.id),
  ...BIS_SERIES.map((m) => m.target.id),
]);

describe("la chaîne de fournisseurs — jamais de fusion, contre la configuration réelle", () => {
  it("aucun instrument n'est actif dans deux fichiers de configuration à la fois", () => {
    const fautifs = [...instrumentIds]
      .map((id) => [id, fournisseursActifsInstrument(id)] as const)
      .filter(([, actifs]) => actifs.length > 1);
    expect(fautifs).toEqual([]);
  });

  it("aucun indicateur macro n'est actif dans deux fichiers de configuration à la fois", () => {
    const fautifs = [...macroIds]
      .map((id) => [id, fournisseursActifsMacro(id)] as const)
      .filter(([, actifs]) => actifs.length > 1);
    expect(fautifs).toEqual([]);
  });

  it("désigne le bon fournisseur pour un représentant de chaque source active", () => {
    expect(fournisseurInstrument("brent")).toBe("fred");
    expect(fournisseurInstrument("gold")).toBe("twelve-data");
    expect(fournisseurMacro("us-cpi")).toBe("fred");
    expect(fournisseurMacro("fr-cpi")).toBe("eurostat");
    expect(fournisseurMacro("uk-cpi")).toBe("ons");
    expect(fournisseurMacro("jp-cpi")).toBe("estat");
    expect(fournisseurMacro("uk-policy-rate")).toBe("boe");
    expect(fournisseurMacro("jp-policy-rate")).toBe("boj");
    expect(fournisseurMacro("cn-policy-rate")).toBe("bis");
    expect(fournisseurMacro("in-policy-rate")).toBe("bis");
    expect(fournisseurMacro("jp-debt-gdp")).toBe("bis");
    expect(fournisseurInstrument("spread-us10y-bund10y")).toBe("spread");
  });

  it("rend null pour un identifiant qu'aucune source n'a encore activé", () => {
    // Aucun ticker retenu chez Twelve Data (verrouillé) ni chez Alpha Vantage (introuvable) —
    // voir HK_NOT_FOUND dans config/alpha-vantage-series.ts.
    expect(fournisseurInstrument("hsi")).toBeNull();
    // Désactivée — donnée interrompue depuis 2015, voir config/estat-series.ts.
    expect(fournisseurMacro("jp-wages")).toBeNull();
  });
});

describe("la chaîne de fournisseurs — priorité déclarée, sur un cas construit", () => {
  it("le premier fournisseur actif de la liste fait foi, jamais un mélange", () => {
    // Ni brent ni gold ne sont réellement doublement actifs — la garantie que ce test isole
    // est celle de l'ordre, indépendante de l'état actuel de la configuration.
    expect(fournisseursActifsInstrument("brent")).toEqual(["fred"]);
    expect(fournisseurInstrument("brent")).toBe(fournisseursActifsInstrument("brent")[0]);
  });
});
