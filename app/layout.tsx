import type { Metadata } from "next";
import { Geist, Geist_Mono, Source_Code_Pro, Raleway } from "next/font/google";
import "./globals.css";
import Navbar from "@/app/components/navbar";
import { ThemeProvider, ThemeWrapper } from "./components/ui";

const sourceCodePro = Raleway({
  variable: "--font-source-code-pro",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
});

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "PriceView",
  description: "Financial tracking platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {

  return (
      <html lang="en">
        <body
          className={`${geistSans.variable} ${geistMono.variable} ${sourceCodePro.variable} antialiased`}
          style={{
            minHeight: '100vh',
            margin: 0,
            padding: 0
          }}
        >
          <ThemeProvider>
            <ThemeWrapper>
              <div style={{ position: 'relative', zIndex: 1, minHeight: '100vh' }}>
                <Navbar />
                {children}
              </div>
            </ThemeWrapper>
          </ThemeProvider>
        </body>
      </html>
  );
}



