"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

export function ModeToggle({ mode }: { mode: "zone" | "compare" }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function setMode(next: "zone" | "compare") {
    const params = new URLSearchParams(searchParams.toString());
    if (next === "zone") {
      params.delete("mode");
    } else {
      params.set("mode", "compare");
    }
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  }

  return (
    <div className="inline-flex border border-trait" role="group" aria-label="Mode de lecture">
      <button
        type="button"
        aria-pressed={mode === "zone"}
        onClick={() => setMode("zone")}
        className={`px-3.5 py-2 text-12-5 font-medium ${
          mode === "zone" ? "bg-encre text-white" : "bg-repos text-doux hover:bg-trait"
        }`}
      >
        Mode zone
      </button>
      <button
        type="button"
        aria-pressed={mode === "compare"}
        onClick={() => setMode("compare")}
        className={`border-l border-trait px-3.5 py-2 text-12-5 font-medium ${
          mode === "compare" ? "bg-encre text-white" : "bg-repos text-doux hover:bg-trait"
        }`}
      >
        Mode comparaison
      </button>
    </div>
  );
}
