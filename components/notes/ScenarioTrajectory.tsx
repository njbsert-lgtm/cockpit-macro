import type { ScenarioLikelihood, ScenarioVersion } from "@/lib/types";
import { formatDateShort } from "@/lib/format";
import { BRANCH_LABELS, LIKELIHOOD_LABELS, LIKELIHOOD_SHORT } from "@/lib/scenario-labels";
import { branchSemantic, type BranchSemantic } from "@/lib/branch-semantics";

// Trois niveaux de vraisemblance, du plus probable au moins probable. La position verticale
// est ce qui rend les croisements lisibles : une branche qui monte pendant qu'une autre
// descend, c'est une lecture qui a basculé.
const ROW_Y: Record<ScenarioLikelihood, number> = {
  central: 18,
  moderee: 54,
  faible: 90,
};
const ROWS: ScenarioLikelihood[] = ["central", "moderee", "faible"];

// Environ 324×128 pour cinq notes (maquette 1e) : la carte tient dans la colonne mobile sans
// défiler ; au-delà, le graphique s'allonge et défile horizontalement.
const LEFT = 76;
const STEP = 56;
const RIGHT_PAD = 24;
const MIN_WIDTH = 324;
const HEIGHT = 128;

// La couleur d'une branche vient de son sens, comme sur la carte de driver (DESIGN.md) :
// `--k-pos` pour la centrale, `--hausse` et `--baisse` pour la favorable et la défavorable.
// Chaque sens a en plus son propre tiret, pour que la couleur ne porte jamais seule
// l'information : plein pour la centrale, `5 4` pour la hausse, pointillé arrondi pour la baisse.
const SEMANTIC_STROKE: Record<BranchSemantic, { color: string; dash?: string; width: number }> = {
  neutre: { color: "var(--color-k-pos)", width: 2 },
  hausse: { color: "var(--color-hausse)", dash: "5 4", width: 1.75 },
  baisse: { color: "var(--color-baisse)", dash: "1.5 3.5", width: 1.75 },
};

/** « 2026-S41 » → « S41 » ; « 2026-S41-E1 » → « S41·E1 ». */
export function semaineDeNote(slug: string): string {
  return slug.split("-").slice(1).join("·");
}

type Point = { x: number; y: number };

export function ScenarioTrajectory({
  versions,
  branchOrder,
}: {
  versions: ScenarioVersion[];
  branchOrder: string[];
}) {
  const dates = [...new Set(versions.map((v) => v.date))].sort();
  if (dates.length < 2) {
    return (
      <p className="rounded-rc bg-repos p-4 text-12-5 text-doux">
        Une seule date de révision pour l&rsquo;instant : la trajectoire apparaîtra dès la
        deuxième.
      </p>
    );
  }

  const xOf = (date: string) => LEFT + dates.indexOf(date) * STEP;
  const width = Math.max(MIN_WIDTH, LEFT + (dates.length - 1) * STEP + RIGHT_PAD);
  // L'abscisse se lit en semaines de note, pas en dates : c'est le rythme du fil.
  const etiquette = (date: string) => {
    const slug = versions.find((v) => v.date === date)?.noteSlug;
    return slug ? semaineDeNote(slug) : formatDateShort(date);
  };

  const lines = branchOrder
    .map((branchId) => {
      const branchVersions = versions
        .filter((v) => v.branchId === branchId)
        .sort((a, b) => a.date.localeCompare(b.date));
      if (branchVersions.length === 0) return null;

      // Report de la dernière valeur connue : une branche non révisée à une date garde sa
      // vraisemblance, elle ne disparaît pas du graphique.
      const points: Point[] = [];
      let current: ScenarioLikelihood | null = null;
      for (const date of dates) {
        const revision = branchVersions.find((v) => v.date === date);
        if (revision) current = revision.likelihood;
        if (current === null) continue; // la branche n'existe pas encore à cette date
        points.push({ x: xOf(date), y: ROW_Y[current] });
      }
      if (points.length === 0) return null;

      // D'une note à l'autre, la ligne joint les deux crans : la pente dit qu'une révision a
      // eu lieu entre les deux, le palier qu'elle a été maintenue.
      const d = points.map((p, idx) => `${idx === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
      const stroke = SEMANTIC_STROKE[branchSemantic(branchVersions.at(-1)!)];
      return { branchId, points, d, stroke };
    })
    .filter((l): l is NonNullable<typeof l> => l !== null);

  const summary = lines
    .map((l) => {
      const last = l.points.at(-1)!;
      const level = ROWS.find((r) => ROW_Y[r] === last.y)!;
      return `${BRANCH_LABELS[l.branchId] ?? l.branchId} : ${LIKELIHOOD_LABELS[level]}`;
    })
    .join(" ; ");

  return (
    <div className="rounded-rc border border-trait bg-page p-3.5">
      <ul className="mb-2.5 flex flex-wrap gap-x-4 gap-y-1.5">
        {lines.map((l) => (
          <li key={l.branchId} className="flex items-center gap-2">
            <svg width="22" height="8" aria-hidden="true" className="shrink-0">
              <line
                x1="1"
                y1="4"
                x2="21"
                y2="4"
                stroke={l.stroke.color}
                strokeWidth={l.stroke.width}
                strokeDasharray={l.stroke.dash}
                strokeLinecap={l.stroke.dash ? "round" : undefined}
              />
            </svg>
            <span className="text-11 text-doux">{BRANCH_LABELS[l.branchId] ?? l.branchId}</span>
          </li>
        ))}
      </ul>

      <div className="overflow-x-auto">
        <svg
          viewBox={`0 0 ${width} ${HEIGHT}`}
          width={width}
          height={HEIGHT}
          role="img"
          aria-label={`Trajectoire des vraisemblances. État à la dernière note — ${summary}.`}
          className="max-w-none"
        >
          {ROWS.map((row) => (
            <g key={row}>
              <line
                x1={LEFT - 8}
                y1={ROW_Y[row]}
                x2={width - RIGHT_PAD + 12}
                y2={ROW_Y[row]}
                stroke="var(--color-trait)"
                strokeWidth="1"
              />
              <text x={0} y={ROW_Y[row] + 4} className="fill-tenu" fontSize="11">
                {LIKELIHOOD_SHORT[row].toLowerCase()}
              </text>
            </g>
          ))}

          {dates.map((date, i) => {
            const derniere = i === dates.length - 1;
            return (
              <text
                key={date}
                x={xOf(date)}
                y={HEIGHT - 10}
                textAnchor="middle"
                className={derniere ? "fill-encre" : "fill-tenu"}
                fontWeight={derniere ? 600 : undefined}
                fontSize="11"
              >
                {etiquette(date)}
              </text>
            );
          })}

          {lines.map((l) => (
            <path
              key={l.branchId}
              d={l.d}
              fill="none"
              stroke={l.stroke.color}
              strokeWidth={l.stroke.width}
              strokeDasharray={l.stroke.dash}
              strokeLinecap={l.stroke.dash ? "round" : undefined}
              strokeLinejoin="round"
            />
          ))}
        </svg>
      </div>

      <p className="mt-2 text-11 text-tenu">Vraisemblances éditoriales, non implicites de marché.</p>
    </div>
  );
}
