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
