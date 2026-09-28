import type { EventoDominio } from '../../domain/events/eventos';
import type { ObservadorEvento } from '../../domain/ports/barramento-eventos';

export interface PublicacaoMensageria {
  topico: string;
  carga: Record<string, unknown>;
}

export type PublicadorMensageria = (publicacao: PublicacaoMensageria) => Promise<void> | void;

export class ObservadorMensageria implements ObservadorEvento {
  readonly nome = 'observador-mensageria';
  private readonly publicacoes: PublicacaoMensageria[] = [];

  constructor(private readonly publicador?: PublicadorMensageria) {}

  interessa(tipoDoEvento: string): boolean {
    return ['EQUIPE_COMPOSTA', 'EQUIPE_FORMADA', 'SUBSTITUICAO_REALIZADA'].includes(tipoDoEvento);
  }

  reagir(evento: EventoDominio): Promise<void> | void {
    const publicacao: PublicacaoMensageria = {
      topico: `cinebridge.${evento.tipo.toLowerCase()}`,
      carga: { ...evento, ocorridoEm: evento.ocorridoEm.toISOString() },
    };
    this.publicacoes.push(publicacao);
    return this.publicador?.(publicacao) as Promise<void> | void;
  }

  get mensagensPublicadas(): readonly PublicacaoMensageria[] {
    return [...this.publicacoes];
  }
}
