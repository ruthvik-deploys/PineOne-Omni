import type { Metadata, Viewport } from "next";
import { Geist_Mono } from "next/font/google";
import localFont from "next/font/local";
import { ThemeProvider } from "@/components/theme-provider";
import { SITE_URL } from "@/lib/site-url";
import "./globals.css";

// Allo by Josh Puckett (SIL OFL 1.1, app/fonts/allo/OFL.txt). One variable file: weight 100–900, optical size 9–32.
const allo = localFont({
  src: "./fonts/allo/AlloVariable.woff2",
  variable: "--font-allo",
  weight: "100 900",
  display: "swap",
  fallback: ["system-ui", "sans-serif"],
});
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  metadataBase: SITE_URL,
  title: { default: "Playground", template: "%s · Playground" },
  description: "Prototypes",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" suppressHydrationWarning className={`${allo.variable} ${geistMono.variable} antialiased`}>
      <body className="min-h-dvh bg-background text-foreground">
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem disableTransitionOnChange>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
