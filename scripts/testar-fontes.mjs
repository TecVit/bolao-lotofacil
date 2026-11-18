#!/usr/bin/env node
/**
 * Testa as fontes de resultado da Lotofácil usadas pelo site.
 *
 *   node scripts/testar-fontes.mjs          → último concurso
 *   node scripts/testar-fontes.mjs 3832     → concurso específico
 *
 * Sem dependências (Node 18+). Mostra status, tempo, concurso, dezenas e
 * rateio de cada fonte, e no fim compara se todas devolveram o mesmo resultado.
 */

const concurso = process.argv[2] ? Number(process.argv[2]) : undefined;
const UA = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130 Safari/537.36";
const TIMEOUT = 8000;

// ---- normalizadores: cada fonte tem um formato, todos viram o mesmo objeto
const num = (a) => (Array.isArray(a) ? a.map(Number) : []);

function formatoCaixa(d) {
  return {
    numero: d.numero,
    data: d.dataApuracao,
    dezenas: num(d.listaDezenas).sort((a, b) => a - b),
    ordem: num(d.dezenasSorteadasOrdemSorteio),
    acumulado: !!d.acumulado,
    premios: (d.listaRateioPremio ?? []).map((p) => ({ acertos: 16 - p.faixa, ganhadores: p.numeroDeGanhadores, valor: p.valorPremio })),
    arrecadado: d.valorArrecadado,
    proximo: d.numeroConcursoProximo,
    estimativa: d.valorEstimadoProximoConcurso,
  };
}

function formatoGutoAlves(d) {
  return {
    numero: d.concurso,
    data: d.data,
    dezenas: num(d.dezenas).sort((a, b) => a - b),
    ordem: num(d.dezenasOrdemSorteio),
    acumulado: !!d.acumulou,
    premios: (d.premiacoes ?? []).map((p) => ({ acertos: 16 - p.faixa, ganhadores: p.ganhadores, valor: p.valorPremio })),
    arrecadado: d.valorArrecadado,
    proximo: d.proximoConcurso,
    estimativa: d.valorEstimadoProximoConcurso,
  };
}

const fontes = [
  {
    nome: "Caixa servicebus3 (oficial, usada pelo site da Caixa)",
    url: (n) => `https://servicebus3.caixa.gov.br/portaldeloterias/api/lotofacil${n ? `/${n}` : ""}`,
    normalizar: formatoCaixa,
  },
  {
    nome: "Caixa servicebus2 (oficial, endereço antigo)",
    url: (n) => `https://servicebus2.caixa.gov.br/portaldeloterias/api/lotofacil${n ? `/${n}` : ""}`,
    normalizar: formatoCaixa,
  },
  {
    nome: "loteriascaixa-api (guto-alves, comunidade)",
    url: (n) => `https://loteriascaixa-api.herokuapp.com/api/lotofacil/${n ?? "latest"}`,
    normalizar: formatoGutoAlves,
  },
  {
    nome: "guidi.dev.br (comunidade)",
    url: (n) => `https://api.guidi.dev.br/loteria/lotofacil/${n ?? "ultimo"}`,
    normalizar: formatoCaixa,
  },
];

// ---- extra: confere qual endereço o site oficial da Caixa usa hoje
async function enderecoDoSiteOficial() {
  try {
    const r = await fetch("https://loterias.caixa.gov.br/Style%20Library/json/params.txt", {
      headers: { "User-Agent": UA }, signal: AbortSignal.timeout(TIMEOUT),
    });
    return JSON.parse(await r.text()).urlapiloterias;
  } catch (e) {
    return `não consegui ler (${e.message})`;
  }
}

