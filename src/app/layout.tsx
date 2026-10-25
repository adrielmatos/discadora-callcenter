import type { Metadata, Viewport } from "next";
import "./globals.css";
import Sidebar from "@/components/Sidebar";
import AuthGuard from "@/components/AuthGuard";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#0f172a",
};

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "https://discadora-callcenter.vercel.app"),
  title: {
    default: "A&K Soluções - Call Center Pro & CRM Omnichannel",
    template: "%s | A&K Soluções"
  },
  description: "Plataforma enterprise de Contact Center, Discador Preditivo, Atendente IA Sofia para WhatsApp e CRM para correspondentes bancários e crédito consignado.",
  keywords: [
    "discador preditivo", 
    "call center", 
    "crm consignado", 
    "saque aniversario fgts", 
    "sofia ai", 
    "whatsapp web crm", 
    "credito consignado inss"
  ],
  authors: [{ name: "A&K Soluções Financeiras" }],
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
    apple: "/favicon.svg"
  },
  openGraph: {
    type: "website",
    locale: "pt_BR",
    url: "https://discadora-callcenter.vercel.app",
    title: "A&K Soluções - Call Center Pro & CRM Omnichannel",
    description: "Plataforma avançada de Contact Center, Discador Preditivo e IA Sofia integrada ao WhatsApp.",
    siteName: "A&K Soluções"
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1
    }
  }
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
