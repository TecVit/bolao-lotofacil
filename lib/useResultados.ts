"use client";
import { useEffect, useRef, useState } from "react";
import { collection, doc, onSnapshot } from "firebase/firestore";
import { clientDb } from "./firebase-client";
import { concursos, dataPrevista, hojeSP, horaSP, jaSorteado, horaSorteio } from "./concursos";
import type { Estado, Resultado } from "./tipos";

type Dados = { resultados: Map<number, Resultado>; estado: Estado | null; carregando: boolean; online: boolean };

/**
 * Firestore em tempo real quando configurado; senão polling de /api/resultados.
 * Em ambos os casos, se um concurso já sorteado ainda não chegou, cutuca a API
 * (que sincroniza com a Caixa) — no máximo a cada 30s na janela do sorteio.
 */
export function useResultados(): Dados {
  const [resultados, setResultados] = useState<Map<number, Resultado>>(new Map());
  const [estado, setEstado] = useState<Estado | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [online, setOnline] = useState(true);
  const ref = useRef(resultados);
  useEffect(() => { ref.current = resultados; }, [resultados]);

  useEffect(() => {
    const db = clientDb();
    let vivo = true;
    let usarApi = !db; // vira true se o Firestore negar a leitura
    const unsubs: (() => void)[] = [];

    const buscarApi = async () => {
      try {
        const r = await fetch("/api/resultados", { cache: "no-store" });
        const j = (await r.json()) as { resultados: Resultado[]; estado: Estado | null };
        if (!vivo) return;
        setOnline(true);
        if (usarApi) {
          setResultados(new Map(j.resultados.map((x) => [x.numero, x])));
          setEstado(j.estado);
        }
      } catch {
        if (vivo) setOnline(false);
      } finally {
        if (vivo) setCarregando(false);
      }
    };

    if (db) {
      unsubs.push(
        onSnapshot(collection(db, "resultados"), (s) => {
          setResultados(new Map(s.docs.map((d) => { const r = d.data() as Resultado; return [r.numero, r]; })));
          setCarregando(false);
        }, () => {
          // regras não publicadas / sem rede: cai para a API do próprio site
          if (!usarApi) { usarApi = true; buscarApi(); }
        }),
        onSnapshot(doc(db, "meta/estado"), (s) => setEstado((s.data() as Estado) ?? null), () => null),
      );
    } else {
      buscarApi();
    }

    // concurso de dia anterior que ainda não chegou
    const atrasado = () => concursos.some((n) => !ref.current.has(n) && dataPrevista(n) < hojeSP());

    const tick = () => {
      const faltando = concursos.some((n) => jaSorteado(n) && !ref.current.has(n));
      if (!faltando) return;
      // Sem Firebase: polling a partir da hora do sorteio (21h; domingo 11h). Com Firebase:
      // o cron grava e o onSnapshot entrega; só cutucamos a API 1h30 depois sem resultado.
      const hora = horaSorteio(hojeSP());
      if (horaSP() < (!usarApi ? hora + 1.5 : hora) && !atrasado()) return;
      buscarApi();
    };
    const id = setInterval(tick, 30_000);
    const visivel = () => document.visibilityState === "visible" && (usarApi ? buscarApi() : tick());
    document.addEventListener("visibilitychange", visivel);

    return () => {
      vivo = false;
      unsubs.forEach((u) => u());
      clearInterval(id);
      document.removeEventListener("visibilitychange", visivel);
    };
  }, []);

  return { resultados, estado, carregando, online };
}

