import type { Metadata } from "next";
import { Instrument_Serif, DM_Sans } from "next/font/google";
import "./globals.css";

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
    icon: "/logo.jpeg",
    shortcut: "/logo.jpeg",
    apple: "/logo.jpeg",
  },
  openGraph: {
    title: "Frontdeploy — Solana Launch Intelligence",
    description:
      "AI-powered X-to-pump.fun launch radar for Solana. Scan narratives, generate launch drafts, deploy faster.",
    images: [
      {
        url: "/logo.jpeg",
        width: 1254,
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
      <body>{children}</body>
    </html>
  );
}
