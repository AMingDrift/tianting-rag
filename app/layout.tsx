import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { Analytics } from "@vercel/analytics/next"

export const metadata: Metadata = {
  title: "天听计划 RAG 个人知识库项目",
  description:
    'A personal knowledge base project based on RAG (Retrieval Enhanced Generation) technology, designed specifically for processing and querying the content of the science fiction novel "Project Sky Hearing: The Ross Trap".',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`antialiased bg-[url('/tianting.png')] bg-cover bg-center bg-no-repeat min-h-screen`}
      >
        {children}
        <Toaster />
        <Analytics />
      </body>
    </html>
  );
}
