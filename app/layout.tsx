import type { Metadata, Viewport } from "next";
import "./globals.css";

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
        <div className="aurora" aria-hidden />
        {children}
      </body>
    </html>
  );
}
