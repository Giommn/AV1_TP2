import { randomUUID } from 'node:crypto';
import type { Projeto } from '../../domain/entities/projeto';
import type { PapelRequerido } from '../../domain/entities/papel-requerido';
import { Equipe } from '../../domain/entities/equipe';
import { MembroEquipe } from '../../domain/entities/membro-equipe';
import { Recomendacao, type OrigemDados } from '../../domain/entities/recomendacao';
import type { Profissional } from '../../domain/entities/profissional';
import type { Papel } from '../../domain/enums/papel';
import { EquipeCompostaEvento, RecomendacaoGeradaEvento } from '../../domain/events/eventos';
import type { BarramentoEventos } from '../../domain/ports/barramento-eventos';
import type {
  FonteFallbackProfissionais,
  RepositorioProfissionais,
} from '../../domain/ports/repositorios';
import { MotorRecomendacao } from '../recommendation/motor-recomendacao';
import {
  PARAMETROS_PADRAO,
  type ParametrosRecomendacao,
} from '../recommendation/parametros-recomendacao';
import type { CandidatoRanqueado } from '../recommendation/candidato-ranqueado';

export interface ResultadoComposicao {
  equipe: Equipe;
  recomendacoes: Recomendacao[];
}

const FONTE_FALLBACK_VAZIA: FonteFallbackProfissionais = {
  candidatosPara: () => Promise.resolve([]),
};

export abstract class OrquestradorComposicaoEquipe {
  constructor(
    protected readonly motor: MotorRecomendacao,
    protected readonly repositorioProfissionais: RepositorioProfissionais,
    protected readonly barramento: BarramentoEventos,
    protected readonly fonteFallback: FonteFallbackProfissionais = FONTE_FALLBACK_VAZIA,
    protected readonly parametros: ParametrosRecomendacao = PARAMETROS_PADRAO,
  ) {}

  async comporEquipe(projetoEntrada: Projeto): Promise<ResultadoComposicao> {
    const projeto = this.normalizarEntrada(projetoEntrada);

    const equipe = new Equipe({ id: randomUUID(), projetoId: projeto.id });
    const recomendacoes: Recomendacao[] = [];

    for (const papelRequerido of this.ordenarPorPeso(projeto.papeisObrigatorios)) {
      const { candidatos, origem } = await this.buscarCandidatos(papelRequerido, equipe);

      const ranqueadosBrutos = this.motor.recomendar(
        papelRequerido,
        candidatos,
        projeto,
        equipe.profissionaisConfirmados(),
      );

      const ranqueados = this.posProcessar(ranqueadosBrutos, projeto, papelRequerido);

      recomendacoes.push(this.registrarRecomendacao(projeto, papelRequerido, origem, ranqueados));

      const escolhido = ranqueados[0];
      if (escolhido !== undefined) {
        equipe.adicionarMembro(
          new MembroEquipe({
            papel: papelRequerido.papel,
            profissional: escolhido.profissional,
            custoAcordado: escolhido.profissional.precoMinimo,
            scoreRecomendacao: escolhido.score,
          }),
        );
      } else {
        equipe.registrarObservacao(`Sem candidatos elegíveis para o papel ${papelRequerido.papel}.`);
      }
    }

    this.validarRestricoesOrcamentarias(equipe, projeto);

    await this.publicarEventosFinais(projeto, equipe);

    return { equipe, recomendacoes };
  }

  protected abstract normalizarEntrada(projeto: Projeto): Projeto;

  protected abstract validarRestricoesOrcamentarias(equipe: Equipe, projeto: Projeto): void;

  protected abstract posProcessar(
    ranqueados: CandidatoRanqueado[],
    projeto: Projeto,
    papelRequerido: PapelRequerido,
  ): CandidatoRanqueado[];

  protected ordenarPorPeso(
    papeis: readonly PapelRequerido[],
  ): readonly PapelRequerido[] {
    return [...papeis].sort((a, b) => b.peso - a.peso);
  }

  protected async buscarCandidatos(
    papelRequerido: PapelRequerido,
    equipe: Equipe,
  ): Promise<{ candidatos: Profissional[]; origem: OrigemDados }> {
    try {
      const candidatos = await this.repositorioProfissionais.buscarPorPapel(papelRequerido.papel);
      return { candidatos, origem: 'REPOSITORIO' };
    } catch {
      equipe.registrarObservacao(
        `Papel ${papelRequerido.papel}: repositório indisponível — usando catálogo de fallback (recomendação parcial).`,
      );
      const candidatos = await this.fonteFallback.candidatosPara(papelRequerido.papel);
      return { candidatos, origem: 'FALLBACK' };
    }
  }

  private registrarRecomendacao(
    projeto: Projeto,
    papelRequerido: PapelRequerido,
    origem: OrigemDados,
    ranqueados: readonly CandidatoRanqueado[],
  ): Recomendacao {
    const recomendacao = new Recomendacao({
      id: randomUUID(),
      projetoId: projeto.id,
      papel: papelRequerido.papel,
      estrategiaUsada: this.motor.nomeEstrategiaAtual,
      origemDados: origem,
      candidatos: ranqueados.map((candidato) => ({
        profissionalId: candidato.profissional.id,
        nome: candidato.profissional.nome,
        score: candidato.score,
        detalhamento: { ...candidato.detalhamento },
      })),
    });
    this.barramento.publicar(
      new RecomendacaoGeradaEvento(
        projeto.id,
        papelRequerido.papel,
        this.motor.nomeEstrategiaAtual,
        ranqueados.length,
        origem,
      ),
    );
    return recomendacao;
  }

  protected publicarEventosFinais(projeto: Projeto, equipe: Equipe): Promise<void> {
    this.barramento.publicar(
      new EquipeCompostaEvento(equipe.id, projeto.id, equipe.membros.length, equipe.custoTotal()),
    );
    return Promise.resolve();
  }
}
