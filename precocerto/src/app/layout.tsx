import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "PreçoCerto - Precificação Inteligente",
  description: "Aplicação para calcular e organizar a precificação de produtos",
  charset: "utf-8",
  viewport: "width=device-width, initial-scale=1",
  icons: {
    icon: [
      {
        url: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>💰</text></svg>",
        type: "image/svg+xml",
      },
    ],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-AO" className="h-full">
      <body className={`${inter.className} h-full bg-white antialiased`}>
        {children}
      </body>
    </html>
  );
}
