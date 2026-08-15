import Link from "next/link";
import { EmptyState } from "@/components/states/EmptyState";

export default function VeillePage() {
  return (
    <div className="mx-auto max-w-content px-4 py-8 md:px-6">
      <p className="font-mono text-11 uppercase tracking-wider text-mute">Veille</p>
      <h1 className="mt-1 font-display text-26 font-extrabold text-ink">
        File de veille
      </h1>
      <p className="mt-2 max-w-[64ch] text-15 text-mute">
        La place est réservée dès la carcasse : l&rsquo;onglet existe pour ne pas avoir à
        refaire la navigation plus tard.
      </p>

      <div className="mt-6">
        <EmptyState
          title="Pas encore construit"
          description="La veille arrive à l'étape 5 : collecte RSS et GDELT, filtre par mots-clés, puis classification par l'API Claude. Trois actions par item : verser dans la note en cours, archiver, ignorer."
          action={
            <Link
              href="/"
              className="inline-block border border-line bg-paper px-3 py-1.5 font-mono text-12-5 text-ink-2 hover:border-deep hover:text-deep"
            >
              Revenir aux Notes
            </Link>
          }
        />
      </div>
    </div>
  );
}
