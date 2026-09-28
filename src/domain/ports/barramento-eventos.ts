import type { EventoDominio } from '../events/eventos';

export interface ObservadorEvento {
  readonly nome: string;
  interessa(tipoDoEvento: string): boolean;
  reagir(evento: EventoDominio): void | Promise<void>;
}

export interface BarramentoEventos {
  assinar(observador: ObservadorEvento): void;
  publicar(evento: EventoDominio): void;
}
