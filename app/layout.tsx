import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Trevo } from "@/components/Trevo";

export const metadata: Metadata = {
  title: "Bolão Lotofácil",
  description: "Conferência diária dos jogos do bolão da Lotofácil",
  appleWebApp: { capable: true, title: "Bolão", statusBarStyle: "black-translucent" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f5f2f7" },
    { media: "(prefers-color-scheme: dark)", color: "#0e0a12" },
  ],
};

// Aplica o tema salvo antes da primeira pintura (sem "piscar" no tema errado).
const scriptTema = `try{var t=localStorage.getItem("tema");if(t==="light"||t==="dark"){document.documentElement.dataset.theme=t;var c=t==="dark"?"#0e0a12":"#f5f2f7";document.addEventListener("DOMContentLoaded",function(){document.querySelectorAll('meta[name="theme-color"]').forEach(function(m){m.content=c})})}}catch(e){}`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR" className="h-full" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: scriptTema }} />
      </head>
      <body className="min-h-full">
        <div className="aurora trevos-fundo" aria-hidden>
          <Trevo className="-left-24 -top-20 size-72 rotate-[-20deg] text-roxo lg:size-96" />
          <Trevo className="-right-28 top-[38%] size-80 rotate-[25deg] text-[#ff6fb5] lg:size-[28rem]" />
          <Trevo className="-bottom-24 -left-16 size-64 rotate-[10deg] text-roxo-claro lg:size-80" />
          <Trevo className="right-[12%] -bottom-10 hidden size-40 rotate-[-35deg] text-roxo lg:block" />
        </div>
        {children}
      </body>
    </html>
  );
}
