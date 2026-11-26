import type { Metadata } from "next";
import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export const metadata: Metadata = {
  title: {
    default: "ChacoHoy | Noticias de Resistencia, Interior del Chaco y Argentina",
    template: "%s | ChacoHoy",
  },
  description:
    "Diario digital del Chaco. Noticias al instante de Gran Resistencia (Locales), Interior provincial, Política, Economía, Nacionales, Internacionales y Tecnología.",
  manifest: "/manifest.webmanifest",
  themeColor: "#003366",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "ChacoHoy",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
        <Header />
        <div className="flex-1">{children}</div>
        <Footer />
      </body>
    </html>
  );
}
