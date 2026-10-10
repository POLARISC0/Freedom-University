import type { Metadata } from "next";
import { Geist, Geist_Mono, Fraunces } from "next/font/google";
import { NavBar } from "@/components/NavBar";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });
const fraunces = Fraunces({ variable: "--font-serif-display", subsets: ["latin"] });

export const metadata: Metadata = {
  title: { default: "Freedom University", template: "%s · Freedom University" },
  description: "A crypto and finance classroom taught by AI professors. Education only, never financial advice.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${fraunces.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col font-sans">
        <NavBar />
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6">{children}</main>
        <footer className="border-t border-line py-6 text-center text-xs text-muted">
          Freedom University provides education only. Nothing here is financial, investment, tax or legal advice.
        </footer>
      </body>
    </html>
  );
}
