import type { NomeEstrategia } from '../../../domain/enums/nome-estrategia';
import type { Profissional } from '../../../domain/entities/profissional';
import type { CandidatoRanqueado } from '../candidato-ranqueado';
import type { ContextoRecomendacao } from '../contexto-recomendacao';
import { limitar01, ordenarPorScore } from '../pontuacao';
import type { EstrategiaRecomendacao } from './estrategia-recomendacao';

export class EstrategiaFiltragemColaborativa implements EstrategiaRecomendacao {
  readonly nome: NomeEstrategia = 'FILTRAGEM_COLABORATIVA';

  ranquear(
    candidatos: readonly Profissional[],
    contexto: ContextoRecomendacao,
  ): CandidatoRanqueado[] {
    const { parametros, equipeParcial } = contexto;
    const pesoAfinidade = parametros.pesoAfinidadeColaborativa;

    const ranqueados = candidatos.map((profissional) => {
      const notaBayesiana = limitar01(
        this.mediaBayesiana(profissional, parametros.constanteSuavizacaoBayesiana, parametros.mediaGlobalAvaliacoes) / 5,
      );
      const afinidade = this.afinidadeMediaComEquipe(profissional, equipeParcial);

      const score = limitar01(
        (1 - pesoAfinidade) * notaBayesiana + pesoAfinidade * afinidade,
      );

      return {
        profissional,
        score,
        detalhamento: { notaBayesiana, afinidade },
      };
    });

    return ordenarPorScore(ranqueados);
  }

  private mediaBayesiana(profissional: Profissional, m: number, mediaGlobal: number): number {
    const v = profissional.totalAvaliacoes;
    const r = profissional.mediaAvaliacoes;
    if (v + m <= 0) {
      return mediaGlobal;
    }
    return (v * r + m * mediaGlobal) / (v + m);
  }

  private afinidadeMediaComEquipe(
    profissional: Profissional,
    equipeParcial: readonly Profissional[],
  ): number {
    if (equipeParcial.length === 0) {
      return 0.5;
    }
    const soma = equipeParcial.reduce(
      (total, membro) => total + (profissional.afinidadeCom(membro.id) ?? 0.5),
      0,
    );
    return soma / equipeParcial.length;
  }
}
