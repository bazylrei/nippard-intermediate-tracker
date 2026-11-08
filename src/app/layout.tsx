import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Nippard Intermediate",
  description: "Jeff Nippard Intermediate Bodybuilding Program tracker",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-zinc-950 text-zinc-100">
        {children}
      </body>
    </html>
  );
}
