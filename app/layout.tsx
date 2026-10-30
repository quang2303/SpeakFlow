import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import AppLayoutShell from "@/components/AppLayoutShell";

const GA_MEASUREMENT_ID =
  process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || "G-DN1CBCYRJH";

const inter = Inter({
  subsets: ["latin", "vietnamese"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "SpeakFlow - Giao tiếp Tiếng Anh phản xạ",
  description:
    "Ứng dụng luyện phản xạ giao tiếp tiếng Anh đơn giản, thân thiện với phương pháp Chunking, Active Recall, Spaced Repetition (SM-2) & Shadowing.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
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
  themeColor: "#10B981",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi" data-theme="emerald">
      <head>
        {/* Google Analytics 4 (GA4) */}
        <Script
          strategy="afterInteractive"
          src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
        />
        <Script
          id="google-analytics"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', '${GA_MEASUREMENT_ID}', {
                page_path: window.location.pathname,
              });
            `,
          }}
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                var savedTheme = localStorage.getItem('speakflow_color_theme');
                if (savedTheme) {
                  document.documentElement.setAttribute('data-theme', savedTheme);
                }
              } catch (e) {}
            `,
          }}
        />
      </head>
      <body
        className={`${inter.variable} font-sans bg-white text-slate-800 min-h-screen`}
      >
        <AppLayoutShell>{children}</AppLayoutShell>
      </body>
    </html>
  );
}
