import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Providers } from "./providers";
import SharedNav from "@/components/nav";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "APEX — AI Trading Signals",
  description: "Professional AI-powered trading signals for forex and crypto.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} bg-surface text-text-primary antialiased`}>
        <Providers>
          <SharedNav />
          {children}
        </Providers>
      </body>
    </html>
  );
}
