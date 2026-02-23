import type { Metadata } from "next";
import { IBM_Plex_Mono, Rajdhani, Teko } from "next/font/google";
import { ToastProvider } from "@/components/ui";
import { siteConfig } from "@/constants/site";
import "../styles/tokens.css";
import "./globals.css";

const uiSans = Rajdhani({
  variable: "--font-ufe-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const display = Teko({
  variable: "--font-ufe-display",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const plexMono = IBM_Plex_Mono({
  variable: "--font-ufe-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: siteConfig.name,
  description: siteConfig.description,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${uiSans.variable} ${display.variable} ${plexMono.variable} antialiased bg-[var(--background)] text-[var(--foreground)]`}
      >
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
