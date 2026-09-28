import type { Projeto } from '../../domain/entities/projeto';
import type { Profissional } from '../../domain/entities/profissional';
import type { VetorCompetencias } from '../../domain/value-objects/vetor-competencias';
import type { ParametrosRecomendacao } from './parametros-recomendacao';

export interface ContextoRecomendacao {
  projeto: Projeto;
  perfilDesejado: VetorCompetencias;
  tetoOrcamentalPapel: number;
  parametros: ParametrosRecomendacao;
  equipeParcial: readonly Profissional[];
}
