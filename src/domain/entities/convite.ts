import type { Papel } from '../enums/papel';
import { StatusConvite } from '../enums/status-convite';

export interface DadosConvite {
  id: string;
  equipeId: string;
  projetoId: string;
  profissionalId: string;
  papel: Papel;
}

export class Convite {
  private statusAtual = StatusConvite.PENDENTE;
  private respondidoEm: Date | null = null;
  readonly criadoEm = new Date();

  constructor(private readonly dados: DadosConvite) {}

  get id(): string {
    return this.dados.id;
  }

  get equipeId(): string {
    return this.dados.equipeId;
  }

  get projetoId(): string {
    return this.dados.projetoId;
  }

  get profissionalId(): string {
    return this.dados.profissionalId;
  }

  get papel(): Papel {
    return this.dados.papel;
  }

  get status(): StatusConvite {
    return this.statusAtual;
  }

  get dataResposta(): Date | null {
    return this.respondidoEm;
  }

  aceitar(): void {
    this.garantirPendente();
    this.statusAtual = StatusConvite.ACEITO;
    this.respondidoEm = new Date();
  }

  recusar(): void {
    this.garantirPendente();
    this.statusAtual = StatusConvite.RECUSADO;
    this.respondidoEm = new Date();
  }

  private garantirPendente(): void {
    if (this.statusAtual !== StatusConvite.PENDENTE) {
      throw new Error(`Convite ${this.dados.id} já foi respondido (${this.statusAtual}).`);
    }
  }
}
