import type { Resultado } from "./tipos";

/**
 * Um concurso só para de ser buscado quando TUDO está no banco:
 * 15 dezenas, arrecadação e rateio de todas as faixas (11 a 15).
 * A faixa de 15 pode ter valor 0 só se ninguém acertou (acumulou).
 */
export function resultadoCompleto(r?: Resultado): boolean {
  if (!r || r.dezenas?.length !== 15 || r.arrecadado === undefined) return false;
  for (let k = 11; k <= 15; k++) {
    const p = r.premios.find((x) => x.acertos === k);
    if (!p) return false;
    if (k < 15 && !(p.valor > 0)) return false;
    if (k === 15 && p.ganhadores > 0 && !(p.valor > 0)) return false;
  }
  return true;
}
