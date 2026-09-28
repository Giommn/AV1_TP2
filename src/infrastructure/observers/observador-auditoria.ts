import type { EventoDominio } from '../../domain/events/eventos';
import type { ObservadorEvento } from '../../domain/ports/barramento-eventos';

export interface RegistroAuditoria {
  timestamp: string;
  evento: string;
  carga: Record<string, unknown>;
}

export type GravadorAuditoria = (registro: RegistroAuditoria) => Promise<void> | void;

export class ObservadorAuditoria implements ObservadorEvento {
  readonly nome = 'observador-auditoria';
  private readonly registros: RegistroAuditoria[] = [];

  constructor(private readonly gravador?: GravadorAuditoria) {}

  interessa(): boolean {
    return true;
  }

  reagir(evento: EventoDominio): Promise<void> | void {
    const registro: RegistroAuditoria = {
      timestamp: evento.ocorridoEm.toISOString(),
      evento: evento.tipo,
      carga: { ...evento, ocorridoEm: evento.ocorridoEm.toISOString() },
    };
    this.registros.push(registro);
    return this.gravador?.(registro) as Promise<void> | void;
  }

  get registrosAuditados(): readonly RegistroAuditoria[] {
    return [...this.registros];
  }

  registrosDoTipo(tipo: string): RegistroAuditoria[] {
    return this.registros.filter((registro) => registro.evento === tipo);
  }
}
