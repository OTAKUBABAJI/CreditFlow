import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Web3Provider } from "@/providers/Web3Provider";
import { Toaster } from "react-hot-toast";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: 'swap',
});

export const metadata: Metadata = {
  title: "CreditFlow | Decentralized Factoring for SMEs",
  description: "Tokenize invoices and get instant liquidity using DeFi.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.variable} antialiased font-sans`}>
        <Web3Provider>
          {children}
          <Toaster
            position="bottom-right"
            toastOptions={{
              style: {
                background: '#111117',
                color: '#fff',
                border: '1px solid rgba(255,255,255,0.1)'
              }
            }}
          />
        </Web3Provider>
      </body>
    </html>
  );
}
