"use client";
import dynamic from "next/dynamic";

// Só no cliente: tudo depende da hora de Brasília "agora" e de dados ao vivo.
export const PainelCliente = dynamic(() => import("./Painel").then((m) => m.Painel), {
  ssr: false,
  loading: () => (
    <main className="mx-auto max-w-xl px-4 pt-6">
      <div className="h-[68px] animate-pulse rounded-[22px] bg-bola/70" style={{ marginTop: 72 }} />
      <div className="cartao mt-4 h-[520px] animate-pulse" />
    </main>
  ),
});
