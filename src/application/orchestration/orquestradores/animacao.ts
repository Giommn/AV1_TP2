import type { Projeto } from '../../../domain/entities/projeto';
import type { Equipe } from '../../../domain/entities/equipe';
import { Localizacao } from '../../../domain/value-objects/localizacao';
import { Papel } from '../../../domain/enums/papel';
import type { CandidatoRanqueado } from '../../recommendation/candidato-ranqueado';
import { ErroNegocio } from '../../erros';
import { OrquestradorComposicaoEquipe } from '../orquestrador-composicao-equipe';

const LOCALIZACAO_REMOTA = new Localizacao('Remoto', 'REMOTO', 'Remoto');

export class OrquestradorEquipeAnimacao extends OrquestradorComposicaoEquipe {
  protected normalizarEntrada(projeto: Projeto): Projeto {
    return projeto.comLocalizacaoFiltragens(LOCALIZACAO_REMOTA);
  }

  protected posProcessar(ranqueados: CandidatoRanqueado[]): CandidatoRanqueado[] {
    return ranqueados;
  }

  protected validarRestricoesOrcamentarias(equipe: Equipe, projeto: Projeto): void {
    const limite = projeto.orcamentoTotal * this.parametros.fracaoOrcamentoEquipe;
    if (equipe.custoTotal() > limite) {
      throw new ErroNegocio(
        `Animação: custo da equipe (R$ ${equipe.custoTotal()}) excede o orçamento reservado à equipe (R$ ${limite}).`,
      );
    }
    if (projeto.requerPapel(Papel.VFX) && equipe.membroDo(Papel.VFX) === undefined) {
      throw new ErroNegocio(
        'Animação: o papel VFX é obrigatório para este tipo de captação e ficou sem candidato elegível.',
      );
    }
  }
}
