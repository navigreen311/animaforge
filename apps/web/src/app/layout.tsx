import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "@/styles/globals.css";
import QueryProvider from "@/providers/QueryProvider";
import AuthProvider from "@/providers/AuthProvider";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "AnimaForge",
  description: "AI-powered animation studio",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className={inter.className}>
        <QueryProvider>
          <AuthProvider>
            <main className="min-h-screen">{children}</main>
          </AuthProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
