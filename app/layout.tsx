import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PDF to PNG Converter",
  description: "Convert PDF files to PNG images",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Zen+Kaku+Gothic+New:wght@400;500;700&display=swap" rel="stylesheet" />
      </head>
      <body className="antialiased font-zen">
        {children}
      </body>
    </html>
  );
}
