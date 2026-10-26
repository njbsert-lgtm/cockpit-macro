import { BarreAdmin } from "@/components/admin/BarreAdmin";
import { exigerAdminPage } from "@/lib/auth/session";

/**
 * Route d'administration : le middleware la garde déjà, ce layout la garde une seconde fois.
 * Un middleware se contourne par une configuration oubliée ; une garde au rendu, non. Sans
 * administrateur, le même 404 qu'une adresse inconnue.
 */
export default async function Layout({ children }: { children: React.ReactNode }) {
  const session = await exigerAdminPage();
  return (
    <>
      {children}
      <BarreAdmin session={session} />
    </>
  );
}
