import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ProgramProvider } from "@/context/ProgramContext";

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
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-zinc-950 text-zinc-100 safe-top">
        <ProgramProvider>{children}</ProgramProvider>
      </body>
    </html>
  );
}
