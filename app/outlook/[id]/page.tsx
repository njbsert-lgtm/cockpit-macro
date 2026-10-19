import { notFound } from "next/navigation";
import Link from "next/link";
import { getOutlook, getOutlooks } from "@/lib/content";
import { formatDateLong } from "@/lib/format";
import { BankLogo } from "@/components/outlook/BankLogo";
import { OutlookPoints } from "@/components/outlook/OutlookPoints";

/**
 * Énumère les outlooks au build — même effet de bord voulu que pour les notes et les drivers :
 * une référence morte fait échouer `next build`, pas le rendu.
 */
export function generateStaticParams() {
  return getOutlooks().map((outlook) => ({ id: outlook.id }));
}

/**
 * La fiche d'un outlook (maquette 3b) : une série de fiches, pas un texte à filet — ce qui la
 * distingue d'une note au premier regard. Le condensé vient après les points majeurs, replié.
 */
export default async function OutlookDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const outlook = getOutlook(id);
  if (!outlook) notFound();

  // Un outlook antérieur à la migration n'a que ses highlights : ils deviennent des cartes texte.
  const avecPoints =
    outlook.points.length > 0
      ? outlook
      : {
          ...outlook,
          themes: [{ id: "points", emoji: "🧭" as const, label: "Point majeur" }],
          points: (outlook.highlights ?? []).map((texte, i) => ({ id: `point-${i + 1}`, themeId: "points", texte })),
        };

  return (
    <div className="mx-auto max-w-colonne px-4.5 pb-7 md:max-w-lecture md:px-6">
      <div className="flex items-center justify-between gap-3">
        <Link href="/outlook" className="inline-flex min-h-11 items-center text-12 text-doux hover:text-encre">
          ← Outlooks
        </Link>
        <a
          href={outlook.sourceUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex min-h-11 items-center text-11 text-tenu hover:text-encre"
        >
          Document original ↗
        </a>
      </div>

      <div className="mt-2 flex items-center gap-3">
        <BankLogo outlook={outlook} size={48} />
        <div className="min-w-0">
          <p className="text-11 uppercase tracking-cap text-tenu">
            {outlook.bank} · {outlook.periodCovered}
          </p>
          <h1 className="text-17 font-semibold leading-tight text-encre">{outlook.title}</h1>
        </div>
      </div>
      <p className="mt-2 text-11 text-tenu">
        Publié le {formatDateLong(outlook.publishedAt)}
        {outlook.auteur && ` · ${outlook.auteur}`}
      </p>

      <OutlookPoints outlook={avecPoints} />

      <details className="group mt-7 rounded-rc border border-trait">
        <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between px-3.5 py-3 text-15 font-semibold text-encre">
          Le condensé
          <span aria-hidden="true" className="text-tenu transition-transform group-open:rotate-90">
            ›
          </span>
        </summary>
        <div className="rounded-b-rc bg-repos px-3.5 py-3 text-14-5 leading-[1.6] whitespace-pre-line text-encre">
          {outlook.summary}
        </div>
      </details>
    </div>
  );
}
