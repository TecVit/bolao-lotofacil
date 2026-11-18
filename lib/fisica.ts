/** Projeção de momentum da Apple (Designing Fluid Interfaces). */
export function projetar(velocidade: number, desaceleracao = 0.998) {
  return ((velocidade / 1000) * desaceleracao) / (1 - desaceleracao);
}

/** Resistência progressiva além do limite. */
export function elastico(excesso: number, dimensao: number, c = 0.55) {
  return (excesso * dimensao * c) / (dimensao + c * Math.abs(excesso));
}

export const mola = { type: "spring", bounce: 0, duration: 0.4 } as const;
export const molaRapida = { type: "spring", bounce: 0, duration: 0.3 } as const;
export const molaFlick = { type: "spring", bounce: 0.2, duration: 0.4 } as const;

export function vibrar(p: number | number[]) {
  try { navigator.vibrate?.(p); } catch { /* iOS não suporta */ }
}
