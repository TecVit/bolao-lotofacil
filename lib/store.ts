import "server-only";
import { adminDb } from "./firebase-admin";
import type { Estado, Resultado } from "./tipos";

/** Persistência: Firestore quando configurado; senão, memória do processo (dev). */
const mem = globalThis as unknown as { __res?: Map<number, Resultado>; __estado?: Estado | null };
mem.__res ??= new Map();
mem.__estado ??= null;

export async function lerResultados(): Promise<Resultado[]> {
  const db = adminDb();
  if (!db) return [...mem.__res!.values()];
  const snap = await db.collection("resultados").get();
  return snap.docs.map((d) => d.data() as Resultado);
}

export async function lerEstado(): Promise<Estado | null> {
  const db = adminDb();
  if (!db) return mem.__estado!;
  const s = await db.doc("meta/estado").get();
  return (s.data() as Estado) ?? null;
}

const igual = (a?: Resultado, b?: Resultado) =>
  !!a && !!b && a.dezenas.join() === b.dezenas.join() &&
  JSON.stringify(a.premios) === JSON.stringify(b.premios) && a.acumulado === b.acumulado;

/** Grava só se mudou. Retorna true se escreveu. */
export async function salvarResultado(r: Resultado, atual?: Resultado): Promise<boolean> {
  if (igual(r, atual)) return false;
  const db = adminDb();
  if (!db) mem.__res!.set(r.numero, r);
  else await db.doc(`resultados/${r.numero}`).set(r);
  return true;
}

export async function salvarEstado(e: Estado, atual: Estado | null): Promise<boolean> {
  if (atual && atual.ultimo === e.ultimo && atual.proximo === e.proximo && atual.estimativaProximo === e.estimativaProximo) return false;
  const db = adminDb();
  if (!db) mem.__estado = { ...mem.__estado, ...e };
  else await db.doc("meta/estado").set(e, { merge: true });
  return true;
}

/** Registra cada consulta às APIs (1 escrita pequena por execução do cron). */
export async function marcarVerificacao(verificadoEm: number, verificadoFonte: string | null) {
  const db = adminDb();
  if (!db) mem.__estado = { ...(mem.__estado as Estado), verificadoEm, verificadoFonte };
  else await db.doc("meta/estado").set({ verificadoEm, verificadoFonte }, { merge: true });
}
