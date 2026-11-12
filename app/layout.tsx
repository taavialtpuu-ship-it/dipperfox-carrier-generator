import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { Providers } from "@/components/providers";
import "./globals.css";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"], display: "swap" });

export const metadata: Metadata = {
  title: "Dipperfox Carrier Generator",
  description: "Check which Dipperfox stump grinder — SC 400, SC 600 or SC 850 Pro — fits your excavator or loader.",
  icons: { icon: "/brand/dipperfox-logo.svg" },
};

export const viewport: Viewport = { themeColor: "#000061", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
