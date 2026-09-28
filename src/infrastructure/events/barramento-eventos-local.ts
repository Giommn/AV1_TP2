import { EventEmitter } from 'node:events';
import type { EventoDominio } from '../../domain/events/eventos';
import type { BarramentoEventos, ObservadorEvento } from '../../domain/ports/barramento-eventos';

export class BarramentoEventosLocal implements BarramentoEventos {
  private readonly emitter = new EventEmitter();
  private readonly observadores = new Set<ObservadorEvento>();
  private pendentes: Promise<void>[] = [];
  private readonly errosObservadores: unknown[] = [];

  constructor() {
    this.emitter.setMaxListeners(100);
  }

  assinar(observador: ObservadorEvento): void {
    this.observadores.add(observador);
  }

  publicar(evento: EventoDominio): void {
    this.emitter.emit(evento.tipo, evento);
    for (const observador of this.observadores) {
      if (!observador.interessa(evento.tipo)) {
        continue;
      }
      try {
        const resultado = observador.reagir(evento);
        if (resultado instanceof Promise) {
          this.pendentes.push(
            resultado.catch((erro: unknown) => {
              this.errosObservadores.push(erro);
            }),
          );
        }
      } catch (erro) {
        this.errosObservadores.push(erro);
      }
    }
  }

  get erros(): readonly unknown[] {
    return [...this.errosObservadores];
  }

  async aguardarProcessamento(): Promise<void> {
    while (this.pendentes.length > 0) {
      const lote = this.pendentes;
      this.pendentes = [];
      await Promise.all(lote);
    }
  }
}
