"use client";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { animate, motion, useMotionValue, useReducedMotion, useTransform, type MotionValue } from "motion/react";
import { elastico, mola, molaFlick, projetar, vibrar } from "@/lib/fisica";
import type { Status } from "./tipos-ui";

const PASSO = 64; // largura do chip + gap
const LARG = 56;

type ItemConcurso = { tipo: "concurso"; numero: number; status: Status; rotulo: string; melhor?: number };
type ItemFeriado = { tipo: "feriado"; iso: string; rotulo: string; dia: string };
export type ItemNav = ItemConcurso | ItemFeriado;
type Item = ItemNav;

/**
 * `indice`/`onMudar` falam em índice de concurso; a trilha também mostra feriados
 * (desativados), então convertemos concurso ↔ posição visual.
 */
export function ConcursoNav({
  itens, indice, onMudar,
}: { itens: Item[]; indice: number; onMudar: (i: number) => void }) {
  const trilho = useRef<HTMLDivElement>(null);
  const [largura, setLargura] = useState(0);
  const x = useMotionValue(0);
  const reduzir = useReducedMotion();
  const arrasto = useRef<{ id: number; x0: number; p0: number; ativo: boolean; hist: { x: number; t: number }[] } | null>(null);
  const ultimoIdx = useRef(indice);

  // posição visual de cada concurso (índice de concurso → índice na trilha)
  const posicoes = itens.flatMap((it, p) => (it.tipo === "concurso" ? [p] : []));
  const alvo = (i: number) => largura / 2 - LARG / 2 - (posicoes[i] ?? 0) * PASSO;
  const min = alvo(posicoes.length - 1);
  const max = alvo(0);

  useLayoutEffect(() => {
    const el = trilho.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setLargura(el.clientWidth));
    ro.observe(el);
    setLargura(el.clientWidth);
    return () => ro.disconnect();
  }, []);

  // seleção externa (swipe no card, toque) → mola até o chip, partindo do valor atual
  useEffect(() => {
    if (!largura || arrasto.current?.ativo) return;
    const primeira = x.get() === 0;
    if (primeira || reduzir) x.set(alvo(indice));
    else animate(x, alvo(indice), mola);
    ultimoIdx.current = indice;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [indice, largura, reduzir]);

  // posição da trilha → concurso mais próximo (nunca para num feriado)
  const indiceDe = (pos: number) => {
    const v = (largura / 2 - LARG / 2 - pos) / PASSO;
    let melhor = 0;
    posicoes.forEach((p, i) => { if (Math.abs(p - v) < Math.abs(posicoes[melhor] - v)) melhor = i; });
    return melhor;
  };

  function onPointerDown(e: React.PointerEvent) {
    x.stop(); // interrompe a mola: começamos do valor apresentado
    arrasto.current = { id: e.pointerId, x0: x.get(), p0: e.clientX, ativo: false, hist: [{ x: e.clientX, t: e.timeStamp }] };
  }

  function onPointerMove(e: React.PointerEvent) {
    const a = arrasto.current;
    if (!a || a.id !== e.pointerId) return;
    const dx = e.clientX - a.p0;
    if (!a.ativo) {
      if (Math.abs(dx) < 8) return; // histerese
      a.ativo = true;
      a.p0 = e.clientX;
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    }
    let pos = a.x0 + (e.clientX - a.p0);
    if (pos > max) pos = max + elastico(pos - max, largura);
    if (pos < min) pos = min - elastico(min - pos, largura);
    x.set(pos);
    a.hist.push({ x: e.clientX, t: e.timeStamp });
    if (a.hist.length > 6) a.hist.shift();
    const i = indiceDe(pos);
    if (i !== ultimoIdx.current) { ultimoIdx.current = i; vibrar(4); }
  }

  function onPointerUp(e: React.PointerEvent) {
    const a = arrasto.current;
    arrasto.current = null;
    if (!a?.ativo) return;
    const h = a.hist;
    const p = h[0], q = h[h.length - 1];
    const dt = Math.max(1, q.t - p.t);
    const v = e.timeStamp - q.t > 80 ? 0 : ((q.x - p.x) / dt) * 1000; // px/s
    const projetado = x.get() + projetar(v);
    const i = indiceDe(projetado);
    animate(x, alvo(i), { ...(Math.abs(v) > 400 ? molaFlick : mola), velocity: v });
    if (i !== indice) onMudar(i);
  }

  return (
    <div className="material sticky top-[max(env(safe-area-inset-top),8px)] z-30 mx-auto max-w-xl lg:max-w-none rounded-[22px] py-2 shadow-[var(--sombra)]">
      <div
        ref={trilho}
        className="relative h-[68px] overflow-hidden select-none touch-pan-y [mask-image:linear-gradient(90deg,transparent,#000_14%,#000_86%,transparent)]"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        role="tablist"
        aria-label="Concursos"
      >
        {/* janela do selecionado */}
        <div className="pointer-events-none absolute top-0 left-1/2 h-full w-[60px] -translate-x-1/2 rounded-2xl bg-roxo shadow-[0_6px_20px_color-mix(in_srgb,var(--roxo)_40%,transparent)]" />
        <motion.div className="absolute top-0 left-0 flex h-full" style={{ x, gap: PASSO - LARG }}>
          {itens.map((it, p) => {
            if (it.tipo === "feriado")
              return <ChipFeriado key={it.iso} item={it} i={p} x={x} centro={largura / 2 - LARG / 2} />;
            const i = posicoes.indexOf(p);
            return (
              <Chip key={it.numero} item={it} i={p} x={x} centro={largura / 2 - LARG / 2}
                ativo={i === indice} onClick={() => i !== indice && onMudar(i)} />
            );
          })}
        </motion.div>
      </div>
    </div>
  );
}