const cor = { ok: "\x1b[32m", erro: "\x1b[31m", aviso: "\x1b[33m", dim: "\x1b[2m", b: "\x1b[1m", fim: "\x1b[0m" };
const dz = (a) => a.map((d) => String(d).padStart(2, "0")).join(" ");
const brl = (v) => (v ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

async function testar(f) {
  const url = f.url(concurso);
  const t0 = performance.now();
  try {
    const r = await fetch(url, {
      headers: { "User-Agent": UA, Accept: "application/json" },
      signal: AbortSignal.timeout(TIMEOUT),
    });
    const ms = Math.round(performance.now() - t0);
    const texto = await r.text();
    if (!r.ok) return { f, url, ms, erro: `HTTP ${r.status} — ${texto.slice(0, 120).replace(/\s+/g, " ")}` };
    let json;
    try { json = JSON.parse(texto); } catch { return { f, url, ms, erro: `não é JSON (provável bloqueio anti-robô): ${texto.slice(0, 120).replace(/\s+/g, " ")}` }; }
    const res = f.normalizar(json);
    if (!res.numero || res.dezenas.length !== 15) return { f, url, ms, erro: "JSON sem resultado válido" };
    return { f, url, ms, res };
  } catch (e) {
    return { f, url, ms: Math.round(performance.now() - t0), erro: e.name === "TimeoutError" ? `timeout (${TIMEOUT / 1000}s)` : e.message };
  }
}

console.log(`${cor.b}Lotofácil — teste das fontes${cor.fim} ${cor.dim}(${concurso ? `concurso ${concurso}` : "último concurso"}, Node ${process.version})${cor.fim}`);
console.log(`${cor.dim}Endereço que o site oficial da Caixa usa hoje: ${await enderecoDoSiteOficial()}${cor.fim}\n`);

const resultados = await Promise.all(fontes.map(testar));

for (const { f, url, ms, res, erro } of resultados) {
  console.log(`${erro ? cor.erro + "✗" : cor.ok + "✓"} ${cor.b}${f.nome}${cor.fim} ${cor.dim}${ms} ms${cor.fim}`);
  console.log(`  ${cor.dim}${url}${cor.fim}`);
  if (erro) { console.log(`  ${cor.erro}${erro}${cor.fim}\n`); continue; }
  console.log(`  Concurso ${res.numero} · ${res.data}${res.acumulado ? " · ACUMULOU" : ""}`);
  console.log(`  Dezenas:  ${dz(res.dezenas)}`);
  console.log(`  Ordem:    ${dz(res.ordem)}`);
  const rateio = [...res.premios].sort((a, b) => b.acertos - a.acertos)
    .map((p) => `${p.acertos}: ${p.ganhadores}× ${brl(p.valor)}`).join(" | ");
  console.log(`  Rateio:   ${rateio || "(ainda não publicado)"}`);
  console.log(`  Arrecadação ${brl(res.arrecadado)} · próximo ${res.proximo ?? "?"} estimado em ${brl(res.estimativa)}\n`);
}

// ---- comparação entre fontes
const ok = resultados.filter((r) => r.res);
console.log(`${cor.b}Resumo${cor.fim}: ${ok.length}/${fontes.length} fontes responderam.`);
if (ok.length > 1) {
  const chave = (r) => JSON.stringify([r.numero, r.dezenas, r.premios.map((p) => [p.acertos, p.ganhadores, p.valor])]);
  const ref = ok[0];
  for (const r of ok.slice(1)) {
    const igual = chave(r.res) === chave(ref.res);
    const msg = igual ? `${cor.ok}igual${cor.fim}` : r.res.numero !== ref.res.numero
      ? `${cor.aviso}concurso diferente (${r.res.numero} vs ${ref.res.numero}) — está atrasada${cor.fim}`
      : `${cor.aviso}mesmo concurso, rateio diferente (uma delas ainda não atualizou)${cor.fim}`;
    console.log(`  ${r.f.nome} × ${ref.f.nome}: ${msg}`);
  }
}
const maisRapida = ok.sort((a, b) => a.ms - b.ms)[0];
if (maisRapida) console.log(`  Mais rápida: ${maisRapida.f.nome} (${maisRapida.ms} ms)`);
process.exitCode = ok.length ? 0 : 1;
