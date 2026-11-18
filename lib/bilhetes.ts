import "server-only";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import type { Bilhete } from "./tipos";

export type BilheteArquivo = Bilhete & { exemplo?: boolean };

export async function carregarBilhetes(): Promise<BilheteArquivo[]> {
  "use cache";
  const dir = path.join(process.cwd(), "data", "bilhetes");
  const arquivos = (await readdir(dir)).filter((f) => f.endsWith(".json"));
  const lista = await Promise.all(
    arquivos.map(async (f) => JSON.parse(await readFile(path.join(dir, f), "utf8")) as BilheteArquivo),
  );
  return lista
    // só o necessário vai para o navegador (sem código do bilhete / foto)
    .map((b) => ({
      id: b.id, nome: b.nome, valor: b.valor, exemplo: b.exemplo,
      jogos: b.jogos.map((j) => [...j].map(Number).sort((x, y) => x - y)),
    }))
    .sort((a, b) => a.id - b.id);
}
