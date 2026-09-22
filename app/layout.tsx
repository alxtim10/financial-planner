import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import ChatDrawer from "@/components/ChatDrawer";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "TabungOne",
  description: "Asisten perencana keuangan pribadi berbasis AI (PoC)",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body>
        {children}
        {/* Chatbot pelengkap tersedia di semua halaman: tombol ikon di sudut
            kanan atas (z-30, di atas konten) memicu panel geser (z-50) dengan
            backdrop (z-40). ChatDrawer bersifat self-contained. */}
        <ChatDrawer triggerClassName="fixed right-4 top-4 z-30" />
      </body>
    </html>
  );
}
