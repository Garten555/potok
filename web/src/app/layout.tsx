import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AppShell } from "@/components/layout/app-shell";
import { NavigationProgress } from "@/components/layout/navigation-progress";
import { getMetadataBase } from "@/lib/site-url";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: getMetadataBase(),
  title: {
    default: "ПОТОК — видеоплатформа",
    template: "%s · ПОТОК",
  },
  description: "Видеоплатформа: просмотр, каналы, подписки",
  applicationName: "ПОТОК",
  openGraph: {
    type: "website",
    locale: "ru_RU",
    siteName: "ПОТОК",
    title: "ПОТОК — видеоплатформа",
    description: "Видеоплатформа: просмотр, каналы, подписки",
  },
  twitter: {
    card: "summary_large_image",
    title: "ПОТОК",
    description: "Видеоплатформа: просмотр, каналы, подписки",
  },
  robots: { index: true, follow: true },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0a0e18",
  viewportFit: "cover",
};

function supabaseOriginForPreconnect(): string | null {
  const u = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!u) return null;
  try {
    return new URL(u).origin;
  } catch {
    return null;
  }
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const preconnect = supabaseOriginForPreconnect();
  return (
    <html
      lang="ru"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        {preconnect ? (
          <link rel="preconnect" href={preconnect} crossOrigin="anonymous" />
        ) : null}
      </head>
      <body className="min-h-full flex flex-col">
        <NavigationProgress />
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
