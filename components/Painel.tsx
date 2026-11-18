"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion, type PanInfo } from "motion/react";
import { ConcursoNav } from "./ConcursoNav";
import { Volante } from "./Volante";
import { JogoRow } from "./JogoRow";
import { ResumoSheet, type LinhaResumo } from "./ResumoSheet";
import type { Status } from "./tipos-ui";
import { useResultados } from "@/lib/useResultados";
import { acertos, premiado } from "@/lib/conferir";
import {
  brParaIso, concursos, dataPrevista, formatarData, hojeSP, horaSP, HORA_SORTEIO, moeda, CONCURSO_INICIAL, DATA_INICIAL,
} from "@/lib/concursos";
import { mola, projetar, vibrar } from "@/lib/fisica";
import type { Bilhete, Resultado } from "@/lib/tipos";

type Props = { bilhetes: (Bilhete & { exemplo?: boolean })[] };

export function Painel({ bilhetes }: Props) {
  const { resultados, estado, carregando, online } = useResultados();
  const reduzir = useReducedMotion();
  const hoje = useHoje();
  const [resumo, setResumo] = useState(false);

  // Âncora de datas: o resultado mais recente conhecido (corrige feriados/deslocamentos)
  const ancora = useMemo(() => {
    const ult = [...resultados.values()].sort((a, b) => b.numero - a.numero)[0];
    if (estado && concursos.includes(estado.proximo)) return { n: estado.proximo, iso: brParaIso(estado.dataProximo) };
    if (ult) return { n: ult.numero, iso: brParaIso(ult.data) };
    return { n: CONCURSO_INICIAL, iso: DATA_INICIAL };
  }, [resultados, estado]);

  const dataDe = (n: number) => {
    const r = resultados.get(n);
    return r ? brParaIso(r.data) : dataPrevista(n, ancora.n, ancora.iso);
  };

  const statusDe = (n: number): Status => {
    if (resultados.has(n)) return "realizado";
    const d = dataDe(n);
    if (d === hoje.data) return hoje.hora >= HORA_SORTEIO ? "aguardando" : "hoje";
    return d < hoje.data ? "aguardando" : "futuro";
  };

  const jogos = useMemo(
    () => bilhetes.flatMap((b) => b.jogos.map((j, i) => ({ bilhete: b, idx: i, jogo: j }))),
    [bilhetes],
  );

  const conferencia = (r?: Resultado) =>
    jogos.map((g) => {
      const a = acertos(g.jogo, r?.dezenas);
      const valor = r?.premios.find((p) => p.acertos === a)?.valor ?? 0;
      return { ...g, acertos: a, valor: premiado(a) ? valor : 0 };
    });

  const linhas: LinhaResumo[] = concursos.map((n) => {
    const r = resultados.get(n);
    if (!r) return { numero: n, premiados: 0, ganho: 0 };
    const c = conferencia(r);
    return {
      numero: n,
      melhor: Math.max(...c.map((x) => x.acertos)),
      premiados: c.filter((x) => premiado(x.acertos)).length,
      ganho: c.reduce((s, x) => s + x.valor, 0),
    };
  });

  // Concurso "atual": o de hoje; senão o próximo; senão o último
  const atual = useMemo(() => {
    const deHoje = concursos.find((n) => dataDe(n) === hoje.data);
    if (deHoje) return deHoje;
    return concursos.find((n) => dataDe(n) > hoje.data) ?? concursos.at(-1)!;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hoje.data, resultados, ancora]);

  const [sel, setSel] = useState<number | null>(null);
  const [dir, setDir] = useState(0);
  const numero = sel ?? atual;
  const indice = concursos.indexOf(numero);

  const irPara = (i: number) => {
    const alvo = Math.max(0, Math.min(concursos.length - 1, i));
    if (alvo === indice) return;
    setDir(alvo > indice ? 1 : -1);
    setSel(concursos[alvo]);
  };

  // Resultado chegando ao vivo → haptic de prêmio (causalidade: só no evento real)
  const visto = useRef(new Set<number>());
  useEffect(() => {
    if (carregando) { return; }
    for (const [n, r] of resultados) {
      if (visto.current.has(n)) continue;
      const primeiraCarga = visto.current.size === 0 && n !== atual;
      visto.current.add(n);
      if (!primeiraCarga && n === numero && conferencia(r).some((x) => premiado(x.acertos))) vibrar([12, 60, 12]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resultados, carregando]);

  const r = resultados.get(numero);
  const status = statusDe(numero);
  const conf = conferencia(r);
  const melhor = r ? Math.max(...conf.map((x) => x.acertos)) : undefined;
  const ganho = conf.reduce((s, x) => s + x.valor, 0);
  const exemplo = bilhetes.some((b) => b.exemplo);

  const itensNav = concursos.map((n) => ({
    numero: n,
    status: statusDe(n),
    rotulo: dataDe(n) === hoje.data ? "hoje" : formatarData(dataDe(n), { weekday: "short" }),
    melhor: linhas.find((l) => l.numero === n)?.melhor,
  }));

  function soltarCard(_: unknown, info: PanInfo) {
    const p = info.offset.x + projetar(info.velocity.x, 0.99);
    if (p < -90) irPara(indice + 1);
    else if (p > 90) irPara(indice - 1);
  }

  return (
    <main className="mx-auto w-full max-w-5xl px-4 pt-[max(env(safe-area-inset-top),12px)] pb-32">
      <header className="mx-auto mb-3 flex max-w-xl items-end justify-between px-1 pt-3">
        <div>
          <p className="legenda text-[13px] font-semibold text-roxo">Lotofácil</p>
          <h1 className="display text-[34px] font-bold">Bolão</h1>
        </div>
        <div className="mb-1 flex items-center gap-1.5 text-[12px] text-texto-2">
          <span className={`size-2 rounded-full ${online ? "bg-verde" : "bg-ouro"} ${status === "aguardando" ? "pulso" : ""}`} />
          {!online ? "offline" : estado?.verificadoEm
            ? `${estado.verificadoFonte ? "verificado" : "falhou"} às ${horaBR(estado.verificadoEm)}`
            : status === "aguardando" ? "ao vivo" : "atualizado"}
        </div>
      </header>

      <ConcursoNav itens={itensNav} indice={indice} onMudar={irPara} />

      {exemplo && (
        <p className="mx-auto mt-3 max-w-xl rounded-xl bg-ouro/15 px-3 py-2 text-center text-[12px] font-medium text-texto-2">
          Bilhetes de exemplo — substitua em <code>data/bilhetes/</code>
        </p>
      )}

      <div className="relative mt-4 lg:grid lg:grid-cols-[minmax(0,420px)_1fr] lg:items-start lg:gap-6">
        <AnimatePresence mode="popLayout" initial={false} custom={dir}>
          <motion.section
            key={numero}
            custom={dir}
            variants={{
              entra: (d: number) => (reduzir ? { opacity: 0 } : { opacity: 0, x: d * 70, scale: 0.98 }),
              fica: { opacity: 1, x: 0, scale: 1 },
              sai: (d: number) => (reduzir ? { opacity: 0 } : { opacity: 0, x: d * -70, scale: 0.98 }),
            }}
            initial="entra" animate="fica" exit="sai"
            transition={reduzir ? { duration: 0.18 } : mola}
            className="mx-auto w-full max-w-xl lg:sticky lg:top-28 lg:max-w-none"
          >
            <motion.div
              drag={reduzir ? false : "x"}
              dragDirectionLock
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.18}
              dragTransition={{ bounceStiffness: 400, bounceDamping: 40 }}
              onDragEnd={soltarCard}
              style={{ touchAction: "pan-y" }}
              className="cartao p-5"
            >
              <div className="mb-4 flex items-start justify-between gap-3">
                <div>
                  <p className="legenda text-[13px] font-medium text-texto-2 first-letter:uppercase">
                    {formatarData(dataDe(numero), { weekday: "long", day: "2-digit", month: "long" })}
                  </p>
                  <h2 className="display tabular text-[28px] font-bold">Concurso {numero}</h2>
                  <p className="text-[12px] text-texto-3">{indice + 1}º de {concursos.length} do bolão</p>
                </div>
                <Selo status={status} />
              </div>

              <Volante dezenas={r?.dezenas} ordem={r?.ordemSorteio} chave={`${numero}-${r?.dezenas.join()}`} />

              {r ? (
                <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                  <Mini valor={`${melhor}`} rotulo="melhor jogo" destaque={(melhor ?? 0) >= 11} />
                  <Mini valor={`${conf.filter((x) => premiado(x.acertos)).length}`} rotulo="premiados" />
                  <Mini valor={ganho ? moeda(ganho) : "—"} rotulo="ganho" />
                </div>
              ) : (
                <Espera status={status} numero={numero} estado={estado} hora={hoje.hora} />
              )}
              {r && (
                <p className="mt-4 text-[11px] text-texto-3 tabular">
                  Resultado adicionado {quandoBR(r.adicionadoEm ?? r.atualizadoEm)} · fonte {NOME_FONTE[r.fonte] ?? r.fonte}
                </p>
              )}
              {r?.ordemSorteio?.length ? (
                <p className="mt-1 text-[11px] leading-relaxed text-texto-3 tabular">
                  Ordem do sorteio: {r.ordemSorteio.map((d) => String(d).padStart(2, "0")).join(" · ")}
                </p>
              ) : null}
            </motion.div>
          </motion.section>
        </AnimatePresence>

        <section className="mx-auto mt-6 max-w-xl lg:mt-0 lg:max-w-none">
          <h3 className="titulo mb-2 px-1 text-[20px] font-bold">Nossos jogos</h3>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
            {bilhetes.map((b) => (
              <div key={b.id} className="cartao p-2">
                <p className="legenda px-3 pt-2 pb-1 text-[13px] font-bold">{b.nome}</p>
                {conf.filter((c) => c.bilhete.id === b.id).map((c) => (
                  <JogoRow key={c.idx} rotulo={`Jogo ${"ABC"[c.idx] ?? c.idx + 1}`} jogo={c.jogo} dezenas={r?.dezenas}
                    acertos={c.acertos} valor={c.valor} chave={`${numero}-${r ? 1 : 0}`} />
                ))}
              </div>
            ))}
          </div>
        </section>
      </div>

      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-30 flex justify-center gap-2 px-4 pb-[max(env(safe-area-inset-bottom),16px)]">
        {indice !== concursos.indexOf(atual) && (
          <motion.button
            initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
            onClick={() => irPara(concursos.indexOf(atual))}
            className="material pressionavel pointer-events-auto rounded-full px-4 py-3 text-[15px] font-semibold text-roxo shadow-[var(--sombra-forte)]"
          >
            Hoje
          </motion.button>
        )}
        <button onClick={() => setResumo(true)}
          className="pressionavel pointer-events-auto rounded-full bg-roxo px-5 py-3 text-[15px] font-semibold text-white shadow-[0_10px_30px_color-mix(in_srgb,var(--roxo)_45%,transparent)]">
          Resumo do bolão
        </button>
      </div>

      <ResumoSheet aberto={resumo} onFechar={() => setResumo(false)} linhas={linhas}
        investido={bilhetes.reduce((s, b) => s + (b.valor ?? 0), 0)}
        onIr={(n) => irPara(concursos.indexOf(n))} />
    </main>
  );
}

const NOME_FONTE: Record<string, string> = { caixa: "Caixa (oficial)", "loteriascaixa-api": "loteriascaixa-api", guidi: "guidi.dev.br" };

const fmtHora = new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", hour: "2-digit", minute: "2-digit" });
const fmtDia = new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit" });
function horaBR(ts: number) { return fmtHora.format(ts); }
function quandoBR(ts: number) {
  const mesmoDia = fmtDia.format(ts) === fmtDia.format(Date.now());
  return mesmoDia ? `hoje às ${fmtHora.format(ts)}` : `em ${fmtDia.format(ts)} às ${fmtHora.format(ts)}`;
}

function Selo({ status }: { status: Status }) {
  const m = {
    realizado: ["Realizado", "bg-roxo-suave text-roxo"],
    hoje: ["Hoje às 20h", "bg-roxo text-white"],
    aguardando: ["Sorteando", "bg-ouro/20 text-texto"],
    futuro: ["Em breve", "bg-bola text-texto-2"],
  }[status];
  return (
    <span className={`mt-1 inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1 text-[12px] font-semibold ${m[1]}`}>
      {status === "aguardando" && <span className="pulso size-1.5 rounded-full bg-ouro" />}
      {m[0]}
    </span>
  );
}

function Mini({ valor, rotulo, destaque }: { valor: string; rotulo: string; destaque?: boolean }) {
  return (
    <div className={`rounded-2xl px-2 py-2.5 ${destaque ? "bg-roxo text-white" : "bg-bola/60"}`}>
      <div className="titulo tabular text-[17px] font-bold">{valor}</div>
      <div className={`text-[11px] ${destaque ? "text-white/80" : "text-texto-2"}`}>{rotulo}</div>
    </div>
  );
}

function Espera({ status, numero, estado, hora }: {
  status: Status; numero: number; estado: ReturnType<typeof useResultados>["estado"]; hora: number;
}) {
  const estimativa = estado?.proximo === numero ? estado.estimativaProximo : 0;
  let titulo = "Aguardando o sorteio";
  let sub = "";
  if (status === "hoje") {
    const falta = Math.max(0, HORA_SORTEIO - hora);
    const h = Math.floor(falta), m = Math.round((falta - h) * 60);
    titulo = `Sorteio em ${h ? `${h}h ` : ""}${m}min`;
    sub = "O resultado aparece aqui sozinho, assim que a Caixa publicar.";
  } else if (status === "aguardando") {
    titulo = "Sorteio realizado, buscando resultado…";
    sub = "Costuma sair entre 20h30 e 21h30. Esta tela atualiza sozinha.";
  } else {
    titulo = "Concurso futuro";
    sub = "Os 15 jogos já estão concorrendo.";
  }
  return (
    <div className="mt-4 rounded-2xl bg-bola/60 px-4 py-3">
      <p className="titulo text-[15px] font-semibold">{titulo}</p>
      {sub && <p className="mt-0.5 text-[13px] text-texto-2">{sub}</p>}
      {estimativa > 0 && (
        <p className="mt-2 text-[13px] text-texto-2">
          Prêmio estimado: <b className="text-roxo">{moeda(estimativa)}</b>
        </p>
      )}
    </div>
  );
}

/** Data/hora de Brasília, atualizada a cada 30s (a contagem regressiva usa isso). */
function useHoje() {
  const [agora, setAgora] = useState(() => ({ data: hojeSP(), hora: horaSP() }));
  useEffect(() => {
    const id = setInterval(() => setAgora({ data: hojeSP(), hora: horaSP() }), 30_000);
    return () => clearInterval(id);
  }, []);
  return agora;
}
