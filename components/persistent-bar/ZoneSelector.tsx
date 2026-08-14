"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ALL_ZONES, ZONE_LABELS } from "@/lib/zones";
import { DEFAULT_ZONE, ZONE_PARAM, parseZone } from "@/lib/zone-param";

export function ZoneSelector() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const zone = parseZone(searchParams.get(ZONE_PARAM));

  return (
    <label className="inline-flex items-center gap-2">
      <span className="sr-only">Zone</span>
      <select
        value={zone}
        onChange={(e) => {
          const params = new URLSearchParams(searchParams.toString());
          if (e.target.value === DEFAULT_ZONE) {
            params.delete(ZONE_PARAM);
          } else {
            params.set(ZONE_PARAM, e.target.value);
          }
          const qs = params.toString();
          router.push(`${pathname}${qs ? `?${qs}` : ""}`, { scroll: false });
        }}
        className="border border-white/25 bg-white/10 px-2.5 py-1.5 font-mono text-12-5 font-medium tracking-wide text-white [color-scheme:dark] focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-white"
      >
        {ALL_ZONES.map((z) => (
          <option key={z} value={z} className="text-ink">
            {ZONE_LABELS[z]}
          </option>
        ))}
      </select>
    </label>
  );
}
