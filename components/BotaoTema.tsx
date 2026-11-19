"use client";
import { useSyncExternalStore } from "react";
import { vibrar } from "@/lib/fisica";

type Tema = "light" | "dark";
const COR: Record<Tema, string> = { light: "#f5f2f7", dark: "#0e0a12" };

function temaAtual(): Tema {
  const d = document.documentElement.dataset.theme;
  if (d === "light" || d === "dark") return d;
  return matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

const EVENTO = "tema-mudou";
function assinar(cb: () => void) {
  const mq = matchMedia("(prefers-color-scheme: dark)");
  mq.addEventListener("change", cb); // sem escolha salva, acompanha o sistema
  window.addEventListener(EVENTO, cb);
  return () => { mq.removeEventListener("change", cb); window.removeEventListener(EVENTO, cb); };
}

/** Botão discreto de sol/lua que força claro ou escuro (salvo no aparelho). */
export function BotaoTema() {
  // null no servidor → ícone só aparece no cliente (sem mismatch de hidratação)
  const tema = useSyncExternalStore<Tema | null>(assinar, temaAtual, () => null);

  function alternar() {
    const novo: Tema = temaAtual() === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = novo;
    document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]').forEach((m) => (m.content = COR[novo]));
    try { localStorage.setItem("tema", novo); } catch { /* modo privado */ }
    vibrar(8);
    window.dispatchEvent(new Event(EVENTO));
  }

  const escuro = tema === "dark";
  return (
    <button
      type="button"
      onClick={alternar}
      aria-label={escuro ? "Mudar para tema claro" : "Mudar para tema escuro"}
      title={escuro ? "Tema claro" : "Tema escuro"}
      className="pressionavel ml-1 grid size-7 place-items-center rounded-full text-texto-3 transition-colors hover:bg-bola/60 hover:text-roxo"
    >
      {tema && (
        <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth={2}
          strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          {escuro ? (
            <>
              <circle cx="12" cy="12" r="4" />
              <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
            </>
          ) : (
            <path d="M21 12.79A9 9 0 1 1 11.21 3a7 7 0 0 0 9.79 9.79z" />
          )}
        </svg>
      )}
    </button>
  );
}
