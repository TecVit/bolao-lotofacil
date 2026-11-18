"use client";
import { useEffect } from "react";
import { AnimatePresence, motion, useReducedMotion, type PanInfo } from "motion/react";
import { projetar } from "@/lib/fisica";
import { moeda } from "@/lib/concursos";

export type LinhaResumo = { numero: number; melhor?: number; premiados: number; ganho: number; apurando: number };

export function ResumoSheet({ aberto, onFechar, linhas, onIr, investido }: {
  aberto: boolean; onFechar: () => void; linhas: LinhaResumo[]; onIr: (numero: number) => void; investido: number;
}) {
  const reduzir = useReducedMotion();
  const feitos = linhas.filter((l) => l.melhor !== undefined);
  const total = feitos.reduce((s, l) => s + l.ganho, 0);
  const apurando = feitos.reduce((s, l) => s + l.apurando, 0);
  const premiados = feitos.reduce((s, l) => s + l.premiados, 0);
  const recorde = Math.max(0, ...feitos.map((l) => l.melhor ?? 0));
  const saldo = total - investido;
  const pago = investido > 0 ? Math.min(1, total / investido) : 0;

  useEffect(() => {
    if (!aberto) return;
    const esc = (e: KeyboardEvent) => e.key === "Escape" && onFechar();
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [aberto, onFechar]);

  function soltar(_: unknown, info: PanInfo) {
    // projeta o momentum: um flick curto para baixo já fecha
    if (info.offset.y + projetar(info.velocity.y, 0.99) > 160) onFechar();
  }

  return (
    <AnimatePresence>
      {aberto && (
        <>
          <motion.div
            className="fixed inset-0 z-40 bg-black/35"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            onClick={onFechar}
          />
          <motion.div
            role="dialog" aria-modal aria-label="Resumo do bolão"
            className="material fixed inset-x-0 bottom-0 z-50 mx-auto max-h-[85dvh] max-w-xl overflow-hidden rounded-t-[28px] pb-[env(safe-area-inset-bottom)] shadow-[var(--sombra-forte)]"
            initial={reduzir ? { opacity: 0 } : { y: "100%" }}
            animate={reduzir ? { opacity: 1 } : { y: 0 }}
            exit={reduzir ? { opacity: 0 } : { y: "100%" }}
            transition={{ type: "spring", bounce: 0.15, duration: 0.35 }}
            drag={reduzir ? false : "y"}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0.08, bottom: 0.9 }}
            onDragEnd={soltar}
          >
            <div className="flex justify-center pt-2.5 pb-1"><div className="h-1.5 w-10 rounded-full bg-texto-3/50" /></div>
            <div className="max-h-[calc(85dvh-20px)] overflow-y-auto px-5 pb-6">
              <h2 className="titulo mt-2 text-[22px] font-bold">Resumo do bolão</h2>
              {/* Dinheiro: investido, ganho e saldo (ganho − investido) */}
              <div className="mt-4 rounded-2xl bg-elev p-4">
                <div className="flex items-baseline justify-between">
                  <span className="text-[13px] font-medium text-texto-2">Saldo do bolão</span>
                  <span className={`titulo tabular text-[26px] font-bold ${saldo >= 0 ? "text-verde" : "text-texto"}`}>
                    {saldo >= 0 ? "+" : "−"}{moeda(Math.abs(saldo))}
                  </span>
                </div>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-bola" aria-hidden>
                  <motion.div className="h-full rounded-full bg-roxo"
                    initial={{ width: 0 }} animate={{ width: `${pago * 100}%` }}
                    transition={{ type: "spring", bounce: 0, duration: 0.6, delay: 0.15 }} />
                </div>
                <p className="mt-1.5 text-[11px] text-texto-3 tabular">
                  {saldo >= 0 ? "Investimento recuperado" : `${Math.round(pago * 100)}% do investimento recuperado`}
                </p>
                <div className="mt-3 grid grid-cols-2 gap-2 border-t border-linha pt-3">
                  <div>
                    <div className="text-[11px] text-texto-2">Investido</div>
                    <div className="titulo tabular text-[17px] font-bold">{moeda(investido)}</div>
                  </div>
                  <div>
                    <div className="text-[11px] text-texto-2">Ganho</div>
                    <div className="titulo tabular text-[17px] font-bold text-roxo">{moeda(total)}</div>
                    {apurando > 0 && (
                      <div className="text-[11px] text-texto-2">+ {apurando} prêmio{apurando > 1 ? "s" : ""} em apuração</div>
                    )}
                  </div>
                </div>
              </div>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <Stat valor={String(premiados)} rotulo="jogos premiados" />
                <Stat valor={`${recorde}`} rotulo="recorde de acertos" />
              </div>
              <p className="mt-5 mb-2 text-[13px] font-semibold text-texto-2">
                Melhor jogo por concurso · {feitos.length} de {linhas.length}
              </p>
              <div className="flex h-40 items-end gap-[3px]" role="list">
                {linhas.map((l, i) => {
                  const h = l.melhor === undefined ? 4 : Math.max(6, ((l.melhor - 5) / 10) * 100);
                  const premio = (l.melhor ?? 0) >= 11;
                  return (
                    <button key={l.numero} role="listitem" onClick={() => { onIr(l.numero); onFechar(); }}
                      className="pressionavel group flex h-full flex-1 flex-col items-center justify-end gap-1"
                      aria-label={`Concurso ${l.numero}: ${l.melhor ?? "sem resultado"}`}>
                      <span className={`tabular text-[9px] font-semibold ${premio ? "text-roxo" : "text-texto-3"}`}>{l.melhor ?? ""}</span>
                      <motion.div
                        initial={{ height: 0 }} animate={{ height: `${h}%` }}
                        transition={{ type: "spring", bounce: 0, duration: 0.5, delay: 0.1 + i * 0.015 }}
                        className={`w-full rounded-t-[4px] ${l.melhor === undefined ? "bg-bola" : premio ? "bg-roxo" : "bg-roxo/30"}`}
                      />
                    </button>
                  );
                })}
              </div>
              <div className="mt-1 flex justify-between text-[10px] text-texto-3 tabular">
                <span>{linhas[0]?.numero}</span><span>11+ acertos = prêmio</span><span>{linhas.at(-1)?.numero}</span>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function Stat({ valor, rotulo, destaque }: { valor: string; rotulo: string; destaque?: boolean }) {
  return (
    <div className={`rounded-2xl px-3 py-3 ${destaque ? "bg-roxo text-white" : "bg-elev"}`}>
      <div className="titulo tabular text-[17px] font-bold">{valor}</div>
      <div className={`legenda text-[11px] ${destaque ? "text-white/80" : "text-texto-2"}`}>{rotulo}</div>
    </div>
  );
}
