import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AppShell } from "@/components/layout/app-shell";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ПОТОК",
  description: "Видеоплатформа: просмотр, каналы, подписки",
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
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
