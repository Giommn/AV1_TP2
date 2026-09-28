import type { Profissional } from '../../domain/entities/profissional';

export interface CandidatoRanqueado {
  readonly profissional: Profissional;
  readonly score: number;
  readonly detalhamento: Record<string, number>;
}
