"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { METRIC_LABELS, METRIC_ORDER } from "@/lib/macro";

export function MetricSelector({ current }: { current: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  return (
    <div className="flex flex-wrap gap-2" role="group" aria-label="Choisir l'indicateur comparé">
      {METRIC_ORDER.map((metric) => {
        const active = metric === current;
        return (
          <button
            key={metric}
            type="button"
            aria-pressed={active}
            onClick={() => {
              const params = new URLSearchParams(searchParams.toString());
              params.set("indicator", metric);
              router.push(`${pathname}?${params.toString()}`, { scroll: false });
            }}
            className={`border px-3 py-1.5 text-12-5 font-medium ${
              active ? "border-encre bg-encre text-white" : "border-trait bg-repos text-doux hover:border-trait-f"
            }`}
          >
            {METRIC_LABELS[metric]}
          </button>
        );
      })}
    </div>
  );
}
