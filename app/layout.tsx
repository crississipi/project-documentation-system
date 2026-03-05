import type { Metadata, Viewport } from "next";
import { Inter, Source_Code_Pro } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/app/context/AuthContext";
import { ThemeProvider } from "@/app/context/ThemeContext";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const sourceCodePro = Source_Code_Pro({
  variable: "--font-source-code-pro",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "OnTap Dev Documentation",
  description: "Professional documentation management for your development projects.",
  // Prevents phone numbers being auto-linked on iOS Safari
  formatDetection: { telephone: false, email: false, address: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  themeColor: "#7c3aed",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // suppressHydrationWarning: ThemeProvider mutates the <html> element
    // (data-theme attribute, "dark" class) after mount via useEffect, which
    // intentionally differs from the server-rendered HTML.
    <html lang="en" className="h-full" suppressHydrationWarning>
      <body
        className={`${inter.variable} ${sourceCodePro.variable} antialiased min-h-full bg-white`}
      >
        <ThemeProvider>
          <AuthProvider>{children}</AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
