import type { Papel } from '../enums/papel';
import type { NomeEstrategia } from '../enums/nome-estrategia';

export interface CandidatoRecomendado {
  profissionalId: string;
  nome: string;
  score: number;
  detalhamento: Record<string, number>;
}

export type OrigemDados = 'REPOSITORIO' | 'FALLBACK';

export interface DadosRecomendacao {
  id: string;
  projetoId: string;
  papel: Papel;
  estrategiaUsada: NomeEstrategia;
  origemDados: OrigemDados;
  candidatos: CandidatoRecomendado[];
}

export class Recomendacao {
  readonly criadaEm = new Date();

  constructor(private readonly dados: DadosRecomendacao) {}

  get id(): string {
    return this.dados.id;
  }

  get projetoId(): string {
    return this.dados.projetoId;
  }

  get papel(): Papel {
    return this.dados.papel;
  }

  get estrategiaUsada(): NomeEstrategia {
    return this.dados.estrategiaUsada;
  }

  get origemDados(): OrigemDados {
    return this.dados.origemDados;
  }

  get candidatos(): readonly CandidatoRecomendado[] {
    return this.dados.candidatos;
  }

  get primeiroColocado(): CandidatoRecomendado | undefined {
    return this.dados.candidatos[0];
  }
}
