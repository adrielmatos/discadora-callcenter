import type { Metadata, Viewport } from "next";
import "./globals.css";
import AppShell from "@/components/AppShell";
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
    default: "Discadora Consignado Pro | A&K Soluções - CRM & Discador pelo Celular",
    template: "%s | Discadora Consignado Pro"
  },
  description: "A única discadora desenvolvida para correspondentes de crédito consignado. Zero custo de telefonia VoIP (disque direto pelo chip do celular via PC), esteira Meu INSS, simulador de margem e IA Sofia.",
  keywords: [
    "discadora consignado pro",
    "discador preditivo", 
    "call center consignado", 
    "crm correspondente bancario", 
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
    title: "Discadora Consignado Pro - CRM & Discador pelo Celular",
    description: "Plataforma de alta conversão para correspondentes bancários. Discagem via chip GSM celular, esteira integrada e atendente IA Sofia.",
    siteName: "Discadora Consignado Pro"
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
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body className="antialiased bg-slate-950 text-slate-100 min-h-screen">
        <AuthGuard>
          <AppShell>
            {children}
          </AppShell>
        </AuthGuard>
      </body>
    </html>
  );
}
