import type { Projeto } from '../../../domain/entities/projeto';
import type { Equipe } from '../../../domain/entities/equipe';
import { IntervaloDatas } from '../../../domain/value-objects/intervalo-datas';
import type { CandidatoRanqueado } from '../../recommendation/candidato-ranqueado';
import { ErroNegocio } from '../../erros';
import { OrquestradorComposicaoEquipe } from '../orquestrador-composicao-equipe';

const FOLGA_DOCUMENTARIO_DIAS = 30;
const MARGEM_RESERVA_DOCUMENTARIO = 0.5;

export class OrquestradorEquipeDocumentario extends OrquestradorComposicaoEquipe {
  protected normalizarEntrada(projeto: Projeto): Projeto {
    const fimEstendido = new Date(
      projeto.periodoFiltragens.fim.getTime() + FOLGA_DOCUMENTARIO_DIAS * 24 * 60 * 60 * 1000,
    );
    return projeto.comPeriodo(
      new IntervaloDatas(projeto.periodoFiltragens.inicio, fimEstendido),
    );
  }

  protected posProcessar(ranqueados: CandidatoRanqueado[]): CandidatoRanqueado[] {
    return ranqueados;
  }

  protected validarRestricoesOrcamentarias(equipe: Equipe, projeto: Projeto): void {
    const limite =
      projeto.orcamentoTotal * this.parametros.fracaoOrcamentoEquipe * MARGEM_RESERVA_DOCUMENTARIO;
    if (equipe.custoTotal() > limite) {
      throw new ErroNegocio(
        `Documentário: custo da equipe (R$ ${equipe.custoTotal()}) excede o teto com reserva de `
          + `${MARGEM_RESERVA_DOCUMENTARIO * 100}% do orçamento da equipe (R$ ${limite}).`,
      );
    }
  }
}
