

export interface ParametrosRecomendacao {
  pesoSimilaridade: number;
  pesoAvaliacao: number;
  pesoCusto: number;
  pesoLocalizacao: number;
  fracaoOrcamentoEquipe: number;
  limiarOrcamentoReduzido: number;
  constanteSuavizacaoBayesiana: number;
  mediaGlobalAvaliacoes: number;
  pesoAfinidadeColaborativa: number;
  tamanhoTop: number;
}

export const PARAMETROS_PADRAO: ParametrosRecomendacao = {
  pesoSimilaridade: 0.55,
  pesoAvaliacao: 0.2,
  pesoCusto: 0.15,
  pesoLocalizacao: 0.1,
  fracaoOrcamentoEquipe: 0.6,
  limiarOrcamentoReduzido: 300_000,
  constanteSuavizacaoBayesiana: 5,
  mediaGlobalAvaliacoes: 3.8,
  pesoAfinidadeColaborativa: 0.25,
  tamanhoTop: 5,
};
