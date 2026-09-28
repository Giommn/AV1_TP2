import type { Papel } from '../enums/papel';
import type { VetorCompetencias } from '../value-objects/vetor-competencias';
import type { Localizacao } from '../value-objects/localizacao';
import type { IntervaloDatas } from '../value-objects/intervalo-datas';

export interface DadosProfissional {
  id: string;
  nome: string;
  papeis: readonly Papel[];
  competencias: VetorCompetencias;
  precoMinimo: number;
  precoMaximo: number;
  disponibilidade: readonly IntervaloDatas[];
  localizacao: Localizacao;
  mediaAvaliacoes: number;
  totalAvaliacoes: number;

  afinidades?: Readonly<Record<string, number>>;
}

export class Profissional {
  constructor(private readonly dados: DadosProfissional) {
    if (dados.precoMinimo < 0) {
      throw new Error(`Profissional ${dados.id}: preço mínimo não pode ser negativo.`);
    }
    if (dados.precoMaximo < dados.precoMinimo) {
      throw new Error(`Profissional ${dados.id}: faixa de preço inválida (máx < mín).`);
    }
    if (dados.mediaAvaliacoes < 0 || dados.mediaAvaliacoes > 5) {
      throw new Error(`Profissional ${dados.id}: média de avaliações fora do intervalo 0..5.`);
    }
    if (dados.totalAvaliacoes < 0) {
      throw new Error(`Profissional ${dados.id}: total de avaliações não pode ser negativo.`);
    }
  }

  get id(): string {
    return this.dados.id;
  }

  get nome(): string {
    return this.dados.nome;
  }

  get papeis(): readonly Papel[] {
    return this.dados.papeis;
  }

  get competencias(): VetorCompetencias {
    return this.dados.competencias;
  }

  get precoMinimo(): number {
    return this.dados.precoMinimo;
  }

  get precoMaximo(): number {
    return this.dados.precoMaximo;
  }

  get localizacao(): Localizacao {
    return this.dados.localizacao;
  }

  get mediaAvaliacoes(): number {
    return this.dados.mediaAvaliacoes;
  }

  get totalAvaliacoes(): number {
    return this.dados.totalAvaliacoes;
  }

  atuaComo(papel: Papel): boolean {
    return this.dados.papeis.includes(papel);
  }

  cobraAte(teto: number): boolean {
    return this.dados.precoMinimo <= teto;
  }

  estaDisponivelEm(periodo: IntervaloDatas): boolean {
    return this.dados.disponibilidade.some((janela) => janela.contemIntervalo(periodo));
  }

  afinidadeCom(profissionalId: string): number | undefined {
    return this.dados.afinidades?.[profissionalId];
  }

  notaNormalizada(): number {
    return this.dados.mediaAvaliacoes / 5;
  }
}
