

export class VetorCompetencias {
  private readonly niveis: ReadonlyMap<string, number>;
  private readonly normaCacheada: number;

  private constructor(niveis: Map<string, number>) {
    this.niveis = niveis;
    let somaQuadrados = 0;
    for (const nivel of niveis.values()) {
      somaQuadrados += nivel * nivel;
    }
    this.normaCacheada = Math.sqrt(somaQuadrados);
  }

  static criar(niveis: Record<string, number>): VetorCompetencias {
    const mapa = new Map<string, number>();
    for (const [competencia, nivel] of Object.entries(niveis)) {
      if (!Number.isFinite(nivel) || nivel < 0 || nivel > 1) {
        throw new Error(
          `Nível inválido para a competência "${competencia}": ${nivel}. Esperado valor entre 0 e 1.`,
        );
      }
      mapa.set(competencia, nivel);
    }
    return new VetorCompetencias(mapa);
  }

  static vazio(): VetorCompetencias {
    return new VetorCompetencias(new Map());
  }

  nivelDe(competencia: string): number {
    return this.niveis.get(competencia) ?? 0;
  }

  dimensoes(): string[] {
    return [...this.niveis.keys()];
  }

  get tamanho(): number {
    return this.niveis.size;
  }

  similaridadeCosseno(outro: VetorCompetencias): number {
    if (this.normaCacheada === 0 || outro.normaCacheada === 0) {
      return 0;
    }
    const [menor, maior] = this.niveis.size <= outro.niveis.size ? [this, outro] : [outro, this];
    let produtoEscalar = 0;
    for (const [dimensao, nivel] of menor.niveis) {
      produtoEscalar += nivel * maior.nivelDe(dimensao);
    }
    return produtoEscalar / (menor.normaCacheada * maior.normaCacheada);
  }
}
