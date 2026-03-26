import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "PriceScope — Compare Prices Across Indonesian Marketplaces",
  description:
    "Find the best deals on Tokopedia, Shopee, and Lazada in one place. Compare prices, filter by condition, and shop smarter.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id">
      <body className={inter.className}>{children}</body>
    </html>
  );
}
