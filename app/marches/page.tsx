import { Suspense } from "react";
import { parseZone, ZONE_PARAM } from "@/lib/zone-param";
import { ASSET_CLASS_ORDER } from "@/lib/marches";
import { ClassCard } from "@/components/marches/ClassCard";
import { MarchesSkeleton } from "@/components/marches/MarchesSkeleton";

async function simulateLoad() {
  await new Promise((resolve) => setTimeout(resolve, 300));
}

async function MarchesContent({ zone }: { zone: string }) {
  await simulateLoad();

  return (
    <div className="mx-auto max-w-[1060px] px-4 py-8 md:px-6">
      <p className="font-mono text-[11px] uppercase tracking-wider text-mute">Marchés</p>
      <h1 className="mt-1 font-display text-[26px] font-extrabold text-ink">
        Performance par classe d&rsquo;actifs
      </h1>
      <p className="mt-2 max-w-[64ch] text-[15px] text-mute">
        Un clic ouvre les instruments de la classe, réordonnés pour remonter ceux de la zone
        sélectionnée.
      </p>
      <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {ASSET_CLASS_ORDER.map((assetClass) => (
          <ClassCard key={assetClass} assetClass={assetClass} zone={zone} />
        ))}
      </div>
    </div>
  );
}

export default async function MarchesPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const zone = parseZone(params[ZONE_PARAM]);

  return (
    <Suspense key={zone} fallback={<MarchesSkeleton />}>
      <MarchesContent zone={zone} />
    </Suspense>
  );
}
