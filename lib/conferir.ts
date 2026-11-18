export function acertos(jogo: number[], dezenas: number[] | undefined): number {
  if (!dezenas?.length) return 0;
  const s = new Set(dezenas);
  return jogo.reduce((n, d) => n + (s.has(d) ? 1 : 0), 0);
}
export const premiado = (n: number) => n >= 11;
