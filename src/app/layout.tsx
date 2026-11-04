import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { AppProviders } from "@/components/app-providers";
import "./globals.css";

const font = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Simply a screenshot app — Screenshot editor",
  description: "Design and export screenshots for the App Store and Google Play.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="stylesheet" href="/fonts/fonts.css" />
      </head>
      <body className={font.className}>
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
