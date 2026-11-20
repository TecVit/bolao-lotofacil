"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion, type PanInfo } from "motion/react";
import { ConcursoNav, type ItemNav } from "./ConcursoNav";
import { Trevo } from "./Trevo";
import { Volante } from "./Volante";
import { JogoRow } from "./JogoRow";
import { ResumoSheet, type LinhaResumo } from "./ResumoSheet";
import { Premiacao } from "./Premiacao";
import { BotaoTema } from "./BotaoTema";
import type { Status } from "./tipos-ui";
import { useResultados } from "@/lib/useResultados";
import { acertos, premiado, valorPremio } from "@/lib/conferir";
import {
  brParaIso, concursos, dataPrevista, feriadosEntre, formatarData, hojeSP, horaSP, horaSorteio, moeda, CONCURSO_INICIAL, DATA_INICIAL,
} from "@/lib/concursos";
import { mola, projetar, vibrar } from "@/lib/fisica";
import { comemorar, pararComemoracao } from "@/lib/comemorar";
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
    if (d === hoje.data) return hoje.hora >= horaSorteio(d) ? "aguardando" : "hoje";
    return d < hoje.data ? "aguardando" : "futuro";
  };

  const jogos = useMemo(
    () => bilhetes.flatMap((b) => b.jogos.map((j, i) => ({ bilhete: b, idx: i, jogo: j }))),
    [bilhetes],
  );

  const conferencia = (r?: Resultado) =>
    jogos.map((g) => {
      const a = acertos(g.jogo, r?.dezenas);
      const { valor, situacao } = valorPremio(r?.premios, a);
      return { ...g, acertos: a, valor, situacao };
    });

  const linhas: LinhaResumo[] = concursos.map((n) => {
    const r = resultados.get(n);
    if (!r) return { numero: n, premiados: 0, ganho: 0, apurando: 0 };
    const c = conferencia(r);
    return {
      numero: n,
      melhor: Math.max(...c.map((x) => x.acertos)),
      premiados: c.filter((x) => premiado(x.acertos)).length,
      ganho: c.reduce((s, x) => s + x.valor, 0),
      apurando: c.filter((x) => x.situacao === "apurando").length,
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
  const grandePremio = (melhor ?? 0) >= 14;
  const apurando = conf.filter((x) => x.situacao === "apurando").length;
  const semRateio = conf.some((x) => x.situacao === "fixo" || x.situacao === "apurando");
  const exemplo = bilhetes.some((b) => b.exemplo);

  // 14 ou 15 acertos → confete (uma vez por concurso a cada abertura do app; ao vivo também)
  const festejado = useRef(new Set<number>());
  useEffect(() => {
    if (!grandePremio) return;
    const t = festejado.current.has(numero) ? undefined
      : setTimeout(() => { festejado.current.add(numero); comemorar(melhor!); }, 350); // após o card entrar
    // Saiu do concurso ganhador → confete some na hora
    return () => { clearTimeout(t); pararComemoracao(); };
  }, [numero, grandePremio, melhor]);

  // Concursos + feriados (sem sorteio) intercalados como chips desativados
  const itensNav: ItemNav[] = concursos.flatMap((n, i) => {
    const item: ItemNav = {
      tipo: "concurso",
      numero: n,
      status: statusDe(n),
      rotulo: dataDe(n) === hoje.data ? "hoje" : formatarData(dataDe(n), { weekday: "short" }),
      melhor: linhas.find((l) => l.numero === n)?.melhor,
    };
    const feriados = i === 0 ? [] : feriadosEntre(dataDe(concursos[i - 1]), dataDe(n));
    return [
      ...feriados.map((iso): ItemNav => ({
        tipo: "feriado", iso, rotulo: formatarData(iso, { weekday: "short" }), dia: formatarData(iso, { day: "2-digit", month: "2-digit" }),
      })),
      item,
    ];
  });

  function soltarCard(_: unknown, info: PanInfo) {
    const p = info.offset.x + projetar(info.velocity.x, 0.99);
    if (p < -90) irPara(indice + 1);
    else if (p > 90) irPara(indice - 1);
  }

  return (
    <main className="mx-auto w-full max-w-6xl px-4 pt-[max(env(safe-area-inset-top),12px)] pb-32">
      <header className="mx-auto mb-3 flex max-w-xl items-end lg:max-w-none justify-between px-1 pt-3">
        <div>
          <p className="legenda flex items-center gap-1 text-[13px] font-semibold text-roxo"><Trevo className="size-4" />Lotofácil</p>
          <h1 className="display text-[34px] font-bold">Bolão</h1>
        </div>
        <div className="mb-1 flex items-center gap-1.5 text-[12px] text-texto-2">
          <span className={`size-2 rounded-full ${online ? "bg-verde" : "bg-ouro"} ${status === "aguardando" ? "pulso" : ""}`} />
          {!online ? "offline" : estado?.verificadoEm
            ? `${estado.verificadoFonte ? "verificado" : "falhou"} às ${horaBR(estado.verificadoEm)}`
            : status === "aguardando" ? "ao vivo" : "atualizado"}
          <BotaoTema />
        </div>
      </header>

      <ConcursoNav itens={itensNav} indice={indice} onMudar={irPara} />

      {exemplo && (
        <p className="mx-auto mt-3 max-w-xl rounded-xl lg:max-w-none bg-ouro/15 px-3 py-2 text-center text-[12px] font-medium text-texto-2">
          Bilhetes de exemplo — substitua em <code>data/bilhetes/</code>
        </p>
      )}

      <div className="relative mt-4 lg:grid lg:grid-cols-[minmax(0,400px)_1fr] lg:items-start lg:gap-6">
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
              className="cartao relative isolate overflow-hidden p-5"
            >
              <TrevosCard chave={numero} />
              <div className="mb-4 flex items-start justify-between gap-3">
                <div>
                  <p className="legenda text-[13px] font-medium text-texto-2 first-letter:uppercase">
                    {formatarData(dataDe(numero), { weekday: "long", day: "2-digit", month: "long" })}
                  </p>
                  <h2 className="display tabular text-[28px] font-bold">Concurso {numero}</h2>
                  <p className="text-[12px] text-texto-3">{indice + 1}º de {concursos.length} do bolão</p>
                </div>
                <Selo status={status} horaSorteio={horaSorteio(dataDe(numero))} />
              </div>

              <Volante dezenas={r?.dezenas} ordem={r?.ordemSorteio} chave={`${numero}-${r?.dezenas.join()}`} />

              {grandePremio && (
                <motion.button
                  type="button"
                  onClick={() => comemorar(melhor!)}
                  initial={reduzir ? { opacity: 0 } : { opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={reduzir ? { duration: 0.2 } : { type: "spring", bounce: 0.45, duration: 0.6, delay: 0.3 }}
                  className="pressionavel relative mt-4 w-full overflow-hidden rounded-2xl bg-gradient-to-br from-ouro to-roxo px-4 py-3 text-left text-white shadow-[0_10px_30px_color-mix(in_srgb,var(--ouro)_35%,transparent)]"
                >
                  <span className="brilho pointer-events-none absolute inset-0" aria-hidden />
                  <p className="display text-[22px] font-bold">{melhor === 15 ? "🏆 GANHAMOS A LOTOFÁCIL!" : "🎉 Fizemos 14 pontos!"}</p>
                  <p className="text-[13px] text-white/85">
                    {conf.filter((x) => x.acertos === melhor).length > 1
                      ? `${conf.filter((x) => x.acertos === melhor).length} jogos com ${melhor} acertos`
                      : `Um jogo com ${melhor} acertos`} · toque para comemorar de novo
                  </p>
                </motion.button>
              )}

              {r ? (
                <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                  <Mini valor={`${melhor}`} rotulo="melhor jogo" destaque={(melhor ?? 0) >= 11} />
                  <Mini valor={`${conf.filter((x) => premiado(x.acertos)).length}`} rotulo="premiados" />
                  <Mini valor={ganho ? `${moeda(ganho)}${apurando ? " +" : ""}` : apurando ? "Apurando" : "—"}
                    rotulo={apurando ? "ganho + a apurar" : "ganho"} />
                </div>
              ) : (
                <Espera status={status} numero={numero} estado={estado} hora={hoje.hora} horaSorteio={horaSorteio(dataDe(numero))} />
              )}
              {r && semRateio && (
                <p className="mt-2 flex items-start gap-1.5 rounded-xl bg-ouro/15 px-3 py-2 text-[12px] text-texto-2">
                  <span className="pulso mt-1 size-1.5 shrink-0 rounded-full bg-ouro" />
                  <span>
                    A Caixa ainda não publicou o rateio.
                    {apurando
                      ? " O valor de 14/15 acertos depende do número de ganhadores e entra aqui assim que sair."
                      : " Os valores de 11 a 13 acertos são fixos, então já estão garantidos."}
                  </span>
                </p>
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

        <section className="mx-auto mt-6 w-full max-w-xl lg:mx-0 lg:mt-0 lg:max-w-none">
          <h3 className="titulo mb-2 px-1 text-[20px] font-bold">Nossos jogos</h3>
          <div className="grid gap-3">
            {bilhetes.map((b) => (
              <div key={b.id} className="cartao p-2">
                <p className="legenda px-3 pt-2 pb-1 text-[13px] font-bold">{b.nome}</p>
                {conf.filter((c) => c.bilhete.id === b.id).map((c) => (
                  <JogoRow key={c.idx} rotulo={`Jogo ${"ABC"[c.idx] ?? c.idx + 1}`} jogo={c.jogo} dezenas={r?.dezenas}
                    acertos={c.acertos} valor={c.valor} situacao={c.situacao} chave={`${numero}-${r ? 1 : 0}`} />
                ))}
              </div>
            ))}
          </div>
        </section>
      </div>

      {r && (
        <Premiacao
          r={r}
          estimativa={resultados.get(numero - 1)?.estimativaProximo}
          nossos={conf.reduce<Record<number, number>>((m, c) => {
            if (premiado(c.acertos)) m[c.acertos] = (m[c.acertos] ?? 0) + 1;
            return m;
          }, {})}
        />
      )}

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
        {/* pílula de vidro com borda em degradê roxo→dourado (mesmo design da nav do bolão Mega) */}
        <div className="pointer-events-auto rounded-full bg-gradient-to-r from-roxo/60 via-white/30 to-ouro/60 p-px shadow-[0_18px_40px_-12px_color-mix(in_srgb,var(--roxo-escuro)_55%,transparent),0_2px_8px_rgba(0,0,0,.12)]">
          <div className="material flex rounded-full !border-0 p-1.5">
            <button onClick={() => { vibrar(6); setResumo(true); }}
              className="pressionavel relative flex min-w-[118px] items-center justify-center gap-2 rounded-full bg-gradient-to-b from-roxo-claro to-roxo px-5 py-3 text-[14px] font-semibold text-white shadow-[inset_0_1px_0_rgba(255,255,255,.35),0_8px_22px_-6px_color-mix(in_srgb,var(--roxo)_70%,transparent)]">
              <IconeResumo />
              Resumo do bolão
            </button>
          </div>
        </div>
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

function Selo({ status, horaSorteio }: { status: Status; horaSorteio: number }) {
  const m = {
    realizado: ["Realizado", "bg-roxo-suave text-roxo"],
    hoje: [`Hoje às ${horaSorteio}h`, "bg-roxo text-white"],
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

function Espera({ status, numero, estado, hora, horaSorteio }: {
  status: Status; numero: number; estado: ReturnType<typeof useResultados>["estado"]; hora: number; horaSorteio: number;
}) {
  const estimativa = estado?.proximo === numero ? estado.estimativaProximo : 0;
  let titulo = "Aguardando o sorteio";
  let sub = "";
  if (status === "hoje") {
    const falta = Math.max(0, horaSorteio - hora);
    const h = Math.floor(falta), m = Math.round((falta - h) * 60);
    titulo = `Sorteio em ${h ? `${h}h ` : ""}${m}min`;
    sub = "O resultado aparece aqui sozinho, assim que a Caixa publicar.";
  } else if (status === "aguardando") {
    titulo = "Sorteio realizado, buscando resultado…";
    sub = `Costuma sair entre ${horaSorteio}h30 e ${horaSorteio + 1}h30. Esta tela atualiza sozinha.`;
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

function IconeResumo() {
  return (
    <svg viewBox="0 0 24 24" className="size-[18px]" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />
    </svg>
  );
}

/** Trevos decorativos do cartão (roxo/rosa): um grande e suave no canto, pequenos perto do selo. */
function TrevosCard({ chave }: { chave: number }) {
  const reduzir = useReducedMotion();
  const trevos = [
    { c: "-right-14 -bottom-16 size-64 text-roxo/[.06] sm:size-80", r: -18, d: 0.1 },
    { c: "right-[22%] top-[10%] size-8 text-[#ff6fb5]/30 sm:size-10", r: 14, d: 0.25 },
    { c: "right-[34%] top-[4%] size-5 text-roxo/25", r: 30, d: 0.35 },
    { c: "right-[4%] top-[30%] size-6 text-roxo-claro/30 sm:size-7", r: -25, d: 0.45 },
  ];
  return (
    <div className="pointer-events-none absolute inset-0 -z-10" aria-hidden>
      {trevos.map((t, i) => (
        <motion.div key={`${chave}-${i}`} className={`absolute ${t.c}`}
          initial={reduzir ? { opacity: 0 } : { opacity: 0, scale: 0.6, rotate: t.r - 40 }}
          animate={{ opacity: 1, scale: 1, rotate: t.r }}
          transition={reduzir ? { duration: 0.3 } : { type: "spring", bounce: 0.2, duration: 0.9, delay: t.d }}>
          <Trevo className="size-full" />
        </motion.div>
      ))}
    </div>
  );
}
