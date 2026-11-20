import type { Metadata, Viewport } from "next";
import { Barlow_Condensed, Barlow } from "next/font/google";
import "./globals.css";
import { ProgramProvider } from "@/context/ProgramContext";
import { RestTimerProvider } from "@/context/RestTimerContext";
import { THEME_INIT_SCRIPT } from "@/lib/theme";

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

/** The app's name, kept from when it tracked one program only. */
const APP_NAME = "Nippard Intermediate";

export const metadata: Metadata = {
  title: APP_NAME,
  description: `${APP_NAME} program tracker`,
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // Stops iOS Safari auto-zooming when an input with <16px text is focused
  // (it leaves the page zoomed after blur). iOS still allows pinch-zoom.
  maximumScale: 1,
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
      <head>
        {/* Applies a saved light/dark choice before first paint; html has suppressHydrationWarning for its class. */}
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="min-h-full flex flex-col bg-bg text-fg safe-top">
        <RestTimerProvider>
          <ProgramProvider>{children}</ProgramProvider>
        </RestTimerProvider>
      </body>
    </html>
  );
}
