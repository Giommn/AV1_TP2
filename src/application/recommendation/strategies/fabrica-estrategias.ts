import type { Projeto } from '../../../domain/entities/projeto';
import type { NomeEstrategia } from '../../../domain/enums/nome-estrategia';
import { PARAMETROS_PADRAO, type ParametrosRecomendacao } from '../parametros-recomendacao';
import type { EstrategiaRecomendacao } from './estrategia-recomendacao';
import { EstrategiaSimilaridadeCosseno } from './similaridade-cosseno';
import { EstrategiaFiltragemColaborativa } from './filtragem-colaborativa';
import { EstrategiaOrcamentoReduzido } from './orcamento-reduzido';

export class FabricaEstrategias {
  constructor(private readonly parametros: ParametrosRecomendacao = PARAMETROS_PADRAO) {}

  resolverParaProjeto(projeto: Projeto): EstrategiaRecomendacao {
    if (projeto.estrategiaPreferida !== undefined) {
      return this.criar(projeto.estrategiaPreferida);
    }
    if (projeto.orcamentoTotal < this.parametros.limiarOrcamentoReduzido) {
      return this.criar('ORCAMENTO_REDUZIDO');
    }
    return this.criar('SIMILARIDADE_COSSENO');
  }

  criar(nome: NomeEstrategia): EstrategiaRecomendacao {
    switch (nome) {
      case 'SIMILARIDADE_COSSENO':
        return new EstrategiaSimilaridadeCosseno();
      case 'FILTRAGEM_COLABORATIVA':
        return new EstrategiaFiltragemColaborativa();
      case 'ORCAMENTO_REDUZIDO':
        return new EstrategiaOrcamentoReduzido();
    }
  }
}
