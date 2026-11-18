"use client";
import { motion, useReducedMotion } from "motion/react";
import { premiado } from "@/lib/conferir";
import { moeda } from "@/lib/concursos";

export function JogoRow({ rotulo, jogo, dezenas, acertos, valor, chave }: {
  rotulo: string; jogo: number[]; dezenas?: number[]; acertos: number; valor?: number; chave: string;
}) {
  const reduzir = useReducedMotion();
  const s = new Set(dezenas ?? []);
  const tem = !!dezenas;
  const ganhou = tem && premiado(acertos);
  return (
    <div className={`relative overflow-hidden rounded-2xl px-3 py-2.5 ${ganhou ? "bg-roxo-suave" : ""}`}>
      {ganhou && <div key={chave} className="brilho pointer-events-none absolute inset-0" />}
      <div className="mb-2 flex items-center justify-between">
        <span className="legenda text-[12px] font-semibold text-texto-2">{rotulo}</span>
        {tem ? (
          <motion.span
            key={chave}
            initial={reduzir ? { opacity: 0 } : { scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", bounce: ganhou ? 0.4 : 0, duration: 0.45, delay: 0.5 }}
            className={`tabular rounded-full px-2.5 py-0.5 text-[12px] font-bold ${
              ganhou ? "bg-roxo text-white" : "bg-bola text-texto-2"
            }`}
          >
            {acertos} acertos{ganhou && valor ? ` · ${moeda(valor)}` : ""}
          </motion.span>
        ) : (
          <span className="text-[12px] text-texto-3">aguardando</span>
        )}
      </div>
      <div className="grid grid-cols-[repeat(15,minmax(0,1fr))] gap-[3px] sm:gap-1">
        {jogo.slice(0, 15).map((d, i) => {
          const hit = s.has(d);
          return (
            <motion.div
              key={`${chave}-${d}`}
              initial={tem && hit && !reduzir ? { scale: 0.5 } : false}
              animate={{ scale: 1 }}
              transition={{ type: "spring", bounce: 0.3, duration: 0.4, delay: 0.25 + i * 0.02 }}
              className={`grid aspect-square place-items-center rounded-full text-[10px] font-semibold tabular sm:text-[11px] ${
                hit ? "bg-roxo text-white" : tem ? "bg-bola text-texto-3" : "bg-bola text-texto-2"
              }`}
            >
              {String(d).padStart(2, "0")}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
