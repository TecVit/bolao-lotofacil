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

// Trevos grandes e parados no fundo, espalhados e cortados pelas bordas da tela
const TREVOS_FUNDO = [
  "-left-20 -top-16 size-64 rotate-[-20deg] text-roxo lg:size-96",
  "-right-24 top-[30%] size-72 rotate-[25deg] text-[#ff6fb5] lg:top-[22%] lg:size-[26rem]",
  "-left-28 top-[58%] size-56 rotate-[48deg] text-roxo-claro lg:size-80",
  "-bottom-20 right-[8%] size-48 rotate-[-35deg] text-roxo lg:size-72",
  "left-[38%] top-[6%] hidden size-24 rotate-[12deg] text-[#ff6fb5] lg:block",
];

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR" className="h-full" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: scriptTema }} />
      </head>
      <body className="min-h-full">
        <div className="aurora overflow-hidden" aria-hidden>
          {TREVOS_FUNDO.map((c, i) => (
            <Trevo key={i} className={`absolute ${c}`} style={{ opacity: "var(--trevo-fundo, 0.06)" }} />
          ))}
        </div>
        {children}
      </body>
    </html>
  );
}
