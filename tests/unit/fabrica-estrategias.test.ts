import { describe, expect, it } from 'vitest';
import { FabricaEstrategias } from '../../src/application/recommendation/strategies/fabrica-estrategias';
import { NOMES_ESTRATEGIAS } from '../../src/domain/enums/nome-estrategia';
import { projetoFake } from '../helpers/fabricas';

describe('FabricaEstrategias', () => {
  it('respeita a estratégia preferida definida pelo produtor no projeto', () => {
    const projeto = projetoFake({ estrategiaPreferida: 'FILTRAGEM_COLABORATIVA' });
    const estrategia = new FabricaEstrategias().resolverParaProjeto(projeto);
    expect(estrategia.nome).toBe('FILTRAGEM_COLABORATIVA');
  });

  it('escolhe ORCAMENTO_REDUZIDO automaticamente quando o orçamento está abaixo do limiar', () => {
    const projeto = projetoFake({ orcamentoTotal: 120_000 });
    const estrategia = new FabricaEstrategias().resolverParaProjeto(projeto);
    expect(estrategia.nome).toBe('ORCAMENTO_REDUZIDO');
  });

  it('escolhe SIMILARIDADE_COSSENO como padrão para orçamentos acima do limiar', () => {
    const projeto = projetoFake({ orcamentoTotal: 2_000_000 });
    const estrategia = new FabricaEstrategias().resolverParaProjeto(projeto);
    expect(estrategia.nome).toBe('SIMILARIDADE_COSSENO');
  });

  it('limiar é configurável via parâmetros', () => {
    const fabrica = new FabricaEstrategias({
      pesoSimilaridade: 0.55, pesoAvaliacao: 0.2, pesoCusto: 0.15, pesoLocalizacao: 0.1,
      fracaoOrcamentoEquipe: 0.6, limiarOrcamentoReduzido: 5_000_000,
      constanteSuavizacaoBayesiana: 5, mediaGlobalAvaliacoes: 3.8,
      pesoAfinidadeColaborativa: 0.25, tamanhoTop: 5,
    });
    const projeto = projetoFake({ orcamentoTotal: 2_000_000 });
    expect(fabrica.resolverParaProjeto(projeto).nome).toBe('ORCAMENTO_REDUZIDO');
  });

  it('cria todas as estratégias conhecidas pelo nome', () => {
    const fabrica = new FabricaEstrategias();
    for (const nome of NOMES_ESTRATEGIAS) {
      expect(fabrica.criar(nome).nome).toBe(nome);
    }
  });
});
