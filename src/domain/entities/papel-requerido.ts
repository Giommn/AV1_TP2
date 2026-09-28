import type { Papel } from '../enums/papel';
import type { VetorCompetencias } from '../value-objects/vetor-competencias';
import type { VisitanteProjeto } from '../visitors/visitante-projeto';

export class PapelRequerido {
  constructor(
    readonly papel: Papel,
    readonly peso: number,
    readonly perfilDesejado?: VetorCompetencias,
  ) {
    if (!Number.isFinite(peso) || peso <= 0) {
      throw new Error(`Peso do papel ${papel} deve ser um número positivo (recebido: ${peso}).`);
    }
  }

  aceitarVisitante(visitante: VisitanteProjeto): void {
    visitante.visitarPapelRequerido(this);
  }
}
