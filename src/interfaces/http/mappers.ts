import type { DadosProjeto } from '../../domain/entities/projeto';
import { PapelRequerido } from '../../domain/entities/papel-requerido';
import { Papel } from '../../domain/enums/papel';
import { TipoCaptacao } from '../../domain/enums/tipo-captacao';
import type { NomeEstrategia } from '../../domain/enums/nome-estrategia';
import { Localizacao } from '../../domain/value-objects/localizacao';
import { IntervaloDatas } from '../../domain/value-objects/intervalo-datas';
import type { ResultadoRecomendacaoEquipe } from '../../application/services/servico-recomendacao';

export interface ProjetoDto {
  id: string;
  titulo?: string;
  genero: string;
  duracaoEstimadaMinutos: number;
  orcamentoTotal: number;
  dataEntrega: string;
  tipoCaptacao: string;
  localizacao: { cidade: string; uf: string; pais?: string };
  periodoFiltragens: { inicio: string; fim: string };
  papeis: Array<{ papel: string; peso: number }>;
  estrategiaPreferida?: string;
}

export function paraDadosProjeto(dto: ProjetoDto): DadosProjeto {
  return {
    id: dto.id,
    ...(dto.titulo !== undefined ? { titulo: dto.titulo } : {}),
    genero: dto.genero,
    duracaoEstimadaMinutos: dto.duracaoEstimadaMinutos,
    orcamentoTotal: dto.orcamentoTotal,
    dataEntrega: new Date(dto.dataEntrega),
    tipoCaptacao: dto.tipoCaptacao as TipoCaptacao,
    localizacaoFiltragens: new Localizacao(
      dto.localizacao.cidade,
      dto.localizacao.uf,
      dto.localizacao.pais ?? 'Brasil',
    ),
    periodoFiltragens: new IntervaloDatas(
      new Date(dto.periodoFiltragens.inicio),
      new Date(dto.periodoFiltragens.fim),
    ),
    papeisObrigatorios: dto.papeis.map(
      (papel) => new PapelRequerido(papel.papel as Papel, papel.peso),
    ),
    ...(dto.estrategiaPreferida !== undefined
      ? { estrategiaPreferida: dto.estrategiaPreferida as NomeEstrategia }
      : {}),
  };
}

export function serializarResultado(resultado: ResultadoRecomendacaoEquipe): Record<string, unknown> {
  const { projeto, equipe, recomendacoes, convites, violacoes, compatibilidade, relatorio } = resultado;
  return {
    projeto: {
      id: projeto.id,
      genero: projeto.genero,
      tipoCaptacao: projeto.tipoCaptacao,
      orcamentoTotal: projeto.orcamentoTotal,
      estrategiaResolvida: recomendacoes[0]?.estrategiaUsada ?? null,
    },
    equipe: {
      id: equipe.id,
      status: equipe.status,
      custoTotal: equipe.custoTotal(),
      observacoes: equipe.observacoes,
      membros: equipe.membros.map((membro) => ({
        papel: membro.papel,
        profissionalId: membro.profissional.id,
        profissional: membro.profissional.nome,
        custoAcordado: membro.custoAcordado,
        scoreRecomendacao: membro.scoreRecomendacao,
        status: membro.status,
      })),
    },
    recomendacoes: recomendacoes.map((recomendacao) => ({
      id: recomendacao.id,
      papel: recomendacao.papel,
      estrategiaUsada: recomendacao.estrategiaUsada,
      origemDados: recomendacao.origemDados,
      candidatos: recomendacao.candidatos,
    })),
    convites: convites.map((convite) => ({
      id: convite.id,
      profissionalId: convite.profissionalId,
      papel: convite.papel,
      status: convite.status,
    })),
    analise: {
      violacoes,
      compatibilidade,
      relatorio: relatorio.texto,
    },
  };
}
