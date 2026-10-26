import type { NextConfig } from "next";

import { NOTES_PURGEES } from "./config/suivi";
import { verifierContournementAuBuild } from "./lib/auth/regles";

// Le contournement de l'accès administrateur n'a sa place qu'en développement local : posé en
// production ou sur Vercel, il fait échouer le build plutôt que d'ouvrir /redaction à tous.
verifierContournementAuBuild(process.env);

const nextConfig: NextConfig = {
  // Les notes de développement retirées à la remise à zéro du corpus (config/suivi.ts) : une
  // adresse partagée ou enregistrée ne doit pas tomber sur un 404 mais sur le fil des notes.
  async redirects() {
    return NOTES_PURGEES.map((slug) => ({
      source: `/notes/${slug}`,
      destination: "/notes",
      permanent: false,
    }));
  },
};

export default nextConfig;
