"use client";
import { motion, useReducedMotion } from "motion/react";
import { moeda } from "@/lib/concursos";
import type { Resultado } from "@/lib/tipos";

const n = (v: number) => v.toLocaleString("pt-BR");

/** Premiação oficial do concurso: quanto pagou cada faixa e quantos ganharam. */
export function Premiacao({ r, estimativa, nossos }: {
  r: Resultado;
  /** estimativa divulgada antes do sorteio (15 acertos), se conhecida */
  estimativa?: number;
  /** quantos jogos nossos caíram em cada faixa de acertos */
  nossos: Record<number, number>;
}) {
  const reduzir = useReducedMotion();
  const faixas = [...r.premios].sort((a, b) => b.acertos - a.acertos);
  const principal = faixas.find((f) => f.acertos === 15);
  const publicado = faixas.some((f) => f.valor > 0);
  const totalPago = faixas.reduce((s, f) => s + f.ganhadores * f.valor, 0);

  return (
    <motion.section
      key={r.numero}
      initial={reduzir ? { opacity: 0 } : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", bounce: 0, duration: 0.45, delay: 0.15 }}
      className="mx-auto mt-6 max-w-xl lg:max-w-none"
    >
      <h3 className="titulo mb-2 px-1 text-[20px] font-bold">Premiação do concurso {r.numero}</h3>
      <div className="cartao overflow-hidden">
        {/* Prêmio principal */}
        <div className="bg-gradient-to-br from-roxo-claro to-roxo-escuro px-5 py-4 text-white">
          <p className="legenda text-[12px] font-semibold uppercase text-white/75">Prêmio principal · 15 acertos</p>
          {!publicado ? (
            <p className="titulo mt-1 text-[22px] font-bold">Rateio ainda não publicado</p>
          ) : principal && principal.ganhadores > 0 ? (
            <>
              <p className="display tabular mt-1 text-[30px] font-bold">{moeda(principal.valor)}</p>
              <p className="text-[14px] text-white/85">
                {principal.ganhadores === 1 ? "1 ganhador levou" : `${n(principal.ganhadores)} ganhadores levaram cada um`}
              </p>
            </>
          ) : (
            <>
              <p className="display mt-1 text-[30px] font-bold">Acumulou!</p>
              <p className="text-[14px] text-white/85">Ninguém acertou os 15 números.</p>
            </>
          )}
          {estimativa ? (
            <p className="mt-2 text-[12px] text-white/75 tabular">Estimativa antes do sorteio: {moeda(estimativa)}</p>
          ) : null}
        </div>

        {/* Faixas */}
        <div className="px-2 py-2 sm:px-3">
          <div className="grid grid-cols-[1fr_1fr_1.2fr] gap-2 px-3 pt-1 pb-2 text-[11px] font-semibold text-texto-3 sm:grid-cols-[1fr_1fr_1.2fr_1.2fr]">
            <span>Acertos</span>
            <span className="text-right">Ganhadores</span>
            <span className="text-right">Prêmio cada</span>
            <span className="hidden text-right sm:block">Total pago</span>
          </div>
          {faixas.map((f) => {
            const nosso = nossos[f.acertos] ?? 0;
            return (
              <div key={f.faixa}
                className={`grid grid-cols-[1fr_1fr_1.2fr] items-center gap-2 rounded-xl px-3 py-2.5 text-[14px] tabular sm:grid-cols-[1fr_1fr_1.2fr_1.2fr] ${nosso ? "bg-roxo-suave" : ""}`}>
                <span className="flex items-center gap-2 font-semibold">
                  {f.acertos}
                  {nosso > 0 && (
                    <span className="rounded-full bg-roxo px-2 py-0.5 text-[10px] font-bold text-white">
                      {nosso === 1 ? "nós!" : `nós ×${nosso}`}
                    </span>
                  )}
                </span>
                <span className="text-right text-texto-2">{f.ganhadores ? n(f.ganhadores) : "—"}</span>
                <span className="text-right font-semibold">{f.valor ? moeda(f.valor) : publicado ? "—" : "aguardando"}</span>
                <span className="hidden text-right text-texto-2 sm:block">{f.valor && f.ganhadores ? moeda(f.valor * f.ganhadores) : "—"}</span>
              </div>
            );
          })}
        </div>

        {/* Rodapé */}
        <div className="grid grid-cols-2 gap-x-4 gap-y-2 border-t border-linha px-5 py-3 text-[12px] text-texto-2 tabular">
          {r.arrecadado ? <Linha rotulo="Arrecadação" valor={moeda(r.arrecadado)} /> : null}
          {totalPago ? <Linha rotulo="Total em prêmios" valor={moeda(totalPago)} /> : null}
          {r.estimativaProximo ? <Linha rotulo="Estimativa do próximo" valor={moeda(r.estimativaProximo)} /> : null}
          {r.local ? <Linha rotulo="Local" valor={titulo(r.local)} /> : null}
        </div>
      </div>
    </motion.section>
  );
}

function Linha({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div>
      <div className="text-[11px] text-texto-3">{rotulo}</div>
      <div className="font-semibold text-texto">{valor}</div>
    </div>
  );
}

const titulo = (s: string) => s.toLowerCase().replace(/(^|\s)\S/g, (c) => c.toUpperCase()).replace(/\bSp\b/, "SP").replace(/ Em /, " em ").replace(/ Da /g, " da ");
