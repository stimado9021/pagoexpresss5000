import type { Metadata } from "next";
import { Sora, Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const sora = Sora({
  subsets: ["latin"],
  variable: "--font-display",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-body",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://kreditools.shop'),
  title: {
    default: "Kreditools — Software para prestamistas y gestión de préstamos",
    template: "%s | Kreditools",
  },
  description: "Kreditools es el software integral para prestamistas y empresas de crédito: gestión de cobros, agentes, intereses, cartera y reportes en un solo panel. Sin libretas ni Excel.",
  keywords: [
    "software para prestamistas",
    "app para prestamistas",
    "sistema de gestión de préstamos",
    "software de cobranza de créditos",
    "programa para controlar préstamos",
    "gestión de cartera de crédito",
    "app para cobrar préstamos",
    "software para empresas de crédito",
    "control de préstamos",
    "prestamistas Colombia",
  ],
  applicationName: "Kreditools",
  authors: [{ name: "Kreditools" }],
  openGraph: {
    type: "website",
    locale: "es_CO",
    url: "/",
    siteName: "Kreditools",
    title: "Kreditools — Software para prestamistas y gestión de préstamos",
    description: "Gestiona cobros, agentes, intereses y cartera de crédito desde un solo panel. Sin libretas ni Excel.",
    images: [
      {
        url: "/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "Kreditools — Software para prestamistas",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Kreditools — Software para prestamistas",
    description: "Gestiona cobros, agentes, intereses y cartera de crédito desde un solo panel.",
    images: ["/og-image.jpg"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  alternates: {
    canonical: "/",
  },
  icons: {
    icon: "/logo.png",
  },
  category: "software",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className={`${sora.variable} ${inter.variable} ${jetbrainsMono.variable} h-full antialiased`}
    >
        <body className="min-h-full flex flex-col bg-emerald-950 text-zinc-100 font-body">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@graph": [
                {
                  "@type": "Organization",
                  "@id": "https://kreditools.shop/#organization",
                  name: "Kreditools",
                  url: "https://kreditools.shop/",
                  logo: "https://kreditools.shop/logo.png",
                  sameAs: [],
                },
                {
                  "@type": "WebSite",
                  "@id": "https://kreditools.shop/#website",
                  url: "https://kreditools.shop/",
                  name: "Kreditools",
                  publisher: { "@id": "https://kreditools.shop/#organization" },
                  inLanguage: "es-CO",
                },
                {
                  "@type": "SoftwareApplication",
                  "@id": "https://kreditools.shop/#software",
                  name: "Kreditools",
                  applicationCategory: "BusinessApplication",
                  operatingSystem: "Web",
                  description: "Software para prestamistas y empresas de crédito: gestión de cobros, agentes, intereses, cartera y reportes.",
                  offers: {
                    "@type": "AggregateOffer",
                    priceCurrency: "COP",
                    lowPrice: "39000",
                    highPrice: "249000",
                  },
                  url: "https://kreditools.shop/",
                  publisher: { "@id": "https://kreditools.shop/#organization" },
                  inLanguage: "es-CO",
                },
              ],
            }),
          }}
        />
        <script dangerouslySetInnerHTML={{ __html: "if('serviceWorker' in navigator){navigator.serviceWorker.getRegistrations().then(function(r){r.forEach(function(s){s.unregister()})})}" }} />
        {children}
      </body>
    </html>
  );
}
