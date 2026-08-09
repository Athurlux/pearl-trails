import type { Metadata, Viewport } from "next";
import { Fraunces, Inter } from "next/font/google";
import "./globals.css";

/**
 * Two families only, both variable, latin subset — keeps the font payload small
 * while giving the editorial serif / clean sans pairing the brand needs.
 */
const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  display: "swap",
  axes: ["SOFT", "WONK"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://pearl-trails.pages.dev";
const title = "Pearl Trails — Discover Uganda differently";
const description =
  "Find remarkable lodges, campsites and unforgettable experiences across the most beautiful destinations in Uganda.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: title,
    template: "%s · Pearl Trails",
  },
  description,
  applicationName: "Pearl Trails",
  keywords: [
    "Uganda travel",
    "safari lodges Uganda",
    "campsites Uganda",
    "Bwindi gorilla trekking",
    "Kidepo Valley",
    "Lake Bunyonyi",
    "East Africa travel",
  ],
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    siteName: "Pearl Trails",
    title,
    description,
    url: siteUrl,
    locale: "en_UG",
    images: [
      {
        url: "/img/hero-uganda.jpg",
        width: 2400,
        height: 1601,
        alt: "Terraced hillsides above a lake in southwestern Uganda",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
    images: ["/img/hero-uganda.jpg"],
  },
  icons: {
    icon: "/favicon.ico",
    apple: "/apple-icon.png",
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: "#0F3D32",
  width: "device-width",
  initialScale: 1,
};

/** Minimal, honest structured data — organisation and site only, no fake listings. */
const structuredData = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "Pearl Trails",
  url: siteUrl,
  description,
  publisher: {
    "@type": "Organization",
    name: "Pearl Trails",
    slogan: "Stays that stay with you",
    logo: `${siteUrl}/brand/logo-primary.png`,
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${fraunces.variable} ${inter.variable} antialiased`}>
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded focus:bg-forest focus:px-4 focus:py-2 focus:text-ivory"
        >
          Skip to content
        </a>
        {children}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
      </body>
    </html>
  );
}
