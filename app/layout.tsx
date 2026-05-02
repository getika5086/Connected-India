import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Connected India — Village Roads Explorer",
  description:
    "Look up any village in India and explore the moment it got connected — its first all-weather road under PMGSY.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-white text-gray-900 antialiased">{children}</body>
    </html>
  );
}
