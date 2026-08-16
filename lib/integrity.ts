import type {
  DriverInput,
  Note,
  Outlook,
  ScenarioVersion,
  Trend,
} from "./types";

/**
 * Contrôle d'intégrité référentielle du graphe de contenu.
 *
 * Une référence vers un objet inexistant ne doit jamais produire un lien mort à l'écran :
 * elle doit casser la compilation. Ce module est le point de contrôle unique — `lib/content.ts`
 * l'appelle une fois à l'initialisation, donc importer n'importe quel accesseur de contenu
 * déclenche la totalité des vérifications.
 *
 * Fonction pure, sans accès disque : testable arête par arête sur des graphes synthétiques.
 */

export class IntegrityError extends Error {
  constructor(where: string, reason: string) {
    super(`${where} — ${reason}`);
    this.name = "IntegrityError";
  }
}

export type ContentGraph = {
  drivers: DriverInput[];
  trends: Trend[];
  notes: Note[];
  scenarios: ScenarioVersion[];
  outlooks: Outlook[];
  instrumentIds: ReadonlySet<string>;
};

const BRANCHES_PER_DRIVER = 3;

export function checkIntegrity(graph: ContentGraph): void {
  const driverIds = new Set(graph.drivers.map((d) => d.id));
  const trendIds = new Set(graph.trends.map((t) => t.id));
  const noteSlugs = new Set(graph.notes.map((e) => e.slug));

  checkDuplicateIds(graph);
  checkDrivers(graph, { trendIds, noteSlugs });
  checkTrends(graph, { driverIds, noteSlugs });
  checkNotes(graph, { driverIds, trendIds });
  checkScenarios(graph, { driverIds, noteSlugs });
  checkOutlooks(graph, { driverIds, trendIds });
}

// ---------------------------------------------------------------------------

function checkDuplicateIds({ drivers, trends, notes, outlooks }: ContentGraph) {
  const dup = <T>(items: T[], key: (i: T) => string, where: string) => {
    const seen = new Set<string>();
    for (const item of items) {
      const id = key(item);
      if (seen.has(id)) throw new IntegrityError(where, `identifiant en double : « ${id} »`);
      seen.add(id);
    }
  };
  dup(drivers, (d) => d.id, "content/drivers.ts");
  dup(trends, (t) => t.id, "content/tendances.ts");
  dup(notes, (e) => e.slug, "content/notes");
  dup(outlooks, (o) => o.id, "content/outlooks.ts");
}

// ---------------------------------------------------------------------------

function checkDrivers(
  { drivers, scenarios, instrumentIds }: ContentGraph,
  refs: { trendIds: ReadonlySet<string>; noteSlugs: ReadonlySet<string> },
) {
  for (const driver of drivers) {
    const where = `content/drivers.ts (${driver.id})`;

    for (const id of driver.instrumentRefs) {
      if (!instrumentIds.has(id)) {
        throw new IntegrityError(where, `instrument inconnu « ${id} » dans instrumentRefs`);
      }
    }
    for (const id of driver.trendRefs) {
      if (!refs.trendIds.has(id)) {
        throw new IntegrityError(where, `tendance inconnue « ${id} » dans trendRefs`);
      }
    }

    if (driver.retiredAt !== null && !/^\d{4}-\d{2}-\d{2}$/.test(driver.retiredAt)) {
      throw new IntegrityError(where, `retiredAt doit être null ou une date AAAA-MM-JJ, reçu « ${driver.retiredAt} »`);
    }

    // « Un driver, une question, trois branches. »
    const branches = new Set(
      scenarios.filter((s) => s.driverId === driver.id).map((s) => s.branchId),
    );
    if (branches.size !== BRANCHES_PER_DRIVER) {
      throw new IntegrityError(
        where,
        `${branches.size} branche(s) dans content/scenarios.ts, ${BRANCHES_PER_DRIVER} attendues${branches.size ? ` : ${[...branches].join(", ")}` : ""}`,
      );
    }

    // La branche dominante est celle dont la vraisemblance courante est « central ». S'il n'y
    // en a pas exactement une, `dominantBranchId` n'est pas définissable.
    const central = [...branches].filter(
      (b) => currentVersion(scenarios, driver.id, b)?.likelihood === "central",
    );
    if (central.length !== 1) {
      throw new IntegrityError(
        where,
        central.length === 0
          ? "aucune branche n'est le scénario central : la branche dominante est indéterminée"
          : `${central.length} branches se déclarent scénario central (${central.join(", ")}) : la branche dominante est ambiguë`,
      );
    }
  }
}

/** Dernière version en date d'une branche — l'état courant. */
export function currentVersion(
  scenarios: ScenarioVersion[],
  driverId: string,
  branchId: string,
): ScenarioVersion | null {
  return (
    scenarios
      .filter((s) => s.driverId === driverId && s.branchId === branchId)
      .sort((a, b) => a.version - b.version)
      .at(-1) ?? null
  );
}

// ---------------------------------------------------------------------------

