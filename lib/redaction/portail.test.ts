import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { resetClientsForTests } from "@/lib/supabase";
import { brouillonsDisponibles, chargerPortail } from "./portail";

const ENV_KEYS = ["SUPABASE_URL", "SUPABASE_ANON_KEY", "SUPABASE_SERVICE_ROLE_KEY"];

beforeEach(() => {
  resetClientsForTests();
  for (const key of ENV_KEYS) delete process.env[key];
});

afterEach(() => {
  resetClientsForTests();
  for (const key of ENV_KEYS) delete process.env[key];
});

describe("chargerPortail — rien à réviser plutôt qu'une page à moitié renseignée", () => {
  it("renvoie null quand le fichier n'existe pas", async () => {
    const dossier = mkdtempSync(path.join(tmpdir(), "brouillons-"));
    expect(await chargerPortail("2026-S99", dossier)).toBeNull();
  });

  it("renvoie null quand le fichier existe mais que son état n'a pas été persisté", async () => {
    const dossier = mkdtempSync(path.join(tmpdir(), "brouillons-"));
    writeFileSync(
      path.join(dossier, "2026-S36.mdx"),
      `---
kind: hebdo
status: brouillon
publishedAt: null
date: '2026-09-05'
comparesTo: null
regimeStatement: Un régime.
keyIndicators:
  - label: Régime
    value: Choc d'offre
zones: [us]
driverOrder: [rates]
trendRefs: []
instrumentRefs: []
veilleItemRefs: []
channels: []
sources: {}
guets:
  - id: 2026-s36-g1
    driverId: rates
    libelle: Réunion de la Fed
    attendu: Statu quo
    confirmeSi: Taux inchangé
    infirmeSi: Hausse de 25 bps
    echeance: '2026-09-16'
    sourceAttendue: ['FED:communique']
    statut: ouvert
    resoluPar: null
    resoluLe: null
---

<CeQuiAChange>

Rien.

</CeQuiAChange>

<CeQuiSestConfirme>

Rien.

</CeQuiSestConfirme>

<RevisionDesScenarios>

Rien.

</RevisionDesScenarios>

<CeQueJavaisMalLu>

</CeQueJavaisMalLu>

<CeQueJeSurveille>

Rien.

</CeQueJeSurveille>
`,
    );
    // Supabase n'est pas configuré dans ce test : chargerEtatBrouillon dégrade sur null.
    expect(await chargerPortail("2026-S36", dossier)).toBeNull();
  });
});

describe("brouillonsDisponibles", () => {
  it("liste les slugs présents, du plus récent au plus ancien", () => {
    const dossier = mkdtempSync(path.join(tmpdir(), "brouillons-"));
    writeFileSync(path.join(dossier, "2026-S35.mdx"), "…");
    writeFileSync(path.join(dossier, "2026-S36.mdx"), "…");
    writeFileSync(path.join(dossier, "README.md"), "…");
    expect(brouillonsDisponibles(dossier)).toEqual(["2026-S36", "2026-S35"]);
  });

  it("renvoie un tableau vide quand le dossier n'existe pas", () => {
    expect(brouillonsDisponibles(path.join(tmpdir(), "inexistant-xyz"))).toEqual([]);
  });
});
