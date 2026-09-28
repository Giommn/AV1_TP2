import type { NomeEstrategia } from '../../../domain/enums/nome-estrategia';
import type { Profissional } from '../../../domain/entities/profissional';
import type { CandidatoRanqueado } from '../candidato-ranqueado';
import type { ContextoRecomendacao } from '../contexto-recomendacao';
import { adequacaoCusto, limitar01, ordenarPorScore } from '../pontuacao';
import type { EstrategiaRecomendacao } from './estrategia-recomendacao';

export interface PesosOrcamentoReduzido {
  custo: number;
  similaridade: number;
  avaliacao: number;
}

export const PESOS_PADRAO_ORCAMENTO_REDUZIDO: PesosOrcamentoReduzido = {
  custo: 0.5,
  similaridade: 0.3,
  avaliacao: 0.2,
};

export class EstrategiaOrcamentoReduzido implements EstrategiaRecomendacao {
  readonly nome: NomeEstrategia = 'ORCAMENTO_REDUZIDO';

  constructor(
    private readonly pesos: PesosOrcamentoReduzido = PESOS_PADRAO_ORCAMENTO_REDUZIDO,
  ) {}

  ranquear(
    candidatos: readonly Profissional[],
    contexto: ContextoRecomendacao,
  ): CandidatoRanqueado[] {
    const { perfilDesejado, tetoOrcamentalPapel } = contexto;

    const dentroDoTeto = candidatos.filter((profissional) =>
      profissional.cobraAte(tetoOrcamentalPapel),
    );

    const ranqueados = dentroDoTeto.map((profissional) => {
      const custo = adequacaoCusto(profissional.precoMinimo, tetoOrcamentalPapel);
      const similaridade = profissional.competencias.similaridadeCosseno(perfilDesejado);
      const avaliacao = profissional.notaNormalizada();

      const score = limitar01(
        this.pesos.custo * custo
          + this.pesos.similaridade * similaridade
          + this.pesos.avaliacao * avaliacao,
      );

      return {
        profissional,
        score,
        detalhamento: { custo, similaridade, avaliacao },
      };
    });

    return ordenarPorScore(ranqueados);
  }
}
