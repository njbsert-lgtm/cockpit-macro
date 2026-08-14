import type { ScenarioLikelihood, ScenarioVersion } from "@/lib/types";
import { formatDateShort } from "@/lib/format";
import { BRANCH_LABELS, LIKELIHOOD_LABELS, LIKELIHOOD_SHORT } from "@/lib/scenario-labels";

// Trois niveaux de vraisemblance, du plus probable au moins probable. La position verticale
// est ce qui rend les croisements lisibles : une branche qui monte pendant qu'une autre
// descend, c'est une lecture qui a basculé.
const ROW_Y: Record<ScenarioLikelihood, number> = {
  central: 40,
  moderee: 90,
  faible: 140,
};
const ROWS: ScenarioLikelihood[] = ["central", "moderee", "faible"];

const LEFT = 96;
const STEP = 150;
const RIGHT_PAD = 32;
const HEIGHT = 190;

// Couleurs d'identité, pas de sémantique : elles distinguent trois branches, elles ne disent
// pas « tension » ou « détente ». Le trait pointillé double l'information pour ne pas
// dépendre de la seule couleur.
const STROKES = [
  { color: "var(--color-deep)", dash: undefined },
  { color: "var(--color-ochre)", dash: "6 4" },
  { color: "var(--color-rust)", dash: "2 4" },
];

type Point = { x: number; y: number; revised: boolean };

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
      <p className="border border-dashed border-line px-4 py-6 text-center text-13-5 text-mute">
        Une seule date de révision pour l&rsquo;instant : la trajectoire apparaîtra dès la
        deuxième.
      </p>
    );
  }

  const xOf = (date: string) => LEFT + dates.indexOf(date) * STEP;
  const width = LEFT + (dates.length - 1) * STEP + RIGHT_PAD;

  const lines = branchOrder
    .map((branchId, i) => {
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
        points.push({ x: xOf(date), y: ROW_Y[current], revised: Boolean(revision) });
      }
      if (points.length === 0) return null;

      // Tracé en escalier : la vraisemblance tient jusqu'à la révision suivante, puis saute.
      const d = points
        .map((p, idx) => (idx === 0 ? `M ${p.x} ${p.y}` : `L ${p.x} ${points[idx - 1].y} L ${p.x} ${p.y}`))
        .join(" ");

      return { branchId, points, d, stroke: STROKES[i % STROKES.length] };
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
    <div className="border border-line bg-card p-4">
      <ul className="mb-3 flex flex-wrap gap-x-5 gap-y-2">
        {lines.map((l) => (
          <li key={l.branchId} className="flex items-center gap-2">
            <svg width="26" height="8" aria-hidden="true" className="shrink-0">
              <line
                x1="0"
                y1="4"
                x2="26"
                y2="4"
                stroke={l.stroke.color}
                strokeWidth="2.5"
                strokeDasharray={l.stroke.dash}
              />
            </svg>
            <span className="font-mono text-11-5 text-ink-2">
              {BRANCH_LABELS[l.branchId] ?? l.branchId}
            </span>
          </li>
        ))}
      </ul>

      <div className="overflow-x-auto">
        <svg
          viewBox={`0 0 ${width} ${HEIGHT}`}
          width={width}
          height={HEIGHT}
          role="img"
          aria-label={`Trajectoire des vraisemblances. État au dernier point — ${summary}. Le détail daté suit sous le graphique.`}
          className="max-w-none"
        >
          {ROWS.map((row) => (
            <g key={row}>
              <line
                x1={LEFT - 12}
                y1={ROW_Y[row]}
                x2={width - RIGHT_PAD + 12}
                y2={ROW_Y[row]}
                stroke="var(--color-line-2)"
                strokeWidth="1"
              />
              <text
                x={LEFT - 20}
                y={ROW_Y[row] + 4}
                textAnchor="end"
                className="fill-mute font-mono"
                fontSize="11"
              >
                {LIKELIHOOD_SHORT[row]}
              </text>
            </g>
          ))}

          {dates.map((date) => (
            <text
              key={date}
              x={xOf(date)}
              y={HEIGHT - 14}
              textAnchor="middle"
              className="fill-mute font-mono"
              fontSize="11"
            >
              {formatDateShort(date)}
            </text>
          ))}

          {lines.map((l) => (
            <g key={l.branchId}>
              <path
                d={l.d}
                fill="none"
                stroke={l.stroke.color}
                strokeWidth="2.5"
                strokeDasharray={l.stroke.dash}
                strokeLinejoin="round"
              />
              {l.points
                .filter((p) => p.revised)
                .map((p) => (
                  <circle
                    key={`${p.x}-${p.y}`}
                    cx={p.x}
                    cy={p.y}
                    r="4.5"
                    fill="var(--color-card)"
                    stroke={l.stroke.color}
                    strokeWidth="2.5"
                  />
                ))}
            </g>
          ))}
        </svg>
      </div>

      <p className="mt-2 font-mono text-11 text-mute">
        Un cercle marque une révision ; entre deux cercles, la vraisemblance a été maintenue.
      </p>
    </div>
  );
}
