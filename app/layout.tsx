import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "げんきメーター",
  description: "チームのげんきを見える化する",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}