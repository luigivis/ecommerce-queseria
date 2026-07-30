import type { Metadata } from "next";
import { Amatic_SC, Cabin } from "next/font/google";
import "./globals.css";
import "leaflet/dist/leaflet.css";
import { getConfiguracion } from "@/lib/site";
import { coloresToCssVars, parseColores } from "@/lib/config";
import { Header } from "@/components/storefront/Header";
import { Footer } from "@/components/storefront/Footer";
import { CartDrawer } from "@/components/storefront/CartDrawer";

const display = Amatic_SC({
  weight: ["400", "700"],
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

const sans = Cabin({
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

export async function generateMetadata(): Promise<Metadata> {
  const cfg = await getConfiguracion();
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  return {
    metadataBase: new URL(baseUrl),
    title: {
      default: cfg.nombreSitio,
      template: `%s | ${cfg.nombreSitio}`,
    },
    description: cfg.subtituloHero,
    openGraph: {
      type: "website",
      locale: "es_NI",
      siteName: cfg.nombreSitio,
      title: cfg.nombreSitio,
      description: cfg.subtituloHero,
      images: cfg.logoUrl ? [cfg.logoUrl] : [],
    },
    robots: { index: true, follow: true },
  };
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cfg = await getConfiguracion();
  const colores = coloresToCssVars(parseColores(cfg.colores));

  return (
    <html lang="es-NI" className={`${display.variable} ${sans.variable}`}>
      <body style={colores as React.CSSProperties}>
        <Header
          nombreSitio={cfg.nombreSitio}
          logoUrl={cfg.logoUrl}
        />
        <main className="min-h-[60vh]">{children}</main>
        <Footer
          nombreSitio={cfg.nombreSitio}
          telefono={cfg.telefonoWhatsapp}
        />
        <CartDrawer />
      </body>
    </html>
  );
}
