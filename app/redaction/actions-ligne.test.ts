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
});
