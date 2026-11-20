export const CONCURSO_INICIAL = Number(process.env.NEXT_PUBLIC_CONCURSO_INICIAL ?? 3831);
export const TOTAL_CONCURSOS = Number(process.env.NEXT_PUBLIC_TOTAL_CONCURSOS ?? 24);
export const CONCURSO_FINAL = CONCURSO_INICIAL + TOTAL_CONCURSOS - 1;
/** Data (yyyy-mm-dd, horário de Brasília) do concurso inicial */
export const DATA_INICIAL = process.env.NEXT_PUBLIC_DATA_INICIAL ?? "2026-11-16";
/** Hora (Brasília) do sorteio de seg a sex — 21h desde 03/11/2025. */
export const HORA_SORTEIO = 21;
/** Desde 19/07/2026 a Caixa não sorteia aos sábados: o concurso de fim de semana é no domingo, às 11h. */
export const HORA_SORTEIO_DOMINGO = 11;

/** Dia da semana (0 = domingo) de uma data yyyy-mm-dd. */
export function diaSemana(iso: string): number {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d, 12)).getUTCDay();
}

/** Hora do sorteio (Brasília) no dia yyyy-mm-dd. */
export function horaSorteio(iso: string): number {
  return diaSemana(iso) === 0 ? HORA_SORTEIO_DOMINGO : HORA_SORTEIO;
}

/** Feriados nacionais sem sorteio (yyyy-mm-dd). A Lotofácil corre de seg a sex e no domingo, exceto nestes dias. */
export const FERIADOS: ReadonlySet<string> = new Set([
  "2026-11-20", // Consciência Negra
  "2026-12-25", // Natal
  "2027-01-01", // Confraternização Universal
]);

/** Feriados estritamente entre duas datas (yyyy-mm-dd), em ordem. */
export function feriadosEntre(inicioIso: string, fimIso: string): string[] {
  return [...FERIADOS].filter((f) => f > inicioIso && f < fimIso).sort();
}

export const concursos = Array.from({ length: TOTAL_CONCURSOS }, (_, i) => CONCURSO_INICIAL + i);

/** Data de hoje em Brasília como yyyy-mm-dd */
export function hojeSP(agora = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(agora);
}

export function horaSP(agora = new Date()): number {
  const p = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Sao_Paulo", hour: "numeric", minute: "numeric", hourCycle: "h23",
  }).formatToParts(agora);
  const h = Number(p.find((x) => x.type === "hour")?.value);
  const m = Number(p.find((x) => x.type === "minute")?.value);
  return h + m / 60;
}

/**
 * Data prevista (yyyy-mm-dd) de um concurso: seg a sex e domingo, pulando sábados e feriados,
 * contando a partir de um concurso de data conhecida (âncora).
 */
export function dataPrevista(numero: number, ancoraNum = CONCURSO_INICIAL, ancoraIso = DATA_INICIAL): string {
  const [y, m, d] = ancoraIso.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d, 12));
  let faltam = numero - ancoraNum;
  const passo = faltam >= 0 ? 1 : -1;
  while (faltam !== 0) {
    dt.setUTCDate(dt.getUTCDate() + passo);
    if (dt.getUTCDay() !== 6 && !FERIADOS.has(dt.toISOString().slice(0, 10))) faltam -= passo;
  }
  return dt.toISOString().slice(0, 10);
}

export function brParaIso(br: string): string {
  const [d, m, y] = br.split("/");
  return `${y}-${m}-${d}`;
}

export function formatarData(iso: string, opts: Intl.DateTimeFormatOptions = { weekday: "short", day: "2-digit", month: "short" }) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Intl.DateTimeFormat("pt-BR", { ...opts, timeZone: "UTC" })
    .format(new Date(Date.UTC(y, m - 1, d, 12)))
    .replace(".", "");
}

/** Concursos que já deveriam ter sido sorteados (data passada, ou hoje após a hora do sorteio). */
export function jaSorteado(numero: number, agora = new Date()): boolean {
  const data = dataPrevista(numero);
  const hoje = hojeSP(agora);
  return data < hoje || (data === hoje && horaSP(agora) >= horaSorteio(data));
}

export function moeda(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: v >= 1e5 ? 0 : 2 });
}
