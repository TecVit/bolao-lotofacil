export type Resultado = {
  numero: number;
  data: string; // dd/mm/aaaa
  dezenas: number[]; // ordenadas
  ordemSorteio: number[];
  acumulado: boolean;
  premios: { faixa: number; acertos: number; ganhadores: number; valor: number }[];
  local?: string;
  /** total arrecadado no concurso */
  arrecadado?: number;
  /** estimativa de prêmio (15 acertos) para o concurso seguinte */
  estimativaProximo?: number;
  fonte: "caixa" | "loteriascaixa-api" | "guidi";
  atualizadoEm: number;
  /** quando entrou no bolão pela primeira vez (não muda em correções) */
  adicionadoEm?: number;
};

export type Estado = {
  ultimo: number;
  proximo: number;
  dataProximo: string;
  estimativaProximo: number;
  atualizadoEm: number;
  /** última vez que /api/sync consultou as APIs */
  verificadoEm?: number;
  /** fonte que respondeu na última verificação (ou null se todas falharam) */
  verificadoFonte?: string | null;
};

export type Bilhete = { id: number; nome: string; jogos: number[][]; valor?: number };
