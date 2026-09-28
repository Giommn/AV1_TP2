import type { Profissional } from '../../../domain/entities/profissional';
import type { NomeEstrategia } from '../../../domain/enums/nome-estrategia';
import type { CandidatoRanqueado } from '../candidato-ranqueado';
import type { ContextoRecomendacao } from '../contexto-recomendacao';

export interface EstrategiaRecomendacao {
  readonly nome: NomeEstrategia;
  ranquear(
    candidatos: readonly Profissional[],
    contexto: ContextoRecomendacao,
  ): CandidatoRanqueado[];
}
