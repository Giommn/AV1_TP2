import { randomUUID } from 'node:crypto';
import { Projeto, type DadosProjeto } from '../../domain/entities/projeto';
import { Convite } from '../../domain/entities/convite';
import { MembroEquipe } from '../../domain/entities/membro-equipe';
import type { Equipe } from '../../domain/entities/equipe';
import { Recomendacao } from '../../domain/entities/recomendacao';
import type { Papel } from '../../domain/enums/papel';
import {
  ConviteCriadoEvento,
  SubstituicaoRealizadaEvento,
} from '../../domain/events/eventos';
import type { BarramentoEventos } from '../../domain/ports/barramento-eventos';
import type {
  FonteFallbackProfissionais,
  RepositorioConvites,
  RepositorioEquipes,
  RepositorioProfissionais,
  RepositorioProjetos,
} from '../../domain/ports/repositorios';
import { ErroNaoEncontrado, ErroNegocio } from '../erros';
import { MotorRecomendacao } from '../recommendation/motor-recomendacao';
import type { ParametrosRecomendacao } from '../recommendation/parametros-recomendacao';
import type { FabricaEstrategias } from '../recommendation/strategies/fabrica-estrategias';
import type { FabricaOrquestrador } from '../orchestration/fabrica-orquestrador';
import { ValidadorConsistenciaProjeto } from '../visitors/validador-consistencia';
import {
  CalculadorCompatibilidadeEquipe,
  type CompatibilidadeEquipe,
} from '../visitors/calculador-compatibilidade';
import {
  GeradorRelatorioProdutor,
  type RelatorioProdutor,
} from '../visitors/gerador-relatorio';

export interface DependenciasServicoRecomendacao {
  fabricaOrquestrador: FabricaOrquestrador;
  fabricaEstrategias: FabricaEstrategias;
  repositorioProjetos: RepositorioProjetos;
  repositorioEquipes: RepositorioEquipes;
  repositorioConvites: RepositorioConvites;
  repositorioProfissionais: RepositorioProfissionais;
  fonteFallback: FonteFallbackProfissionais;
  barramento: BarramentoEventos;
  parametros: ParametrosRecomendacao;
}

export interface ResultadoRecomendacaoEquipe {
  projeto: Projeto;
  equipe: Equipe;
  recomendacoes: Recomendacao[];
  convites: Convite[];
  violacoes: string[];
  compatibilidade: CompatibilidadeEquipe;
  relatorio: RelatorioProdutor;
}

export interface ResultadoSubstituicao {
  equipe: Equipe;
  novoConvite: Convite;
  recomendacao: Recomendacao;
}

export class ServicoRecomendacao {
  constructor(private readonly deps: DependenciasServicoRecomendacao) {}

  async recomendarEquipe(dados: DadosProjeto): Promise<ResultadoRecomendacaoEquipe> {
    const projeto = new Projeto(dados);
    await this.deps.repositorioProjetos.salvar(projeto);
    return this.executarRecomendacao(projeto);
  }

  async reavaliar(dados: DadosProjeto): Promise<ResultadoRecomendacaoEquipe> {
    const projeto = new Projeto(dados);
    await this.deps.repositorioProjetos.salvar(projeto);
    return this.executarRecomendacao(projeto);
  }

