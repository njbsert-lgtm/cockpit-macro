import { Suspense } from "react";
import Link from "next/link";
import { ZoneSelector } from "./ZoneSelector";
import { FreshnessIndicator } from "./FreshnessIndicator";

export function PersistentBar() {
  return (
    <header className="sticky top-0 z-30 bg-deep px-4 py-3 text-white">
      <div className="mx-auto flex max-w-content flex-wrap items-center justify-between gap-2.5">
        <Link
          href="/notes"
          className="font-display text-13 font-extrabold uppercase tracking-widest text-white focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-white"
        >
          Cockpit macro
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          <Suspense fallback={<span className="font-mono text-11-5 text-white/40">Zone…</span>}>
            <ZoneSelector />
          </Suspense>
          <Suspense fallback={<span className="font-mono text-11-5 text-white/40">Fraîcheur…</span>}>
            <FreshnessIndicator />
          </Suspense>
        </div>
      </div>
    </header>
  );
}
