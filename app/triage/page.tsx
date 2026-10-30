import { redirect } from "next/navigation";
import { exigerAdminPage } from "@/lib/auth/session";

/**
 * Ancienne adresse de la file de tri, déplacée à `/admin/veille` (J2.4).
 *
 * La redirection est **derrière la garde** : le middleware refuse déjà un non-administrateur
 * (404 identique à une adresse inconnue), et la page re-vérifie avant de rediriger. Une
 * redirection déclarée dans `next.config.ts` s'exécuterait avant le middleware et trahirait
 * l'existence de la route — d'où ce `redirect()` dans la page.
 */
export default async function Page() {
  await exigerAdminPage();
  redirect("/admin/veille");
}
