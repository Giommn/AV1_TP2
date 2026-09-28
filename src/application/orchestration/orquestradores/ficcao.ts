import type { Projeto } from '../../../domain/entities/projeto';
import type { Equipe } from '../../../domain/entities/equipe';
import type { CandidatoRanqueado } from '../../recommendation/candidato-ranqueado';
import { limitar01, ordenarPorScore } from '../../recommendation/pontuacao';
import { ErroNegocio } from '../../erros';
import { OrquestradorComposicaoEquipe } from '../orquestrador-composicao-equipe';

const BONUS_NARRATIVA = 1.1;
const NIVEL_NARRATIVA_PARA_BONUS = 0.7;

export class OrquestradorEquipeFiccao extends OrquestradorComposicaoEquipe {
  protected normalizarEntrada(projeto: Projeto): Projeto {
    return projeto;
  }

  protected posProcessar(ranqueados: CandidatoRanqueado[]): CandidatoRanqueado[] {
    const comBonus = ranqueados.map((candidato) => {
      const competencias = candidato.profissional.competencias;
      const forteNarrativa =
        competencias.nivelDe('narrativa') >= NIVEL_NARRATIVA_PARA_BONUS
        || competencias.nivelDe('roteiro') >= NIVEL_NARRATIVA_PARA_BONUS;
      const bonusNarrativa = forteNarrativa ? BONUS_NARRATIVA : 1;
      return {
        profissional: candidato.profissional,
        score: limitar01(candidato.score * bonusNarrativa),
        detalhamento: { ...candidato.detalhamento, bonusNarrativa },
      };
    });
    return ordenarPorScore(comBonus);
  }

  protected validarRestricoesOrcamentarias(equipe: Equipe, projeto: Projeto): void {
    const limite = projeto.orcamentoTotal * this.parametros.fracaoOrcamentoEquipe;
    if (equipe.custoTotal() > limite) {
      throw new ErroNegocio(
        `Ficção: custo da equipe (R$ ${equipe.custoTotal()}) excede o orçamento reservado à equipe (R$ ${limite}).`,
      );
    }
  }
}
