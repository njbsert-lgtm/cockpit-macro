import { describe, expect, it } from "vitest";
import { AJUSTEMENTS_THEMES } from "./themes";
import { getThemes } from "@/lib/themes-content";
import { etatTheme, validerPlafond, validerTheme } from "@/lib/themes";
import { getInstruments } from "@/lib/data";
import { fournisseurInstrument } from "@/config/providers";

/**
 * Le corpus réel des thèmes. La validation vit ici et non au chargement du module : un thème
 * fautif ne doit jamais mettre le site entier à terre, mais il doit faire échouer ce test.
 */
describe("thèmes sous observation — le corpus réel", () => {
  const themes = getThemes();
  const catalogue = new Set(getInstruments().map((i) => i.id));
  const collecte = (id: string) => fournisseurInstrument(id) !== null;
  const aujourdhui = new Date().toISOString().slice(0, 10);

  it("chaque thème passe les règles dures", () => {
    const erreurs = themes.flatMap((t) => validerTheme(t, catalogue));
    expect(erreurs).toEqual([]);
  });

  it("des identifiants uniques", () => {
    expect(new Set(themes.map((t) => t.id)).size).toBe(themes.length);
  });

  it("le plafond de thèmes observés est tenu", () => {
    expect(validerPlafond(themes, collecte, aujourdhui)).toEqual([]);
  });

  it("aucun ajustement ne vise un thème qui n'existe pas", () => {
    const ids = new Set(themes.map((t) => t.id));
    for (const id of Object.keys(AJUSTEMENTS_THEMES)) expect(ids.has(id), id).toBe(true);
  });

  it("le statut effectif se calcule sans lever", () => {
    for (const t of themes) expect(() => etatTheme(t, collecte, aujourdhui)).not.toThrow();
  });
});
