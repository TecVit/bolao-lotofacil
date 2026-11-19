"use client";
import { vibrar } from "./fisica";

const CORES = ["#930089", "#b23aa8", "#e07ad6", "#e8a400", "#ffd54a", "#ffffff"];

/**
 * Chuva de confete quando o bolão faz 14 ou 15 acertos.
 * 15 = festa maior (mais longa, com "fogos" dourados). Respeita "reduzir movimento".
 * Use `pararComemoracao()` ao sair do concurso ganhador para limpar a tela na hora.
 */
let geracao = 0;
let limpar: (() => void) | null = null;

export function pararComemoracao() {
  geracao++;
  limpar?.();
}

export async function comemorar(acertos: number) {
  pararComemoracao(); // reinicia se já estava comemorando
  const minha = geracao;
  const { default: confetti } = await import("canvas-confetti"); // só carrega quando ganha
  if (minha !== geracao) return; // saiu do concurso antes de carregar
  const timers: ReturnType<typeof setTimeout>[] = [];
  limpar = () => { timers.forEach(clearTimeout); confetti.reset(); };
  const base = { colors: CORES, disableForReducedMotion: true, zIndex: 60 };
  const grande = acertos >= 15;
  vibrar(grande ? [30, 60, 30, 60, 80] : [20, 50, 40]);

  // Estouro inicial do centro
  confetti({ ...base, particleCount: grande ? 180 : 120, spread: 100, startVelocity: 45, origin: { y: 0.6 } });

  // Canhões laterais por alguns segundos
  const fim = Date.now() + (grande ? 4500 : 2200);
  (function canhoes() {
    confetti({ ...base, particleCount: 4, angle: 60, spread: 55, origin: { x: 0, y: 0.75 } });
    confetti({ ...base, particleCount: 4, angle: 120, spread: 55, origin: { x: 1, y: 0.75 } });
    if (minha === geracao && Date.now() < fim) requestAnimationFrame(canhoes);
  })();

  // 15 acertos: fogos dourados extras
  if (grande) {
    for (let i = 1; i <= 4; i++) {
      timers.push(setTimeout(() => confetti({
        ...base, colors: ["#e8a400", "#ffd54a", "#fff3c4"], particleCount: 90, spread: 360,
        startVelocity: 30, gravity: 0.8, scalar: 1.1, origin: { x: 0.2 + Math.random() * 0.6, y: 0.2 + Math.random() * 0.3 },
      }), i * 700));
    }
  }
}
