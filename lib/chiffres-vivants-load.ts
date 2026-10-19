import type { Note } from "./types";
import { getInstrument, getInstruments, getMacroIndicator } from "./data";
import { loadMacroObservations, loadObservations, observationsOf } from "./observations";
import { construireChiffre, resoudreCible, type ChiffreVivant } from "./chiffres-vivants";
import { mappingForInstrument, mappingForMacro } from "@/config/fred-series";

/** « FRED · DGS10 » quand la série FRED est connue, le nom de la source sinon. */
function libelleSource(kind: "macro" | "instrument", id: string, source: string | undefined): string | null {
  const fred = kind === "instrument" ? mappingForInstrument(id) : mappingForMacro(id);
  if (fred) return `FRED · ${fred.seriesId}`;
  return source ?? null;
}

/** Les chiffres clés d'une note, chacun relié à sa dernière observation collectée. */
export async function chargerChiffresVivants(note: Note): Promise<ChiffreVivant[]> {
  const catalogue = {
    indicateurExiste: (id: string) => getMacroIndicator(id) !== null,
    instruments: getInstruments(),
  };
  const cibles = note.keyIndicators.map((c) => resoudreCible(c, note, catalogue));
  const macroIds = cibles.filter((c) => c?.kind === "macro").map((c) => c!.id);
  // La Fed publie une fourchette : la borne basse accompagne la borne haute.
  if (macroIds.includes("us-policy-rate")) macroIds.push("us-policy-rate-lower");
  const instrumentIds = cibles.filter((c) => c?.kind === "instrument").map((c) => c!.id);

  const [macro, marches] = await Promise.all([
    macroIds.length ? loadMacroObservations(macroIds) : Promise.resolve(new Map()),
    instrumentIds.length ? loadObservations(instrumentIds) : Promise.resolve(new Map()),
  ]);

  return note.keyIndicators.map((chiffre, i) => {
    const cible = cibles[i];
    const observations = cible
      ? observationsOf(cible.kind === "macro" ? macro : marches, cible.id)
      : [];
    return construireChiffre({
      chiffre,
      note,
      cible,
      instrument: cible?.kind === "instrument" ? getInstrument(cible.id) : null,
      indicateur: cible?.kind === "macro" ? getMacroIndicator(cible.id) : null,
      observations,
      borneBasse: cible?.id === "us-policy-rate" ? observationsOf(macro, "us-policy-rate-lower") : [],
      source: cible ? libelleSource(cible.kind, cible.id, observations.at(-1)?.source) : null,
    });
  });
}
