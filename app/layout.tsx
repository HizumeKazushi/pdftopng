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
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
