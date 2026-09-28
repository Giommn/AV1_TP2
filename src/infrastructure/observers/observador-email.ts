import type { EventoDominio } from '../../domain/events/eventos';
import {
  ConviteAceitoEvento,
  ConviteCriadoEvento,
  ConviteRecusadoEvento,
  EquipeFormadaEvento,
} from '../../domain/events/eventos';
import type { ObservadorEvento } from '../../domain/ports/barramento-eventos';

export interface NotificacaoEmail {
  destinatario: string;
  assunto: string;
  corpo: string;
}

export type TransporteEmail = (notificacao: NotificacaoEmail) => Promise<void> | void;

export class ObservadorEmail implements ObservadorEvento {
  readonly nome = 'observador-email';
  private readonly enviadas: NotificacaoEmail[] = [];

  constructor(private readonly transporte?: TransporteEmail) {}

  interessa(tipoDoEvento: string): boolean {
    return ['CONVITE_CRIADO', 'CONVITE_ACEITO', 'CONVITE_RECUSADO', 'EQUIPE_FORMADA'].includes(
      tipoDoEvento,
    );
  }

  reagir(evento: EventoDominio): Promise<void> | void {
    if (evento instanceof ConviteCriadoEvento) {
      return this.enviar({
        destinatario: `profissional:${evento.profissionalId}`,
        assunto: 'Novo interesse em seu perfil — CineBridge',
        corpo: `Um produtor demonstrou interesse no seu perfil para o papel ${evento.papel} (projeto ${evento.projetoId}).`,
      });
    }
    if (evento instanceof ConviteAceitoEvento) {
      return this.enviar({
        destinatario: `produtor:projeto-equipe-${evento.equipeId}`,
        assunto: 'Convite aceito — CineBridge',
        corpo: `O profissional ${evento.profissionalId} ACEITOU o convite para o papel ${evento.papel}.`,
      });
    }
    if (evento instanceof ConviteRecusadoEvento) {
      return this.enviar({
        destinatario: `produtor:projeto-equipe-${evento.equipeId}`,
        assunto: 'Convite recusado — CineBridge',
        corpo: `O profissional ${evento.profissionalId} RECUSOU o convite para o papel ${evento.papel}. Considere solicitar uma substituição.`,
      });
    }
    if (evento instanceof EquipeFormadaEvento) {
      return this.enviar({
        destinatario: `produtor:projeto-${evento.projetoId}`,
        assunto: 'Equipe formada — CineBridge',
        corpo: `A equipe ${evento.equipeId} está completa com ${evento.membros.length} membros. Custo total: R$ ${evento.custoTotal}.`,
      });
    }
    return undefined;
  }

  get notificacoesEnviadas(): readonly NotificacaoEmail[] {
    return [...this.enviadas];
  }

  private async enviar(notificacao: NotificacaoEmail): Promise<void> {
    this.enviadas.push(notificacao);
    await this.transporte?.(notificacao);
  }
}
