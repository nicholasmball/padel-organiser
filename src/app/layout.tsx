import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { BottomNav } from "@/components/layout/bottom-nav";
import { SideNav } from "@/components/layout/side-nav";
import { Header } from "@/components/layout/header";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Padel Organiser",
  description: "Organise padel games with your community",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} antialiased`}>
        <div className="flex min-h-screen">
          <SideNav />
          <div className="flex min-w-0 flex-1 flex-col">
            <Header />
            <main className="flex-1 px-4 py-4 pb-24 md:px-6 md:pb-6">
              {children}
            </main>
          </div>
        </div>
        <BottomNav />
        <Toaster position="top-center" richColors />
      </body>
    </html>
  );
}
