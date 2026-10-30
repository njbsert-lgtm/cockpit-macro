import { exigerAdminPage } from "@/lib/auth/session";

/** Seconde garde de l'ancienne adresse `/triage` : sans administrateur, le même 404. */
export default async function Layout({ children }: { children: React.ReactNode }) {
  await exigerAdminPage();
  return children;
}