function ChipFeriado({ item, i, x, centro }: {
  item: ItemFeriado; i: number; x: MotionValue<number>; centro: number;
}) {
  const dist = useTransform(x, (v) => Math.min(1, Math.abs(v + i * PASSO - centro) / (PASSO * 3)));
  const scale = useTransform(dist, [0, 1], [0.9, 0.8]);
  const opacity = useTransform(dist, [0, 1], [0.5, 0.3]);
  return (
    <motion.div
      role="tab"
      aria-disabled="true"
      aria-selected={false}
      aria-label={`Feriado ${item.dia}, sem sorteio`}
      title={`Feriado ${item.dia} — sem sorteio`}
      style={{ scale, opacity, width: LARG }}
      className="pointer-events-none flex h-full shrink-0 flex-col items-center justify-center rounded-2xl border border-dashed border-texto-3/50 text-texto-3"
    >
      <span className="legenda text-[10px] font-semibold uppercase">{item.rotulo}</span>
      <span className="titulo tabular text-[12px] font-bold">{item.dia}</span>
      <span className="legenda text-[9px] font-semibold uppercase">feriado</span>
    </motion.div>
  );
}

function Chip({ item, i, x, centro, ativo, onClick }: {
  item: ItemConcurso; i: number; x: MotionValue<number>; centro: number; ativo: boolean; onClick: () => void;
}) {
  // escala/opacidade contínuas pela distância ao centro — acompanham o dedo 1:1
  const dist = useTransform(x, (v) => Math.min(1, Math.abs(v + i * PASSO - centro) / (PASSO * 3)));
  const scale = useTransform(dist, [0, 1], [1, 0.84]);
  const opacity = useTransform(dist, [0, 1], [1, 0.45]);
  const naJanela = useTransform(x, (v) => Math.abs(v + i * PASSO - centro) < PASSO / 2);
  const [dentro, setDentro] = useState(ativo);
  useEffect(() => naJanela.on("change", setDentro), [naJanela]);
  const cor = dentro ? "text-white" : "text-texto";

  return (
    <motion.button
      role="tab"
      aria-selected={ativo}
      onClick={onClick}
      style={{ scale, opacity, width: LARG }}
      className={`flex h-full shrink-0 flex-col items-center justify-center rounded-2xl transition-colors duration-150 ${cor}`}
    >
      <span className={`legenda text-[10px] font-semibold uppercase ${dentro ? "text-white/80" : "text-texto-3"}`}>{item.rotulo}</span>
      <span className="titulo tabular text-[15px] font-bold">{item.numero}</span>
      <Marcador status={item.status} melhor={item.melhor} dentro={dentro} />
    </motion.button>
  );
}

function Marcador({ status, melhor, dentro }: { status: Status; melhor?: number; dentro: boolean }) {
  if (status === "realizado")
    return (
      <span className={`tabular text-[10px] font-semibold ${dentro ? "text-white/90" : melhor && melhor >= 11 ? "text-roxo" : "text-texto-3"}`}>
        {melhor ?? "–"} pts
      </span>
    );
  if (status === "hoje" || status === "aguardando")
    return <span className={`pulso mt-1 size-1.5 rounded-full ${dentro ? "bg-white" : "bg-roxo"}`} />;
  return <span className={`mt-1 size-1.5 rounded-full ${dentro ? "bg-white/50" : "bg-texto-3/40"}`} />;
}
