import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "FII Radar — daily FII/FPI activity",
  description:
    "Where FIIs/FPI put money to work in India today. Aggregate flows plus stock-level signals from NSE bulk and block deals.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="antialiased">{children}</body>
    </html>
  );
}