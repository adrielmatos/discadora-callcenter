"use client";

import React from "react";

export default function RootLandingPage() {
  return (
    <main className="w-full h-screen bg-[#040814] overflow-hidden">
      <iframe
        src="/landing.html"
        title="Discadora Consignado Pro — CRM & Discador pelo Celular para Crédito Consignado"
        className="w-full h-screen border-0 block"
        style={{ width: "100%", height: "100vh", border: "none" }}
      />
    </main>
  );
}
