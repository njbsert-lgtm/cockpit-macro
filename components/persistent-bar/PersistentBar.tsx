import { Suspense } from "react";
import Link from "next/link";
import { ZoneSelector } from "./ZoneSelector";
import { FreshnessIndicator } from "./FreshnessIndicator";

export function PersistentBar() {
  return (
    <header className="sticky top-0 z-30 bg-encre px-4 py-3 text-white">
      <div className="mx-auto flex max-w-colonne md:max-w-content flex-wrap items-center justify-between gap-2.5">
        <Link
          href="/"
          className="text-13 font-semibold uppercase tracking-cap text-white"
        >
          Cockpit macro
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          <Suspense fallback={<span className="text-11 text-white/40">Zone…</span>}>
            <ZoneSelector />
          </Suspense>
          <Suspense fallback={<span className="text-11 text-white/40">Fraîcheur…</span>}>
            <FreshnessIndicator />
          </Suspense>
        </div>
      </div>
    </header>
  );
}
