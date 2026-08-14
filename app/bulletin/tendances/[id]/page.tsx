import { notFound } from "next/navigation";
import Link from "next/link";
import { getTrend } from "@/lib/content";
import { formatDateLong } from "@/lib/format";

const STATUS_LABEL: Record<string, string> = {
  renforce: "Se renforce",
  maintient: "Se maintient",
  affaiblit: "S'affaiblit",
  invalidee: "Invalidée",
};

const STATUS_CLASS: Record<string, string> = {
  renforce: "bg-teal-bg text-teal",
  maintient: "bg-line-2 text-ink-2",
  affaiblit: "bg-ochre-bg text-ochre",
  invalidee: "bg-rust-bg text-rust",
};

export default async function TrendPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const trend = getTrend(id);
  if (!trend) notFound();

  const history = [...trend.statusHistory].sort((a, b) => b.date.localeCompare(a.date));

  return (
    <div className="mx-auto max-w-content px-4 py-8 md:px-6">
      <Link
        href="/bulletin"
        className="mb-4 inline-block font-mono text-xs text-deep underline decoration-line underline-offset-4 hover:decoration-deep"
      >
        ← Retour au bulletin
      </Link>

      <p className="font-mono text-11 uppercase tracking-wider text-mute">Tendance de fond</p>
      <h1 className="mt-1.5 max-w-[36ch] font-display text-28 font-extrabold leading-tight text-ink">
        {trend.title}
      </h1>
      <span
        className={`mt-3 inline-block px-2.5 py-1 font-mono text-11-5 font-semibold uppercase tracking-wider ${STATUS_CLASS[trend.status]}`}
      >
        {STATUS_LABEL[trend.status]}
      </span>

      <p className="mt-4 max-w-[70ch] text-base leading-relaxed text-ink-2">{trend.thesis}</p>

      <div className="mt-4 max-w-[70ch] border-l-3 border-rust bg-rust-bg px-3.5 py-3">
        <p className="font-mono text-10-5 font-semibold uppercase tracking-wider text-rust">
          Ce qui l&rsquo;invaliderait
        </p>
        <p className="mt-1 text-14 text-ink-2">{trend.invalidatedBy}</p>
      </div>

      <section className="mt-10">
        <h2 className="font-display text-xl font-extrabold text-ink">
          Chronologie ({history.length} passage{history.length > 1 ? "s" : ""})
        </h2>
        <ol className="mt-4 flex flex-col gap-3 border-l-2 border-line pl-4">
          {history.map((h, i) => (
            <li key={i} className="relative">
              <span className="absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full bg-deep" />
              <div className="flex flex-wrap items-baseline gap-2">
                <span
                  className={`px-2 py-0.5 font-mono text-10-5 font-semibold uppercase tracking-wider ${STATUS_CLASS[h.status]}`}
                >
                  {STATUS_LABEL[h.status]}
                </span>
                <span className="font-mono text-11-5 text-mute">{formatDateLong(h.date)}</span>
                <Link
                  href={`/bulletin/${h.editionSlug}`}
                  className="font-mono text-11-5 text-deep underline decoration-line underline-offset-4"
                >
                  {h.editionSlug}
                </Link>
              </div>
              <p className="mt-1.5 max-w-[64ch] text-14-5 text-ink-2">{h.why}</p>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
