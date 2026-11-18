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

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR" className="h-full">
      <body className="min-h-full">
        <div className="aurora" aria-hidden />
        {children}
      </body>
    </html>
  );
}
