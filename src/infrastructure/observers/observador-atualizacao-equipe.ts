import type { EventoDominio } from '../../domain/events/eventos';
import {
  ConviteAceitoEvento,
  ConviteRecusadoEvento,
  EquipeFormadaEvento,
  SubstituicaoRealizadaEvento,
} from '../../domain/events/eventos';
import type { BarramentoEventos, ObservadorEvento } from '../../domain/ports/barramento-eventos';
import type {
  RepositorioEquipes,
  RepositorioProjetos,
} from '../../domain/ports/repositorios';
import { StatusEquipe } from '../../domain/enums/status-equipe';

export class ObservadorAtualizacaoEquipe implements ObservadorEvento {
  readonly nome = 'observador-atualizacao-equipe';
  private readonly equipesFormadasNotificadas = new Set<string>();

  constructor(
    private readonly repositorioEquipes: RepositorioEquipes,
    private readonly repositorioProjetos: RepositorioProjetos,
    private readonly barramento: BarramentoEventos,
  ) {}

  interessa(tipoDoEvento: string): boolean {
    return ['CONVITE_ACEITO', 'CONVITE_RECUSADO', 'SUBSTITUICAO_REALIZADA'].includes(tipoDoEvento);
  }

  async reagir(evento: EventoDominio): Promise<void> {
    if (evento instanceof SubstituicaoRealizadaEvento) {
      await this.recalcularStatus(evento.equipeId);
      return;
    }
    if (evento instanceof ConviteAceitoEvento || evento instanceof ConviteRecusadoEvento) {
      const equipe = await this.repositorioEquipes.buscarPorId(evento.equipeId);
      if (equipe === null) {
        return;
      }
      const membro = equipe.membroDo(evento.papel);
      if (membro !== undefined && membro.profissional.id === evento.profissionalId) {
        if (evento instanceof ConviteAceitoEvento) {
          membro.confirmarInteresse();
        } else {
          membro.recusarInteresse();
        }
      }
      await this.recalcularStatus(equipe.id);
    }
  }

  private async recalcularStatus(equipeId: string): Promise<void> {
    const equipe = await this.repositorioEquipes.buscarPorId(equipeId);
    if (equipe === null) {
      return;
    }
    const projeto = await this.repositorioProjetos.buscarPorId(equipe.projetoId);
    if (projeto === null) {
      return;
    }
    equipe.atualizarStatusPorCobertura(projeto.papeisObrigatorios);
    await this.repositorioEquipes.atualizar(equipe);

    if (
      equipe.status === StatusEquipe.FORMADA
      && !this.equipesFormadasNotificadas.has(equipe.id)
    ) {
      this.equipesFormadasNotificadas.add(equipe.id);
      this.barramento.publicar(
        new EquipeFormadaEvento(
          equipe.id,
          equipe.projetoId,
          equipe.membros.map((membro) => ({
            papel: membro.papel,
            profissionalId: membro.profissional.id,
            custoAcordado: membro.custoAcordado,
          })),
          equipe.custoTotal(),
        ),
      );
    }
  }
}
