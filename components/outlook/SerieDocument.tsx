import type { OutlookPoint } from "@/lib/types";

type Serie = NonNullable<OutlookPoint["serie"]>;

function fr(n: number): string {
  return n.toLocaleString("fr-FR", { maximumFractionDigits: 2 });
}

/**
 * Le graphique redessiné d'un point (maquette 3c) : uniquement les points que le document cite,
 * sans interpolation. Jusqu'à trois points, des barres — l'ancienne valeur en `--tenu`, la plus
 * récente en `--encre` ; au-delà, une courbe en encre. Jamais de vert ni de rouge.
 */
export function SerieDocument({ serie }: { serie: Serie }) {
  const valeurs = serie.points.map((p) => p.y);
  const max = Math.max(...valeurs);
  const echelle = Math.ceil(max * 1.1);

  return (
    <figure className="rounded-rc border border-trait px-4 py-3.5">
      <figcaption className="text-14-5 font-semibold leading-snug text-encre">{serie.titre}</figcaption>
      {serie.points.length <= 3 ? (
        <ul className="mt-3 flex flex-col gap-2.5">
          {serie.points.map((p, i) => {
            const recent = i === serie.points.length - 1;
            return (
              <li key={p.x} className="grid grid-cols-[36px_1fr] items-center gap-2.5">
                <span className={`text-12 ${recent ? "font-semibold text-encre" : "text-tenu"}`}>{p.x}</span>
                <span className="flex items-center gap-2">
                  <span
                    className={`block h-[22px] rounded-rp ${recent ? "bg-encre" : "bg-tenu"}`}
                    style={{ width: `${(p.y / echelle) * 80}%` }}
                  />
                  <span className="shrink-0 text-13 font-semibold text-encre">
                    {fr(p.y)} {serie.unite}
                  </span>
                </span>
              </li>
            );
          })}
        </ul>
      ) : (
        <Courbe serie={serie} />
      )}
      <p className="mt-3 text-11 text-tenu">
        Échelle de 0 à {fr(echelle)} {serie.unite}.{serie.note && ` ${serie.note}`}
      </p>
    </figure>
  );
}

function Courbe({ serie }: { serie: Serie }) {
  const L = 300;
  const H = 90;
  const ys = serie.points.map((p) => p.y);
  const min = Math.min(...ys);
  const max = Math.max(...ys);
  const x = (i: number) => (i / (serie.points.length - 1)) * L;
  const y = (v: number) => (max === min ? H / 2 : 6 + (H - 12) * (1 - (v - min) / (max - min)));
  return (
    <svg viewBox={`0 0 ${L} ${H}`} className="mt-3 h-24 w-full" role="img" aria-label={serie.titre}>
      <path
        d={serie.points.map((p, i) => `${i ? "L" : "M"}${x(i)},${y(p.y)}`).join(" ")}
        fill="none"
        stroke="var(--color-encre)"
        strokeWidth={1.5}
        vectorEffect="non-scaling-stroke"
      />
      {serie.points.map((p, i) => (
        <circle key={p.x} cx={x(i)} cy={y(p.y)} r={2.5} fill="var(--color-encre)" />
      ))}
    </svg>
  );
}
