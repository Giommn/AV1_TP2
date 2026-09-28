import { Papel } from '../../src/domain/enums/papel';
import { TipoCaptacao } from '../../src/domain/enums/tipo-captacao';
import { PapelRequerido } from '../../src/domain/entities/papel-requerido';
import { Profissional, type DadosProfissional } from '../../src/domain/entities/profissional';
import { Projeto, type DadosProjeto } from '../../src/domain/entities/projeto';
import { VetorCompetencias } from '../../src/domain/value-objects/vetor-competencias';
import { Localizacao } from '../../src/domain/value-objects/localizacao';
import { IntervaloDatas } from '../../src/domain/value-objects/intervalo-datas';
import { perfilPadrao } from '../../src/domain/perfis-padrao';
import {
  PARAMETROS_PADRAO,
} from '../../src/application/recommendation/parametros-recomendacao';
import type { ContextoRecomendacao } from '../../src/application/recommendation/contexto-recomendacao';

let sequencia = 0;

export function profissionalFake(sobre: Partial<DadosProfissional> = {}): Profissional {
  sequencia += 1;
  return new Profissional({
    id: `pro-${sequencia}`,
    nome: `Profissional ${sequencia}`,
    papeis: [Papel.DIRETOR_FOTOGRAFIA],
    competencias: VetorCompetencias.criar({ fotografia: 0.9, iluminacao: 0.8, camera: 0.7 }),
    precoMinimo: 40_000,
    precoMaximo: 60_000,
    disponibilidade: [new IntervaloDatas(new Date('2026-01-01'), new Date('2026-12-31'))],
    localizacao: new Localizacao('São Paulo', 'SP', 'Brasil'),
    mediaAvaliacoes: 4.0,
    totalAvaliacoes: 20,
    ...sobre,
  });
}

export function projetoFake(sobre: Partial<DadosProjeto> = {}): Projeto {
  return new Projeto(dadosProjetoFake(sobre));
}

export function dadosProjetoFake(sobre: Partial<DadosProjeto> = {}): DadosProjeto {
  return {
    id: 'proj-1',
    titulo: 'Projeto de Teste',
    genero: 'drama',
    duracaoEstimadaMinutos: 90,
    orcamentoTotal: 1_000_000,
    dataEntrega: new Date('2027-03-01'),
    tipoCaptacao: TipoCaptacao.FICCAO,
    localizacaoFiltragens: new Localizacao('São Paulo', 'SP', 'Brasil'),
    periodoFiltragens: new IntervaloDatas(new Date('2026-10-01'), new Date('2026-11-15')),
    papeisObrigatorios: [new PapelRequerido(Papel.DIRETOR_FOTOGRAFIA, 3)],
    ...sobre,
  };
}

export function papelRequeridoFake(
  papel: Papel = Papel.DIRETOR_FOTOGRAFIA,
  peso = 3,
  perfilDesejado?: VetorCompetencias,
): PapelRequerido {
  return perfilDesejado !== undefined
    ? new PapelRequerido(papel, peso, perfilDesejado)
    : new PapelRequerido(papel, peso);
}

export function contextoFake(sobre: Partial<ContextoRecomendacao> = {}): ContextoRecomendacao {
  return {
    projeto: projetoFake(),
    perfilDesejado: perfilPadrao(Papel.DIRETOR_FOTOGRAFIA),
    tetoOrcamentalPapel: 600_000,
    parametros: PARAMETROS_PADRAO,
    equipeParcial: [],
    ...sobre,
  };
}
