import type { Profissional } from '../domain/entities/profissional';
import type {
  FonteFallbackProfissionais,
  RepositorioProfissionais,
} from '../domain/ports/repositorios';
import { BarramentoEventosLocal } from '../infrastructure/events/barramento-eventos-local';
import { ObservadorEmail } from '../infrastructure/observers/observador-email';
import { ObservadorMensageria } from '../infrastructure/observers/observador-mensageria';
import { ObservadorAuditoria } from '../infrastructure/observers/observador-auditoria';
import { ObservadorAtualizacaoEquipe } from '../infrastructure/observers/observador-atualizacao-equipe';
import {
  FonteFallbackProfissionaisMemoria,
  RepositorioConvitesMemoria,
  RepositorioEquipesMemoria,
  RepositorioProfissionaisMemoria,
  RepositorioProjetosMemoria,
} from '../infrastructure/persistence/repositorios-memoria';
import { gerarProfissionais } from '../infrastructure/persistence/gerador-profissionais';
import { FabricaEstrategias } from '../application/recommendation/strategies/fabrica-estrategias';
import { FabricaOrquestrador } from '../application/orchestration/fabrica-orquestrador';
import { ServicoRecomendacao } from '../application/services/servico-recomendacao';
import { ServicoConvite } from '../application/services/servico-convite';
import { construirServidor, type DependenciasServidor } from '../interfaces/http/servidor';
import type { FastifyInstance } from 'fastify';
import {
  PARAMETROS_PADRAO,
  type ParametrosRecomendacao,
} from '../application/recommendation/parametros-recomendacao';

export interface OpcoesContainer {
  profissionais?: Profissional[];
  repositorioProfissionais?: RepositorioProfissionais;
  fonteFallback?: FonteFallbackProfissionais;
  parametros?: ParametrosRecomendacao;
}

export function montarContainer(opcoes: OpcoesContainer = {}) {
  const parametros = opcoes.parametros ?? PARAMETROS_PADRAO;

  const barramento = new BarramentoEventosLocal();
  const repositorioEquipes = new RepositorioEquipesMemoria();
  const repositorioProjetos = new RepositorioProjetosMemoria();
  const repositorioConvites = new RepositorioConvitesMemoria();

  const observadorEmail = new ObservadorEmail();
  const observadorMensageria = new ObservadorMensageria();
  const observadorAuditoria = new ObservadorAuditoria();
  const observadorAtualizacaoEquipe = new ObservadorAtualizacaoEquipe(
    repositorioEquipes,
    repositorioProjetos,
    barramento,
  );
  barramento.assinar(observadorEmail);
  barramento.assinar(observadorMensageria);
  barramento.assinar(observadorAuditoria);
  barramento.assinar(observadorAtualizacaoEquipe);

  const repositorioProfissionais =
    opcoes.repositorioProfissionais
    ?? new RepositorioProfissionaisMemoria(opcoes.profissionais ?? gerarProfissionais(200));
  const fonteFallback =
    opcoes.fonteFallback ?? new FonteFallbackProfissionaisMemoria(gerarProfissionais(24, 99));

  const fabricaEstrategias = new FabricaEstrategias(parametros);
  const fabricaOrquestrador = new FabricaOrquestrador({
    repositorioProfissionais,
    barramento,
    fonteFallback,
    fabricaEstrategias,
    parametros,
  });

  const servicoRecomendacao = new ServicoRecomendacao({
    fabricaOrquestrador,
    fabricaEstrategias,
    repositorioProjetos,
    repositorioEquipes,
    repositorioConvites,
    repositorioProfissionais,
    fonteFallback,
    barramento,
    parametros,
  });
  const servicoConvite = new ServicoConvite(repositorioConvites, barramento);

  const dependenciasServidor: DependenciasServidor = { servicoRecomendacao, servicoConvite };

  return {
    barramento,
    observadorEmail,
    observadorMensageria,
    observadorAuditoria,
    observadorAtualizacaoEquipe,
    repositorioProfissionais,
    repositorioProjetos,
    repositorioEquipes,
    repositorioConvites,
    fonteFallback,
    fabricaEstrategias,
    fabricaOrquestrador,
    servicoRecomendacao,
    servicoConvite,
    construirApp: (): FastifyInstance => construirServidor(dependenciasServidor),
  };
}

export type Container = ReturnType<typeof montarContainer>;
