import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";

const dir = path.join(process.cwd(), "data", "bilhetes");
let erros = 0;
const ids = new Set<number>();
for (const f of readdirSync(dir).filter((x) => x.endsWith(".json")).sort()) {
  let b: { id: number; nome: string; jogos: number[][]; exemplo?: boolean };
  try {
    b = JSON.parse(readFileSync(path.join(dir, f), "utf8"));
  } catch (e) {
    console.error(`✗ ${f}: JSON inválido — ${(e as Error).message}`);
    erros++;
    continue;
  }
  if (ids.has(b.id)) { console.error(`✗ ${f}: id ${b.id} repetido`); erros++; }
  ids.add(b.id);
  b.jogos.forEach((j, i) => {
    const s = new Set(j);
    const problemas: string[] = [];
    if (j.length < 15 || j.length > 20) problemas.push(`${j.length} dezenas`);
    if (s.size !== j.length) problemas.push("dezena repetida");
    if (j.some((d) => !Number.isInteger(d) || d < 1 || d > 25)) problemas.push("dezena fora de 1–25");
    if (problemas.length) { console.error(`✗ ${f} jogo ${i + 1}: ${problemas.join(", ")}`); erros++; }
  });
  console.log(`${erros ? "·" : "✓"} ${f}: ${b.nome} — ${b.jogos.length} jogos${b.exemplo ? " (EXEMPLO)" : ""}`);
}
if (erros) { console.error(`\n${erros} problema(s).`); process.exit(1); }
console.log("\nTudo certo.");
