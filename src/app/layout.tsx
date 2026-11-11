import type { Metadata, Viewport } from "next";
import { Barlow_Condensed, Barlow } from "next/font/google";
import "./globals.css";
import { ProgramProvider } from "@/context/ProgramContext";

const barlowCondensed = Barlow_Condensed({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
  variable: "--font-barlow-condensed",
  display: "swap",
});

const barlow = Barlow({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-barlow",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Nippard Intermediate",
  description: "Jeff Nippard Intermediate Bodybuilding Program tracker",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`h-full antialiased ${barlowCondensed.variable} ${barlow.variable}`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col bg-bg text-fg safe-top">
        <ProgramProvider>{children}</ProgramProvider>
      </body>
    </html>
  );
}
