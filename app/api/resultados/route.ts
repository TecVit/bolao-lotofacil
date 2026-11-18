import { connection } from "next/server";
import { lerEstado, lerResultados } from "@/lib/store";
import { sincronizar } from "@/lib/sync";
import { concursos, jaSorteado } from "@/lib/concursos";

/**
 * Leitura para o site quando o Firebase client não está configurado
 * (ou como fallback). Se faltar algum concurso já sorteado, sincroniza na hora.
 */
export async function GET() {
  await connection();
  let resultados = await lerResultados();
  const tem = new Set(resultados.map((r) => r.numero));
  if (concursos.some((n) => jaSorteado(n) && !tem.has(n))) {
    await sincronizar().catch(() => null);
    resultados = await lerResultados();
  }
  const estado = await lerEstado();
  return Response.json(
    { resultados: resultados.sort((a, b) => a.numero - b.numero), estado },
    { headers: { "Cache-Control": "public, s-maxage=20, stale-while-revalidate=60" } },
  );
}
