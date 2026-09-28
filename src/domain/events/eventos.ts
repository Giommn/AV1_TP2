import type { Papel } from '../enums/papel';
import type { NomeEstrategia } from '../enums/nome-estrategia';
import type { OrigemDados } from '../entities/recomendacao';

export abstract class EventoDominio {
  abstract readonly tipo: string;
  readonly ocorridoEm = new Date();
}

export class RecomendacaoGeradaEvento extends EventoDominio {
  readonly tipo = 'RECOMENDACAO_GERADA';
  constructor(
    readonly projetoId: string,
    readonly papel: Papel,
    readonly estrategiaUsada: NomeEstrategia,
    readonly totalCandidatos: number,
    readonly origemDados: OrigemDados,
  ) {
    super();
  }
}

export class EquipeCompostaEvento extends EventoDominio {
  readonly tipo = 'EQUIPE_COMPOSTA';
  constructor(
    readonly equipeId: string,
    readonly projetoId: string,
    readonly totalMembros: number,
    readonly custoTotal: number,
  ) {
    super();
  }
}

export class ConviteCriadoEvento extends EventoDominio {
  readonly tipo = 'CONVITE_CRIADO';
  constructor(
    readonly conviteId: string,
    readonly equipeId: string,
    readonly projetoId: string,
    readonly profissionalId: string,
    readonly papel: Papel,
  ) {
    super();
  }
}

export class ConviteAceitoEvento extends EventoDominio {
  readonly tipo = 'CONVITE_ACEITO';
  constructor(
    readonly conviteId: string,
    readonly equipeId: string,
    readonly profissionalId: string,
    readonly papel: Papel,
  ) {
    super();
  }
}

export class ConviteRecusadoEvento extends EventoDominio {
  readonly tipo = 'CONVITE_RECUSADO';
  constructor(
    readonly conviteId: string,
    readonly equipeId: string,
    readonly profissionalId: string,
    readonly papel: Papel,
  ) {
    super();
  }
}

export class SubstituicaoRealizadaEvento extends EventoDominio {
  readonly tipo = 'SUBSTITUICAO_REALIZADA';
  constructor(
    readonly equipeId: string,
    readonly projetoId: string,
    readonly papel: Papel,
    readonly profissionalSaiuId: string,
    readonly profissionalEntrouId: string,
  ) {
    super();
  }
}

export interface MembroFormado {
  papel: Papel;
  profissionalId: string;
  custoAcordado: number;
}

export class EquipeFormadaEvento extends EventoDominio {
  readonly tipo = 'EQUIPE_FORMADA';
  constructor(
    readonly equipeId: string,
    readonly projetoId: string,
    readonly membros: readonly MembroFormado[],
    readonly custoTotal: number,
  ) {
    super();
  }
}
