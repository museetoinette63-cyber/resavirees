import type { Metadata } from "next";
import { Cinzel_Decorative, EB_Garamond, IM_Fell_English, Source_Sans_3 } from "next/font/google";
import "./globals.css";

// Typographie d'imprimerie ancienne : Cinzel Decorative (lettrines et
// titres monumentaux), IM Fell (titres, gravée à l'ancienne), EB Garamond
// (texte courant). Source Sans reste utilisé par le back-office.
const cinzel = Cinzel_Decorative({
  variable: "--font-cinzel",
  subsets: ["latin"],
  weight: ["400", "700", "900"],
});

const fell = IM_Fell_English({
  variable: "--font-fell",
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
});

const garamond = EB_Garamond({
  variable: "--font-garamond",
  subsets: ["latin"],
  style: ["normal", "italic"],
});

const sourceSans = Source_Sans_3({
  variable: "--font-source-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Visites guidées théâtralisées",
  description: "Réservation de visites guidées théâtralisées",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="fr"
      className={`${sourceSans.variable} ${cinzel.variable} ${fell.variable} ${garamond.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-cream text-ink">{children}</body>
    </html>
  );
}
