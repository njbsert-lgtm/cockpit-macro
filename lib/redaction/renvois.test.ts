import { describe, expect, it } from "vitest";
import { renvoiAUneNoteRetiree } from "./renvois";

describe("renvoiAUneNoteRetiree", () => {
  it.each([
    ["La chaîne, posée dès la note d'août, s'est vérifiée.", "note d'août"],
    ["Comme dans notre note de juillet.", "note de juillet"],
    ["La note précédente du 13 août décrivait le régime.", "note précédente du 13 août"],
    ["La note du 1er juillet le disait déjà.", "note du 1er juillet"],
    ["Voir 2026-S32 pour le détail.", "2026-S32"],
    ["Voir la S28 pour le détail.", "S28"],
    ["Repris de 2026-S28-E1.", "2026-S28-E1"],
  ])("repère un renvoi à une note retirée : %s", (texte, attendu) => {
    expect(renvoiAUneNoteRetiree(texte)).toBe(attendu);
  });

  it.each([
    "Deuxième hausse depuis juin, la Fed relève ses taux.",
    "Le PMI est au plus haut depuis juillet 2021.",
    "Selon une note de Goldman Sachs publiée en août, l'excédent arrive.",
    "La note précédente, celle de la S42, posait la question.",
    "Comme le disait la note de septembre.",
    "Voir 2026-S38 et la S42.",
    "Le S&P 500 et le CAC 40.",
  ])("laisse passer : %s", (texte) => {
    expect(renvoiAUneNoteRetiree(texte)).toBeNull();
  });
});
