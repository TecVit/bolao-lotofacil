import type { Resultado, Estado } from "./tipos";

const UA = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130 Safari/537.36";
const TIMEOUT = 4000;

type Bruto = { resultado: Resultado; estado?: Estado };

async function getJson(url: string) {
  const r = await fetch(url, {
    headers: { "User-Agent": UA, Accept: "application/json" },
    signal: AbortSignal.timeout(TIMEOUT),
    cache: "no-store",
  });
  if (!r.ok) throw new Error(`${url} → HTTP ${r.status}`);
  return r.json();
}

const num = (a: unknown) => (Array.isArray(a) ? a.map(Number) : []);

/* eslint-disable @typescript-eslint/no-explicit-any */
function deFormatoCaixa(d: any, fonte: Resultado["fonte"]): Bruto {
  if (!d?.numero || !d?.listaDezenas?.length) throw new Error("resposta sem resultado");
  const agora = Date.now();
  return {
    resultado: {
      numero: d.numero,
      data: d.dataApuracao,
      dezenas: num(d.listaDezenas).sort((a, b) => a - b),
      ordemSorteio: num(d.dezenasSorteadasOrdemSorteio),
      acumulado: !!d.acumulado,
      premios: (d.listaRateioPremio ?? []).map((p: any) => ({
        faixa: p.faixa, acertos: 16 - p.faixa, ganhadores: p.numeroDeGanhadores, valor: p.valorPremio,
      })),
      local: d.localSorteio ? [d.localSorteio, d.nomeMunicipioUFSorteio].filter(Boolean).join(" em ") : undefined,
      arrecadado: d.valorArrecadado ?? undefined,
      estimativaProximo: d.valorEstimadoProximoConcurso ?? undefined,
      fonte,
      atualizadoEm: agora,
    },
    estado: d.numeroConcursoProximo
      ? {
          ultimo: d.numero,
          proximo: d.numeroConcursoProximo,
          dataProximo: d.dataProximoConcurso,
          estimativaProximo: d.valorEstimadoProximoConcurso ?? 0,
          atualizadoEm: agora,
        }
      : undefined,
  };
}

function deLoteriasCaixaApi(d: any): Bruto {
  if (!d?.concurso || !d?.dezenas?.length) throw new Error("resposta sem resultado");
  const agora = Date.now();
  return {
    resultado: {
      numero: d.concurso,
      data: d.data,
      dezenas: num(d.dezenas).sort((a, b) => a - b),
      ordemSorteio: num(d.dezenasOrdemSorteio),
      acumulado: !!d.acumulou,
      premios: (d.premiacoes ?? []).map((p: any) => ({
        faixa: p.faixa, acertos: 16 - p.faixa, ganhadores: p.ganhadores, valor: p.valorPremio,
      })),
      local: d.local,
      arrecadado: d.valorArrecadado ?? undefined,
      estimativaProximo: d.valorEstimadoProximoConcurso ?? undefined,
      fonte: "loteriascaixa-api",
      atualizadoEm: agora,
    },
    estado: d.proximoConcurso
      ? {
          ultimo: d.concurso,
          proximo: d.proximoConcurso,
          dataProximo: d.dataProximoConcurso,
          estimativaProximo: d.valorEstimadoProximoConcurso ?? 0,
          atualizadoEm: agora,
        }
      : undefined,
  };
}
/* eslint-enable @typescript-eslint/no-explicit-any */

const CAIXA = process.env.CAIXA_API_URL ?? "https://servicebus2.caixa.gov.br/portaldeloterias/api/lotofacil";

const fontes: { nome: string; buscar: (n?: number) => Promise<Bruto> }[] = [
  { nome: "caixa", buscar: async (n) => deFormatoCaixa(await getJson(n ? `${CAIXA}/${n}` : CAIXA), "caixa") },
  {
    nome: "loteriascaixa-api",
    buscar: async (n) => deLoteriasCaixaApi(await getJson(`https://loteriascaixa-api.herokuapp.com/api/lotofacil/${n ?? "latest"}`)),
  },
  {
    nome: "guidi",
    buscar: async (n) => deFormatoCaixa(await getJson(`https://api.guidi.dev.br/loteria/lotofacil/${n ?? "ultimo"}`), "guidi"),
  },
];

const rateioCompleto = (b: Bruto) => b.resultado.premios.some((p) => p.acertos === 14 && p.valor > 0);

/**
 * Último resultado: consulta TODAS as fontes em paralelo e fica com a que tem
 * o concurso mais novo (empate → rateio publicado → ordem Caixa, comunitárias).
 * Assim a velocidade é a da fonte mais rápida que já tem o resultado.
 */
export async function buscarUltimo(): Promise<{ melhor: Bruto; erros: string[] }> {
  const res = await Promise.allSettled(fontes.map((f) => f.buscar()));
  const erros: string[] = [];
  let melhor: Bruto | null = null;
  res.forEach((r, i) => {
    if (r.status === "rejected") { erros.push(`${fontes[i].nome}: ${(r.reason as Error).message}`); return; }
    const b = r.value;
    if (
      !melhor ||
      b.resultado.numero > melhor.resultado.numero ||
      (b.resultado.numero === melhor.resultado.numero && rateioCompleto(b) && !rateioCompleto(melhor))
    ) melhor = b;
  });
  if (!melhor) throw new Error(erros.join(" | "));
  return { melhor, erros };
}

/** Busca um concurso (ou o último, sem número) tentando Caixa → comunitárias. */
export async function buscarConcurso(n?: number): Promise<Bruto> {
  const erros: string[] = [];
  for (const f of fontes) {
    try {
      const b = await f.buscar(n);
      if (n && b.resultado.numero !== n) throw new Error(`veio o ${b.resultado.numero}`);
      return b;
    } catch (e) {
      erros.push(`${f.nome}: ${(e as Error).message}`);
    }
  }
  throw new Error(erros.join(" | "));
}
