import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Chișinău · Centru 3D",
  description: "Explorează Chișinăul în Streets GL și accesează jocul 3D din centrul orașului.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ro">
      <body className="antialiased">{children}</body>
    </html>
  );
}
