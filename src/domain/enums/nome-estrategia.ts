export const NOMES_ESTRATEGIAS = [
  'SIMILARIDADE_COSSENO',
  'FILTRAGEM_COLABORATIVA',
  'ORCAMENTO_REDUZIDO',
] as const;

export type NomeEstrategia = (typeof NOMES_ESTRATEGIAS)[number];
