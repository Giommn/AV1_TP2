import type { TipoCaptacao } from '../enums/tipo-captacao';
import type { NomeEstrategia } from '../enums/nome-estrategia';
import type { Localizacao } from '../value-objects/localizacao';
import type { IntervaloDatas } from '../value-objects/intervalo-datas';
import type { PapelRequerido } from './papel-requerido';
import type { Papel } from '../enums/papel';
import type { VisitanteProjeto } from '../visitors/visitante-projeto';

export interface DadosProjeto {
  id: string;
  titulo?: string;
  genero: string;
  duracaoEstimadaMinutos: number;
  orcamentoTotal: number;
  dataEntrega: Date;
  tipoCaptacao: TipoCaptacao;
  localizacaoFiltragens: Localizacao;
  periodoFiltragens: IntervaloDatas;
  papeisObrigatorios: readonly PapelRequerido[];
  estrategiaPreferida?: NomeEstrategia;
}

export class Projeto {
  constructor(private readonly dados: DadosProjeto) {
    if (dados.orcamentoTotal <= 0) {
      throw new Error(`Projeto ${dados.id}: orçamento total deve ser positivo.`);
    }
    if (dados.papeisObrigatorios.length === 0) {
      throw new Error(`Projeto ${dados.id}: deve haver ao menos um papel obrigatório.`);
    }
  }

  get id(): string {
    return this.dados.id;
  }

  get genero(): string {
    return this.dados.genero;
  }

  get orcamentoTotal(): number {
    return this.dados.orcamentoTotal;
  }

  get dataEntrega(): Date {
    return this.dados.dataEntrega;
  }

  get tipoCaptacao(): TipoCaptacao {
    return this.dados.tipoCaptacao;
  }

  get localizacaoFiltragens(): Localizacao {
    return this.dados.localizacaoFiltragens;
  }

  get periodoFiltragens(): IntervaloDatas {
    return this.dados.periodoFiltragens;
  }

  get papeisObrigatorios(): readonly PapelRequerido[] {
    return this.dados.papeisObrigatorios;
  }

  get estrategiaPreferida(): NomeEstrategia | undefined {
    return this.dados.estrategiaPreferida;
  }

  get somaPesosPapeis(): number {
    return this.dados.papeisObrigatorios.reduce((soma, papel) => soma + papel.peso, 0);
  }

  requerPapel(papel: Papel): boolean {
    return this.dados.papeisObrigatorios.some((requerido) => requerido.papel === papel);
  }

  comPeriodo(novoPeriodo: IntervaloDatas): Projeto {
    return new Projeto({ ...this.dados, periodoFiltragens: novoPeriodo });
  }

  comLocalizacaoFiltragens(novaLocalizacao: Localizacao): Projeto {
    return new Projeto({ ...this.dados, localizacaoFiltragens: novaLocalizacao });
  }

  aceitarVisitante(visitante: VisitanteProjeto): void {
    visitante.visitarProjeto(this);
    for (const papelRequerido of this.dados.papeisObrigatorios) {
      papelRequerido.aceitarVisitante(visitante);
    }
  }
}
