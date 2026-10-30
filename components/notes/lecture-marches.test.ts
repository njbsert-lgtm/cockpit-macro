import { describe, expect, it } from "vitest";
import { compileMDX } from "next-mdx-remote/rsc";
import { rendreBlocMarches } from "@/lib/redaction/marches-rendu";
import type { MarcheContexte, MarcheDriver } from "@/lib/redaction/marches";
import { lireBlocMarches } from "./lecture-marches";

/**
 * Le contrat entre `rendreBlocMarches` (le code écrit le bloc) et le tableau qui le relit : si le
 * format de la ligne change d'un côté, ce test casse avant que la note ne s'affiche en liste.
 */

const ok = (id: string, value: number, unit: "bps" | "pct") => ({
  instrumentId: id,
  status: "ok" as const,
  value,
  unit,
  fromDate: "2026-10-30",
  fromValue: 1,
  toDate: "2026-11-06",
  toValue: 2,
});

const CONTEXTE: MarcheContexte[] = [
  {
    driverId: "rates",
    label: "Taux directeurs",
    instruments: [
      { instrumentId: "us10y", label: "US 10 ans", mesure: ok("us10y", 12.4, "bps") },
      { instrumentId: "spx", label: "S&P 500", mesure: ok("spx", -2.34, "pct") },
      { instrumentId: "eurusd", label: "EUR/USD", mesure: ok("eurusd", 0, "pct") },
      { instrumentId: "gold", label: "Or", mesure: { instrumentId: "gold", status: "indisponible", reason: "donnee-absente", message: "donnée absente au 30/10" } },
      { instrumentId: "cuivre", label: "Cuivre", mesure: { instrumentId: "cuivre", status: "indisponible", reason: "non-suivi", message: "non suivi" } },
    ],
  },
];

const MARCHES: MarcheDriver[] = [
  {
    driverId: "rates",
    lignes: [
      { instrumentId: "us10y", cause: "Les rendements longs remontent après le discours de la Fed.", emetteur: "Zonebourse", canal: "taux-reel" },
      { instrumentId: "spx", cause: null, emetteur: null, canal: null },
      { instrumentId: "eurusd", cause: null, emetteur: null, canal: null },
      { instrumentId: "gold", cause: null, emetteur: null, canal: null },
      { instrumentId: "cuivre", cause: null, emetteur: null, canal: null },
    ],
  },
];

async function relire(source: string) {
  const { content } = await compileMDX({ source, options: { parseFrontmatter: false } });
  // `content` est l'élément `<MDXContent />` : on l'évalue pour obtenir les nœuds que le composant
  // du bloc recevrait en `children` (balises natives, sans surcharge de composants).
  const el = content as unknown as { type: (p: unknown) => { props: { children?: unknown } }; props: unknown };
  return lireBlocMarches(el.type(el.props).props.children as never);
}

describe("lireBlocMarches", () => {
  it("relit ce que rendreBlocMarches écrit : signe, deux dates, cause attribuée, aveu, non suivi", async () => {
    const groupes = await relire(rendreBlocMarches(MARCHES, CONTEXTE));
    expect(groupes).not.toBeNull();
    const [g] = groupes!;
    expect(g.titre).toBe("Taux directeurs");
    expect(g.lignes.map((l) => l.libelle)).toEqual(["US 10 ans", "S&P 500", "EUR/USD", "Or", "Cuivre"]);

    const [us, spx, eur, or, cuivre] = g.lignes;
    expect(us.mouvement).toEqual({ etat: "ok", texte: "+12 bps", sens: "hausse", du: "30/10", au: "06/11" });
    expect(us.cause).toBe("Les rendements longs remontent après le discours de la Fed");
    expect(us.emetteur).toBe("Zonebourse");
    expect(spx.mouvement).toMatchObject({ etat: "ok", texte: "−2,3 %", sens: "baisse" });
    expect(spx.cause).toBeNull();
    expect(eur.mouvement).toMatchObject({ etat: "ok", sens: "plat" });
    expect(or.mouvement).toEqual({ etat: "indisponible", message: "donnée absente au 30/10" });
    expect(cuivre.mouvement).toEqual({ etat: "indisponible", message: "non suivi" });
  });

  it("une forme inconnue fait revenir le bloc en liste plutôt que de tronquer une ligne", async () => {
    expect(await relire("### Taux\n\n- **US 10 ans** : une phrase libre.")).toBeNull();
    expect(await relire("Aucun instrument collecté ne pilote les drivers de cette note.")).toBeNull();
  });
});
