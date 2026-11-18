export function acertos(jogo: number[], dezenas: number[] | undefined): number {
  if (!dezenas?.length) return 0;
  const s = new Set(dezenas);
  return jogo.reduce((n, d) => n + (s.has(d) ? 1 : 0), 0);
}
export const premiado = (n: number) => n >= 11;

/** Prêmios fixos da Lotofácil (11, 12 e 13 acertos). 14 e 15 dependem do rateio. */
export const PREMIO_FIXO: Record<number, number> = { 11: 7, 12: 14, 13: 35 };

export type SituacaoPremio = "oficial" | "fixo" | "apurando" | "nenhum";

/**
 * Valor do prêmio para `k` acertos.
 * - oficial: rateio publicado pela Caixa
 * - fixo: rateio ainda não publicado, mas 11–13 têm valor fixo
 * - apurando: 14/15 acertos sem rateio publicado ainda
 */
export function valorPremio(
  premios: { acertos: number; valor: number }[] | undefined,
  k: number,
): { valor: number; situacao: SituacaoPremio } {
  if (!premiado(k)) return { valor: 0, situacao: "nenhum" };
  const p = premios?.find((x) => x.acertos === k);
  if (p && p.valor > 0) return { valor: p.valor, situacao: "oficial" };
  if (PREMIO_FIXO[k]) return { valor: PREMIO_FIXO[k], situacao: "fixo" };
  return { valor: 0, situacao: "apurando" };
}