  async substituirMembro(equipeId: string, papel: Papel): Promise<ResultadoSubstituicao> {
    const equipe = await this.deps.repositorioEquipes.buscarPorId(equipeId);
    if (equipe === null) {
      throw new ErroNaoEncontrado(`Equipe ${equipeId} não encontrada.`);
    }
    const projeto = await this.deps.repositorioProjetos.buscarPorId(equipe.projetoId);
    if (projeto === null) {
      throw new ErroNaoEncontrado(`Projeto ${equipe.projetoId} não encontrado.`);
    }
    const papelRequerido = projeto.papeisObrigatorios.find(
      (requerido) => requerido.papel === papel,
    );
    if (papelRequerido === undefined) {
      throw new ErroNegocio(`O projeto ${projeto.id} não requer o papel ${papel}.`);
    }
    const removido = equipe.removerMembro(papel);
    if (removido === undefined) {
      throw new ErroNegocio(`A equipe ${equipe.id} não possui membro no papel ${papel}.`);
    }

    const motor = new MotorRecomendacao(
      this.deps.fabricaEstrategias.resolverParaProjeto(projeto),
      this.deps.parametros,
    );
    let candidatos;
    try {
      candidatos = await this.deps.repositorioProfissionais.buscarPorPapel(papel);
    } catch {
      candidatos = await this.deps.fonteFallback.candidatosPara(papel);
    }
    const ocupados = new Set([
      removido.profissional.id,
      ...equipe.membros.map((membro) => membro.profissional.id),
    ]);
    const ranqueados = motor.recomendar(
      papelRequerido,
      candidatos.filter((candidato) => !ocupados.has(candidato.id)),
      projeto,
      equipe.profissionaisConfirmados(),
    );
    const novo = ranqueados[0];
    if (novo === undefined) {
      throw new ErroNegocio(`Não há substituto elegível para o papel ${papel}.`);
    }

    equipe.adicionarMembro(
      new MembroEquipe({
        papel,
        profissional: novo.profissional,
        custoAcordado: novo.profissional.precoMinimo,
        scoreRecomendacao: novo.score,
      }),
    );
    equipe.registrarObservacao(
      `Substituição no papel ${papel}: saiu ${removido.profissional.nome}, entrou ${novo.profissional.nome}.`,
    );
    await this.deps.repositorioEquipes.atualizar(equipe);

    const recomendacao = new Recomendacao({
      id: randomUUID(),
      projetoId: projeto.id,
      papel,
      estrategiaUsada: motor.nomeEstrategiaAtual,
      origemDados: 'REPOSITORIO',
      candidatos: ranqueados.map((candidato) => ({
        profissionalId: candidato.profissional.id,
        nome: candidato.profissional.nome,
        score: candidato.score,
        detalhamento: { ...candidato.detalhamento },
      })),
    });

    const novoConvite = new Convite({
      id: randomUUID(),
      equipeId: equipe.id,
      projetoId: projeto.id,
      profissionalId: novo.profissional.id,
      papel,
    });
    await this.deps.repositorioConvites.salvar(novoConvite);

    this.deps.barramento.publicar(
      new SubstituicaoRealizadaEvento(
        equipe.id,
        projeto.id,
        papel,
        removido.profissional.id,
        novo.profissional.id,
      ),
    );
    this.deps.barramento.publicar(
      new ConviteCriadoEvento(
        novoConvite.id,
        equipe.id,
        projeto.id,
        novo.profissional.id,
        papel,
      ),
    );

    return { equipe, novoConvite, recomendacao };
  }

  private async executarRecomendacao(projeto: Projeto): Promise<ResultadoRecomendacaoEquipe> {
    const orquestrador = this.deps.fabricaOrquestrador.resolverParaProjeto(projeto);
    const { equipe, recomendacoes } = await orquestrador.comporEquipe(projeto);
    await this.deps.repositorioEquipes.salvar(equipe);

    const convites: Convite[] = [];
    for (const membro of equipe.membros) {
      const convite = new Convite({
        id: randomUUID(),
        equipeId: equipe.id,
        projetoId: projeto.id,
        profissionalId: membro.profissional.id,
        papel: membro.papel,
      });
      await this.deps.repositorioConvites.salvar(convite);
      this.deps.barramento.publicar(
        new ConviteCriadoEvento(
          convite.id,
          equipe.id,
          projeto.id,
          membro.profissional.id,
          membro.papel,
        ),
      );
      convites.push(convite);
    }

    const validador = new ValidadorConsistenciaProjeto(this.deps.parametros);
    projeto.aceitarVisitante(validador);
    equipe.aceitarVisitante(validador);

    const calculador = new CalculadorCompatibilidadeEquipe();
    projeto.aceitarVisitante(calculador);
    equipe.aceitarVisitante(calculador);

    const gerador = new GeradorRelatorioProdutor();
    projeto.aceitarVisitante(gerador);
    equipe.aceitarVisitante(gerador);

    return {
      projeto,
      equipe,
      recomendacoes,
      convites,
      violacoes: validador.concluir(),
      compatibilidade: calculador.concluir(),
      relatorio: gerador.relatorio(),
    };
  }
}
