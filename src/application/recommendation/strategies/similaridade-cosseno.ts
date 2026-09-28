import type { NomeEstrategia } from '../../../domain/enums/nome-estrategia';
import type { Profissional } from '../../../domain/entities/profissional';
import type { CandidatoRanqueado } from '../candidato-ranqueado';
import type { ContextoRecomendacao } from '../contexto-recomendacao';
import { adequacaoCusto, limitar01, ordenarPorScore } from '../pontuacao';
import type { EstrategiaRecomendacao } from './estrategia-recomendacao';

export class EstrategiaSimilaridadeCosseno implements EstrategiaRecomendacao {
  readonly nome: NomeEstrategia = 'SIMILARIDADE_COSSENO';

  ranquear(
    candidatos: readonly Profissional[],
    contexto: ContextoRecomendacao,
  ): CandidatoRanqueado[] {
    const { parametros, perfilDesejado, tetoOrcamentalPapel, projeto } = contexto;

    const ranqueados = candidatos.map((profissional) => {
      const similaridade = profissional.competencias.similaridadeCosseno(perfilDesejado);
      const avaliacao = profissional.notaNormalizada();
      const custo = adequacaoCusto(profissional.precoMinimo, tetoOrcamentalPapel);
      const localizacao = profissional.localizacao.afinidadeCom(projeto.localizacaoFiltragens);

      const score = limitar01(
        parametros.pesoSimilaridade * similaridade
          + parametros.pesoAvaliacao * avaliacao
          + parametros.pesoCusto * custo
          + parametros.pesoLocalizacao * localizacao,
      );

      return {
        profissional,
        score,
        detalhamento: { similaridade, avaliacao, custo, localizacao },
      };
    });

    return ordenarPorScore(ranqueados);
  }
}
