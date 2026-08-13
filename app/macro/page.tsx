import { Suspense } from "react";
import { parseZone, ZONE_PARAM } from "@/lib/zone-param";
import { METRIC_ORDER } from "@/lib/macro";
import { MacroContent } from "@/components/macro/MacroContent";
import { MacroSkeleton } from "@/components/macro/MacroSkeleton";

export default async function MacroPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const zone = parseZone(params[ZONE_PARAM]);
  const mode = params.mode === "compare" ? "compare" : "zone";
  const rawMetric = Array.isArray(params.indicator) ? params.indicator[0] : params.indicator;
  const metric = rawMetric && METRIC_ORDER.includes(rawMetric) ? rawMetric : METRIC_ORDER[0];

  return (
    <Suspense key={`${zone}-${mode}-${metric}`} fallback={<MacroSkeleton />}>
      <MacroContent zone={zone} mode={mode} metric={metric} />
    </Suspense>
  );
}
