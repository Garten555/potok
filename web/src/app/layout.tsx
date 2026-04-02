import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "plyr/dist/plyr.css";
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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ru"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
