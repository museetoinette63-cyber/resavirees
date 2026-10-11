import type { Metadata } from "next";
import { Libre_Caslon_Text, Source_Sans_3 } from "next/font/google";
import "./globals.css";

// Typographie de livre ancien : une Caslon (fonte d'imprimerie du XVIIIe)
// pour les titres, associée à une sans-serif humaniste lisible pour le texte.
const caslon = Libre_Caslon_Text({
  variable: "--font-caslon",
  subsets: ["latin"],
  weight: ["400", "700"],
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
    <html lang="fr" className={`${sourceSans.variable} ${caslon.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-cream text-ink">{children}</body>
    </html>
  );
}
