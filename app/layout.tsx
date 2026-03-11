import "./globals.css";

import { Geist, Geist_Mono } from "next/font/google";

import { ClerkProvider } from "@clerk/nextjs";
import type { Metadata } from "next";
import { Toaster } from "@/components/ui/sonner";

const BASE_URL = "https://mycheeze.vercel.app";

const geistSans = Geist({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  title: {
    default: "Cheeze — Capture One Moment Every Day",
    template: "%s | Cheeze",
  },
  description:
    "Cheeze is a minimalist, local-first photo journal. Stick one photo stamp onto your calendar every day — and build a beautiful visual diary of your life.",
  keywords: [
    "photo journal",
    "one photo a day",
    "mood tracker",
    "daily photo calendar",
    "stamp diary",
    "minimalist journal",
    "photo diary",
    "cheeze",
  ],
  authors: [{ name: "Cheeze" }],
  creator: "Cheeze",
  publisher: "Cheeze",
  applicationName: "Cheeze",
  category: "photography",

  openGraph: {
    type: "website",
    url: BASE_URL,
    siteName: "Cheeze",
    title: "Cheeze — Capture One Moment Every Day",
    description:
      "A minimalist photo-stamp calendar. Say cheese, pick a photo, and build a beautiful visual diary — one day at a time.",
    images: [
      {
        url: "/og.webp",
        width: 1200,
        height: 630,
        alt: "Cheeze — Capture One Moment Every Day",
      },
    ],
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    site: "@cheeze",
    creator: "@cheeze",
    title: "Cheeze — Capture One Moment Every Day",
    description:
      "A minimalist photo-stamp calendar. Say cheese, pick a photo, and build a beautiful visual diary — one day at a time.",
    images: ["/og.webp"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

// Runs synchronously before React hydrates so the correct dark/light class is
// already on <html> by the time any CSS is painted. This eliminates the
// flash of unstyled content and lets us remove the `!mounted` loading guard.
const themeInitScript = `
(function () {
  try {
    var stored = localStorage.getItem('stamp-diary-theme');
    var theme = stored === 'dark' || stored === 'light'
      ? stored
      : window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    if (theme === 'dark') document.documentElement.classList.add('dark');
  } catch (_) {}
})();
`.trim();

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable}`}
    >
      <head>
        {/* biome-ignore lint/security/noDangerouslySetInnerHtml: intentional synchronous theme init */}
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="font-sans antialiased">
        <ClerkProvider>
          {children}
          <Toaster position="bottom-right" richColors />
        </ClerkProvider>
      </body>
    </html>
  );
}
