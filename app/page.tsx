import { redirect } from "next/navigation";
import { ZONE_PARAM } from "@/lib/zone-param";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const zone = params[ZONE_PARAM];
  redirect(zone ? `/notes?${ZONE_PARAM}=${zone}` : "/notes");
}
