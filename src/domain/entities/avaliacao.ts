export interface DadosAvaliacao {
  id: string;
  profissionalId: string;
  projetoId: string;
  avaliadorId: string;
  nota: number;
  comentario?: string;
  data: Date;
}

export class Avaliacao {
  constructor(private readonly dados: DadosAvaliacao) {
    if (dados.nota < 0 || dados.nota > 5) {
      throw new Error(`Avaliação ${dados.id}: nota fora do intervalo 0..5 (recebida: ${dados.nota}).`);
    }
  }

  get id(): string {
    return this.dados.id;
  }

  get profissionalId(): string {
    return this.dados.profissionalId;
  }

  get projetoId(): string {
    return this.dados.projetoId;
  }

  get nota(): number {
    return this.dados.nota;
  }

  get comentario(): string | undefined {
    return this.dados.comentario;
  }

  get data(): Date {
    return this.dados.data;
  }
}
