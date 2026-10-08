import type { Metadata } from "next";
import "./globals.css";
import Sidebar from "@/components/Sidebar";
import AuthGuard from "@/components/AuthGuard";

export const metadata: Metadata = {
  title: "A&K Soluções - Call Center Pro",
  description: "Plataforma avançada de call center, discador e esteira de contratos",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body className="antialiased bg-[#f8fafc] text-slate-900 flex h-screen overflow-hidden">
        <AuthGuard>
          <Sidebar />
          <div className="flex-1 flex flex-col h-screen overflow-hidden relative">
            {children}
          </div>
        </AuthGuard>
      </body>
    </html>
  );
}
