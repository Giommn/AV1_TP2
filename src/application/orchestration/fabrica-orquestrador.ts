import type { Projeto } from '../../domain/entities/projeto';
import { TipoCaptacao } from '../../domain/enums/tipo-captacao';
import type { BarramentoEventos } from '../../domain/ports/barramento-eventos';
import type {
  FonteFallbackProfissionais,
  RepositorioProfissionais,
} from '../../domain/ports/repositorios';
import { MotorRecomendacao } from '../recommendation/motor-recomendacao';
import type { ParametrosRecomendacao } from '../recommendation/parametros-recomendacao';
import type { FabricaEstrategias } from '../recommendation/strategies/fabrica-estrategias';
import type { OrquestradorComposicaoEquipe } from './orquestrador-composicao-equipe';
import { OrquestradorEquipeDocumentario } from './orquestradores/documentario';
import { OrquestradorEquipeFiccao } from './orquestradores/ficcao';
import { OrquestradorEquipeAnimacao } from './orquestradores/animacao';

export interface DependenciasOrquestracao {
  repositorioProfissionais: RepositorioProfissionais;
  barramento: BarramentoEventos;
  fonteFallback: FonteFallbackProfissionais;
  fabricaEstrategias: FabricaEstrategias;
  parametros: ParametrosRecomendacao;
}

export class FabricaOrquestrador {
  constructor(private readonly dependencias: DependenciasOrquestracao) {}

  resolverParaProjeto(projeto: Projeto): OrquestradorComposicaoEquipe {
    const motor = new MotorRecomendacao(
      this.dependencias.fabricaEstrategias.resolverParaProjeto(projeto),
      this.dependencias.parametros,
    );
    const {
      repositorioProfissionais,
      barramento,
      fonteFallback,
      parametros,
    } = this.dependencias;

    switch (projeto.tipoCaptacao) {
      case TipoCaptacao.DOCUMENTARIO:
        return new OrquestradorEquipeDocumentario(
          motor, repositorioProfissionais, barramento, fonteFallback, parametros,
        );
      case TipoCaptacao.FICCAO:
        return new OrquestradorEquipeFiccao(
          motor, repositorioProfissionais, barramento, fonteFallback, parametros,
        );
      case TipoCaptacao.ANIMACAO:
        return new OrquestradorEquipeAnimacao(
          motor, repositorioProfissionais, barramento, fonteFallback, parametros,
        );
    }
  }
}
