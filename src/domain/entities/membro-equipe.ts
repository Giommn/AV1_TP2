import type { Papel } from '../enums/papel';
import { StatusConvite } from '../enums/status-convite';
import type { Profissional } from './profissional';
import type { VisitanteProjeto } from '../visitors/visitante-projeto';

export interface DadosMembroEquipe {
  papel: Papel;
  profissional: Profissional;
  custoAcordado: number;
  scoreRecomendacao: number;
  status?: StatusConvite;
}

export class MembroEquipe {
  private statusAtual: StatusConvite;

  constructor(private readonly dados: DadosMembroEquipe) {
    this.statusAtual = dados.status ?? StatusConvite.PENDENTE;
  }

  get papel(): Papel {
    return this.dados.papel;
  }

  get profissional(): Profissional {
    return this.dados.profissional;
  }

  get custoAcordado(): number {
    return this.dados.custoAcordado;
  }

  get scoreRecomendacao(): number {
    return this.dados.scoreRecomendacao;
  }

  get status(): StatusConvite {
    return this.statusAtual;
  }

  confirmarInteresse(): void {
    if (this.statusAtual !== StatusConvite.PENDENTE) {
      throw new Error(
        `Membro ${this.dados.profissional.id} (${this.dados.papel}) já foi respondido: ${this.statusAtual}.`,
      );
    }
    this.statusAtual = StatusConvite.ACEITO;
  }

  recusarInteresse(): void {
    if (this.statusAtual !== StatusConvite.PENDENTE) {
      throw new Error(
        `Membro ${this.dados.profissional.id} (${this.dados.papel}) já foi respondido: ${this.statusAtual}.`,
      );
    }
    this.statusAtual = StatusConvite.RECUSADO;
  }

  aceitarVisitante(visitante: VisitanteProjeto): void {
    visitante.visitarMembroEquipe(this);
  }
}
