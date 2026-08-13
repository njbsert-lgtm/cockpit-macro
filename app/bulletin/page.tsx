import { Suspense } from "react";
import { parseZone, ZONE_PARAM } from "@/lib/zone-param";
import { BulletinContent } from "@/components/bulletin/BulletinContent";
import { BulletinSkeleton } from "@/components/bulletin/BulletinSkeleton";

export default async function BulletinPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const zone = parseZone(params[ZONE_PARAM]);

  return (
    <Suspense key={zone} fallback={<BulletinSkeleton />}>
      <BulletinContent zone={zone} />
    </Suspense>
  );
}
