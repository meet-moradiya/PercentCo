import type { Metadata } from "next";
import { Playfair_Display, Inter } from "next/font/google";
import { ThemeProvider } from "@/context/ThemeProvider";
import "./globals.css";

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  display: "swap",
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Percentco — Fine Dining Experience",
  description:
    "Experience exquisite cuisine in an intimate, luxurious setting. Percentco offers artfully crafted dishes, an award-winning wine list, and unforgettable dining moments for discerning palates.",
  keywords: [
    "fine dining",
    "luxury restaurant",
    "upscale dining",
    "reservations",
    "gourmet food",
  ],
  openGraph: {
    title: "Percentco — Fine Dining Experience",
    description:
      "Experience exquisite cuisine in an intimate, luxurious setting.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="scroll-smooth" suppressHydrationWarning>
      <body className={`${playfair.variable} ${inter.variable} antialiased`}>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
