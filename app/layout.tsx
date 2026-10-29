import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import BottomNav from "@/components/BottomNav";
import TopHeaderBar from "@/components/TopHeaderBar";

const inter = Inter({
  subsets: ["latin", "vietnamese"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "SpeakFlow - Phản xạ Giao tiếp Tiếng Anh (PC & Mobile)",
  description:
    "Ứng dụng luyện phản xạ giao tiếp tiếng Anh với phương pháp Chunking, Active Recall, Spaced Repetition (SM-2) & Luyện nói Shadowing.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "SpeakFlow",
  },
  icons: {
    icon: "/icon.svg",
    apple: "/icon.svg",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#020617",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi" className="dark">
      <body
        className={`${inter.variable} font-sans bg-slate-950 text-slate-100 min-h-screen`}
      >
        <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col md:flex-row">
          <BottomNav />
          <main className="flex-1 md:pl-72 lg:pl-80 pb-24 md:pb-10">
            <TopHeaderBar />
            <div className="max-w-md md:max-w-6xl mx-auto w-full">
              {children}
            </div>
          </main>
        </div>
      </body>
    </html>
  );
}
