

export class Localizacao {
  readonly cidadeNorm: string;
  readonly ufNorm: string;
  readonly paisNorm: string;

  constructor(
    readonly cidade: string,
    readonly uf: string,
    readonly pais: string = 'Brasil',
  ) {
    this.cidadeNorm = cidade.trim().toLowerCase();
    this.ufNorm = uf.trim().toLowerCase();
    this.paisNorm = pais.trim().toLowerCase();
  }

  mesmaCidade(outra: Localizacao): boolean {
    return this.cidadeNorm === outra.cidadeNorm && this.mesmoEstado(outra);
  }

  mesmoEstado(outra: Localizacao): boolean {
    return this.ufNorm === outra.ufNorm && this.paisNorm === outra.paisNorm;
  }

  afinidadeCom(outra: Localizacao): number {
    if (this.cidadeNorm === outra.cidadeNorm && this.ufNorm === outra.ufNorm && this.paisNorm === outra.paisNorm) {
      return 1;
    }
    if (this.ufNorm === outra.ufNorm && this.paisNorm === outra.paisNorm) {
      return 0.6;
    }
    if (this.paisNorm === outra.paisNorm) {
      return 0.3;
    }
    return 0;
  }
}
