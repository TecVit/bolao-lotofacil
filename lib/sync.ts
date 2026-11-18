import "server-only";
import { buscarConcurso } from "./fontes";
import { concursos, jaSorteado } from "./concursos";
import { lerEstado, lerResultados, marcarVerificacao, salvarEstado, salvarResultado } from "./store";
import type { Resultado } from "./tipos";

let emAndamento: Promise<SyncInfo> | null = null;

export type SyncInfo = { gravados: number[]; pendentes: number[]; erros: string[]; ms: number };

/**
 * Busca o último concurso (pega o de hoje + estado do próximo) e
 * qualquer concurso do bolão já sorteado que ainda não esteja salvo.
 */
export function sincronizar(): Promise<SyncInfo> {
  emAndamento ??= executar().finally(() => (emAndamento = null));
  return emAndamento;
}

async function executar(): Promise<SyncInfo> {
  const t0 = Date.now();
  const [salvos, estado] = await Promise.all([lerResultados(), lerEstado()]);
  const porNumero = new Map(salvos.map((r) => [r.numero, r]));
  const info: SyncInfo = { gravados: [], pendentes: [], erros: [], ms: 0 };

  const gravar = async (r: Resultado) => {
    if (!concursos.includes(r.numero)) return;
    const atual = porNumero.get(r.numero);
    r.adicionadoEm = atual?.adicionadoEm ?? atual?.atualizadoEm ?? Date.now();
    if (await salvarResultado(r, atual)) info.gravados.push(r.numero);
    porNumero.set(r.numero, r);
  };

  // 1) último (é o que muda à noite)
  let fonte: string | null = null;
  try {
    const b = await buscarConcurso();
    fonte = b.resultado.fonte;
    await gravar(b.resultado);
    if (b.estado) await salvarEstado(b.estado, estado);
  } catch (e) {
    info.erros.push(`último: ${(e as Error).message}`);
  }

  // 2) buracos do bolão (concursos passados que faltam)
  const faltando = concursos.filter((n) => jaSorteado(n) && !porNumero.has(n));
  await Promise.all(
    faltando.map(async (n) => {
      try {
        await gravar((await buscarConcurso(n)).resultado);
      } catch (e) {
        info.pendentes.push(n);
        info.erros.push(`${n}: ${(e as Error).message}`);
      }
    }),
  );

  await marcarVerificacao(Date.now(), fonte).catch(() => null);
  info.ms = Date.now() - t0;
  return info;
}
