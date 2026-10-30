import { beforeEach, describe, expect, it, vi } from "vitest";

const sauvegarder = vi.fn(async () => ({ ok: true }));
const chargerPortail = vi.fn();

vi.mock("@/lib/auth/session", () => ({ exigerAdminAction: async () => undefined }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/redaction/decisions-store", () => ({
  PREFIXE_REF_LIGNE: "ligne:",
  sauvegarderDecision: (...args: unknown[]) => (sauvegarder as (...a: unknown[]) => unknown)(...args),
}));
vi.mock("@/lib/redaction/portail", () => ({ chargerPortail: (...a: unknown[]) => chargerPortail(...a) }));

import { trancherLigneMarche } from "./actions";

function formulaire(champs: Record<string, string>): FormData {
  const f = new FormData();
  for (const [k, v] of Object.entries(champs)) f.set(k, v);
  return f;
}

beforeEach(() => {
  sauvegarder.mockClear();
  chargerPortail.mockReset();
  chargerPortail.mockResolvedValue({
    brouillonPropose: {
      marchesParDriver: [
        {
          driverId: "iran",
          lignes: [
            { instrumentId: "brent", cause: "Une cause.", emetteur: "Zonebourse", canal: "nature-choc" },
            { instrumentId: "gold", cause: null, emetteur: null, canal: null },
          ],
        },
      ],
    },
    paquet: { ficheNotion: { sources: ["Zonebourse", "Eurostat"] } },
  });
});

describe("trancherLigneMarche — une ligne à la fois", () => {
  it("enregistre la décision sous la clé de la ligne, sans migration (kind bloc, ref ligne:…)", async () => {
    await trancherLigneMarche("2026-S45", "iran/brent", formulaire({ action: "accepter" }));
    expect(sauvegarder).toHaveBeenCalledWith("2026-S45", "bloc", "ligne:iran/brent", { action: "accepter" });
  });

  it("refuse une clé que le modèle n'a pas proposée", async () => {
    await expect(trancherLigneMarche("2026-S45", "iran/bitcoin", formulaire({ action: "accepter" }))).rejects.toThrow(/aucune ligne/);
    expect(sauvegarder).not.toHaveBeenCalled();
  });

  it("refuse une action inconnue : il n'existe aucun geste « tout accepter »", async () => {
    await expect(trancherLigneMarche("2026-S45", "iran/brent", formulaire({ action: "tout-accepter" }))).rejects.toThrow(/action de ligne inconnue/);
  });

  it("une correction exige une cause non vide et un émetteur que la fiche cite", async () => {
    await expect(trancherLigneMarche("2026-S45", "iran/brent", formulaire({ action: "corriger", cause: "" }))).rejects.toThrow(/ne peut pas être vide/);
    await expect(
      trancherLigneMarche("2026-S45", "iran/brent", formulaire({ action: "corriger", cause: "x", emetteur: "Bloomberg" })),
    ).rejects.toThrow(/absent de la fiche/);
    // Une ligne « sans lien clair » corrigée sans émetteur : non attribuable.
    await expect(trancherLigneMarche("2026-S45", "iran/gold", formulaire({ action: "corriger", cause: "x" }))).rejects.toThrow(/nommer son émetteur/);
    expect(sauvegarder).not.toHaveBeenCalled();
  });

  it("une correction valide est enregistrée ; identique à la proposition, elle vaut acceptation", async () => {
    await trancherLigneMarche("2026-S45", "iran/gold", formulaire({ action: "corriger", cause: "Une cause nouvelle.", emetteur: "Eurostat" }));
    expect(sauvegarder).toHaveBeenLastCalledWith("2026-S45", "bloc", "ligne:iran/gold", { action: "corriger", cause: "Une cause nouvelle.", emetteur: "Eurostat" });
    await trancherLigneMarche("2026-S45", "iran/brent", formulaire({ action: "corriger", cause: "Une cause." }));
    expect(sauvegarder).toHaveBeenLastCalledWith("2026-S45", "bloc", "ligne:iran/brent", { action: "accepter" });
  });

  it("« retirer » ne vaut que pour une ligne sans cause proposée ; accepter/refuser que pour une cause proposée", async () => {
    await trancherLigneMarche("2026-S45", "iran/gold", formulaire({ action: "retirer" }));
    expect(sauvegarder).toHaveBeenLastCalledWith("2026-S45", "bloc", "ligne:iran/gold", { action: "retirer" });
    sauvegarder.mockClear();
    await expect(trancherLigneMarche("2026-S45", "iran/brent", formulaire({ action: "retirer" }))).rejects.toThrow(/cause ajoutée à la main/);
    await expect(trancherLigneMarche("2026-S45", "iran/gold", formulaire({ action: "accepter" }))).rejects.toThrow(/aucune cause/);
    await expect(trancherLigneMarche("2026-S45", "iran/gold", formulaire({ action: "refuser" }))).rejects.toThrow(/aucune cause/);
    expect(sauvegarder).not.toHaveBeenCalled();
  });

  it("le canal est corrigeable, validé contre les cinq canaux ; le changer seul est une correction", async () => {
    await expect(
      trancherLigneMarche("2026-S45", "iran/brent", formulaire({ action: "corriger", cause: "Une cause.", canal: "magie" })),
    ).rejects.toThrow(/canal inconnu/);
    expect(sauvegarder).not.toHaveBeenCalled();
    await trancherLigneMarche("2026-S45", "iran/brent", formulaire({ action: "corriger", cause: "Une cause.", canal: "dollar" }));
    expect(sauvegarder).toHaveBeenLastCalledWith("2026-S45", "bloc", "ligne:iran/brent", {
      action: "corriger",
      cause: "Une cause.",
      emetteur: "Zonebourse",
      canal: "dollar",
    });
    // Le canal de la proposition, resaisi à l'identique : toujours une acceptation.
    await trancherLigneMarche("2026-S45", "iran/brent", formulaire({ action: "corriger", cause: "Une cause.", canal: "nature-choc" }));
    expect(sauvegarder).toHaveBeenLastCalledWith("2026-S45", "bloc", "ligne:iran/brent", { action: "accepter" });
  });
});
