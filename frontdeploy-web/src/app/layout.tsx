import type { Metadata } from "next";
import { Instrument_Serif, DM_Sans } from "next/font/google";
import "./globals.css";
import { TokenGateProvider } from "@/contexts/TokenGateContext";
const instrumentSerif = Instrument_Serif({
  weight: ["400"],
  style: ["normal", "italic"],
  subsets: ["latin"],
  variable: "--font-instrument-serif",
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
});

export const metadata: Metadata = {
  title: "Frontdeploy — Solana Launch Intelligence",
  description:
    "AI-powered X-to-pump.fun launch radar for Solana. Scan narratives, generate launch drafts, deploy faster.",
  icons: {
    icon: "/logo.png",
    shortcut: "/logo.png",
    apple: "/logo.png",
  },
  openGraph: {
    title: "Frontdeploy — Solana Launch Intelligence",
    description:
      "AI-powered X-to-pump.fun launch radar for Solana. Scan narratives, generate launch drafts, deploy faster.",
    images: [
      {
        url: "/logo.png",
        width: 1200,
        height: 1254,
        alt: "Frontdeploy logo",
      },
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${instrumentSerif.variable} ${dmSans.variable}`}
    >
      <body suppressHydrationWarning>
        <TokenGateProvider>
          {children}
        </TokenGateProvider>
      </body>
    </html>
  );
}
