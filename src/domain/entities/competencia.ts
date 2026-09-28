export interface DadosCompetencia {
  id: string;
  nome: string;
  categoria: string;
}

export class Competencia {
  constructor(private readonly dados: DadosCompetencia) {}

  get id(): string {
    return this.dados.id;
  }

  get nome(): string {
    return this.dados.nome;
  }

  get categoria(): string {
    return this.dados.categoria;
  }
}
