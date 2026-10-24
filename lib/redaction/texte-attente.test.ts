import { describe, expect, it } from "vitest";
import { texteDAttente } from "./texte-attente";

describe("texteDAttente", () => {
  it("repère le texte d'attente de la S38", () => {
    expect(texteDAttente("> **Bloc à compléter — il ne peut pas être rédigé pour vous.**")).toBe("Bloc à compléter");
    expect(texteDAttente("Ce bloc ne peut pas être rédigé pour vous.")).toBe("ne peut pas être rédigé pour vous");
  });
  it("laisse passer un bloc non rédigé ou un « rien à signaler »", () => {
    expect(texteDAttente("Bloc non rédigé à la publication.")).toBeNull();
    expect(texteDAttente("Rien de notable cette semaine.")).toBeNull();
  });
});