function checkTrends(
  { trends, drivers }: ContentGraph,
  refs: { driverIds: ReadonlySet<string>; noteSlugs: ReadonlySet<string> },
) {
  const driverById = new Map(drivers.map((d) => [d.id, d]));

  for (const trend of trends) {
    const where = `content/tendances.ts (${trend.id})`;

    for (const entry of trend.statusHistory) {
      if (!refs.noteSlugs.has(entry.noteSlug)) {
        throw new IntegrityError(
          where,
          `l'historique de statut cite la note « ${entry.noteSlug} », qui n'existe pas`,
        );
      }
      if (!entry.why.trim()) {
        throw new IntegrityError(
          where,
          `changement de statut du ${entry.date} sans justification`,
        );
      }
    }

    for (const driverId of trend.driverRefs) {
      if (!refs.driverIds.has(driverId)) {
        throw new IntegrityError(where, `driver inconnu « ${driverId} » dans driverRefs`);
      }

      // Règle d'inclusion, pas de symétrie : `Driver.trendRefs` liste ce qu'un driver
      // « alimente OU pourrait invalider », `Trend.driverRefs` seulement ce qui « pourrait la
      // faire tomber ». Le second est donc un sous-ensemble du premier, inversé. Un driver qui
      // alimente une tendance sans pouvoir la tuer est légitime ; l'inverse est une incohérence.
      const driver = driverById.get(driverId)!;
      if (!driver.trendRefs.includes(trend.id)) {
        throw new IntegrityError(
          where,
          `la tendance déclare que « ${driverId} » pourrait la faire tomber, mais ce driver ne la liste pas dans ses trendRefs — le lien doit exister dans les deux sens`,
        );
      }
    }
  }
}

// ---------------------------------------------------------------------------

function checkNotes(
  { notes, drivers, instrumentIds }: ContentGraph,
  refs: { driverIds: ReadonlySet<string>; trendIds: ReadonlySet<string> },
) {
  for (const note of notes) {
    const where = `content/notes/${note.slug}.mdx`;
    const seen = new Set<string>();

    for (const id of note.trendRefs) {
      if (!refs.trendIds.has(id)) {
        throw new IntegrityError(where, `tendance inconnue « ${id} » dans trendRefs`);
      }
    }
    for (const id of note.instrumentRefs) {
      if (!instrumentIds.has(id)) {
        throw new IntegrityError(where, `instrument inconnu « ${id} » dans instrumentRefs`);
      }
    }

    for (const driverId of note.driverOrder) {
      if (!refs.driverIds.has(driverId)) {
        throw new IntegrityError(where, `driver inconnu « ${driverId} » dans driverOrder`);
      }
      if (seen.has(driverId)) {
        throw new IntegrityError(where, `driver « ${driverId} » listé deux fois dans driverOrder`);
      }
      seen.add(driverId);
    }
  }

  // Seule la dernière note pilote l'affichage des cartes : c'est d'elle que vient
  // `intensityRank`. Un driver actif qu'elle oublie n'aurait pas de rang, donc pas de carte —
  // il disparaîtrait sans bruit. Les notes antérieures ont le droit d'être partielles :
  // un driver a pu apparaître après elles.
  const latest = [...notes].sort((a, b) => b.date.localeCompare(a.date))[0];
  if (!latest) return;

  const active = drivers.filter(
    (d) => d.retiredAt === null || d.retiredAt > latest.date,
  );
  const missing = active.filter((d) => !latest.driverOrder.includes(d.id));
  if (missing.length > 0) {
    throw new IntegrityError(
      `content/notes/${latest.slug}.mdx`,
      `dernière note parue : driverOrder omet ${missing.map((d) => `« ${d.id} »`).join(", ")}, qui ${missing.length > 1 ? "sont des drivers actifs" : "est un driver actif"} — sa carte disparaîtrait de l'en-tête sans que rien ne le signale`,
    );
  }
}

// ---------------------------------------------------------------------------

function checkScenarios(
  { scenarios }: ContentGraph,
  refs: { driverIds: ReadonlySet<string>; noteSlugs: ReadonlySet<string> },
) {
  const byBranch = new Map<string, ScenarioVersion[]>();

  for (const v of scenarios) {
    const where = `content/scenarios.ts (${v.driverId}/${v.branchId} v${v.version})`;

    if (!refs.driverIds.has(v.driverId)) {
      throw new IntegrityError(where, `driver inconnu « ${v.driverId} »`);
    }
    if (!refs.noteSlugs.has(v.noteSlug)) {
      throw new IntegrityError(where, `note inconnue « ${v.noteSlug} »`);
    }

    // « Une révision sans justification écrite est interdite. »
    if (v.likelihoodChangedFrom && !v.why.trim()) {
      throw new IntegrityError(
        where,
        `la vraisemblance passe de « ${v.likelihoodChangedFrom} » à « ${v.likelihood} » sans justification`,
      );
    }

    const key = `${v.driverId}/${v.branchId}`;
    byBranch.set(key, [...(byBranch.get(key) ?? []), v]);
  }

  // Une trajectoire est une suite : un trou dans les numéros de version signale une révision
  // perdue, donc une trajectoire qui ment sur ce qui s'est passé.
  for (const [key, versions] of byBranch) {
    const numbers = versions.map((v) => v.version).sort((a, b) => a - b);
    const expected = numbers.map((_, i) => i + 1);
    if (numbers.join(",") !== expected.join(",")) {
      throw new IntegrityError(
        `content/scenarios.ts (${key})`,
        `versions non contiguës : ${numbers.join(", ")} — attendu ${expected.join(", ")}`,
      );
    }
  }
}

// ---------------------------------------------------------------------------

function checkOutlooks(
  { outlooks }: ContentGraph,
  refs: { driverIds: ReadonlySet<string>; trendIds: ReadonlySet<string> },
) {
  for (const outlook of outlooks) {
    const where = `content/outlooks.ts (${outlook.id})`;

    for (const id of outlook.driverRefs) {
      if (!refs.driverIds.has(id)) {
        throw new IntegrityError(where, `driver inconnu « ${id} » dans driverRefs`);
      }
    }
    for (const id of outlook.trendRefs) {
      if (!refs.trendIds.has(id)) {
        throw new IntegrityError(where, `tendance inconnue « ${id} » dans trendRefs`);
      }
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(outlook.publishedAt)) {
      throw new IntegrityError(
        where,
        `publishedAt doit être une date AAAA-MM-JJ, reçu « ${outlook.publishedAt} »`,
      );
    }
  }
}
