
export class IntervaloDatas {
  readonly inicioMs: number;
  readonly fimMs: number;

  constructor(
    readonly inicio: Date,
    readonly fim: Date,
  ) {
    this.inicioMs = inicio.getTime();
    this.fimMs = fim.getTime();
    if (this.fimMs < this.inicioMs) {
      throw new Error(
        `Intervalo de datas inválido: fim (${fim.toISOString()}) anterior ao início (${inicio.toISOString()}).`,
      );
    }
  }

  contem(data: Date): boolean {
    const t = data.getTime();
    return t >= this.inicioMs && t <= this.fimMs;
  }

  contemIntervalo(outro: IntervaloDatas): boolean {
    return this.inicioMs <= outro.inicioMs && this.fimMs >= outro.fimMs;
  }

  sobrepoe(outro: IntervaloDatas): boolean {
    return this.inicioMs <= outro.fimMs && outro.inicioMs <= this.fimMs;
  }
}
