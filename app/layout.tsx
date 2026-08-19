import type { Metadata } from "next";
import { IBM_Plex_Sans } from "next/font/google";
import { PersistentBar } from "@/components/persistent-bar/PersistentBar";
import { TabBar } from "@/components/nav/TabBar";
import { Footer } from "@/components/Footer";
import "./globals.css";

/**
 * IBM Plex Sans exclusivement (DESIGN.md). Bricolage Grotesque et Inter sont retirés du
 * projet ; IBM Plex Mono l'est aussi — c'est `font-variant-numeric: tabular-nums` qui aligne
 * désormais les chiffres, pas une seconde famille.
 */
const plexSans = IBM_Plex_Sans({
  variable: "--font-plex-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Marguerite",
  description:
    "Tableau de bord macroéconomique et géopolitique personnel — support d'analyse, pas un conseil en investissement.",
};

/**
 * La barre persistante porte l'indicateur de fraîcheur, donc une donnée qui bouge tous les
 * jours, sur **tous** les écrans — y compris ceux que Next rend une fois pour toutes à la
 * compilation, comme l'accueil ou le fil des notes.
 *
 * Sans cette péremption, l'indicateur restait figé sur l'état du dernier déploiement : il
 * annonçait « jamais collectée » indéfiniment alors que le cron écrivait chaque matin. Le cron
 * appelle bien `revalidatePath`, mais s'y fier seul revient à faire dépendre l'honnêteté de
 * l'indicateur du bon fonctionnement de ce qu'il est précisément chargé de surveiller.
 *
 * Une heure, comme les fiches d'indicateur et de driver : la collecte est quotidienne, rien
 * ici ne justifie plus court.
 */
export const revalidate = 3600;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <body className={`${plexSans.variable} font-sans`}>
        <PersistentBar />
        <TabBar />
        <main>{children}</main>
        <Footer />
      </body>
    </html>
  );
}
