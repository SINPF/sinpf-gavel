// next/font downloads and self-hosts these at BUILD time — zero runtime
// requests to Google Fonts. Important for reliability on slower links.

import { Source_Serif_4, Source_Sans_3 } from "next/font/google";

export const sourceSerif = Source_Serif_4({
  subsets: ["latin"],
  weight: ["600", "700"],
  variable: "--font-source-serif",
  display: "swap",
});

export const sourceSans = Source_Sans_3({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-source-sans",
  display: "swap",
});
