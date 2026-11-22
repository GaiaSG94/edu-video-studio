import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "EduVideo Studio — texte vers vidéo éducative",
  description: "Génère une vidéo éducative à partir d'un texte, avec Claude et HyperFrames.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
