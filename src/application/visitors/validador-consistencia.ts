import type { Projeto } from '../../domain/entities/projeto';
import type { PapelRequerido } from '../../domain/entities/papel-requerido';
import type { Equipe } from '../../domain/entities/equipe';
import type { MembroEquipe } from '../../domain/entities/membro-equipe';
import type { VisitanteProjeto } from '../../domain/visitors/visitante-projeto';
import {
  PARAMETROS_PADRAO,
  type ParametrosRecomendacao,
} from '../recommendation/parametros-recomendacao';

export class ValidadorConsistenciaProjeto implements VisitanteProjeto {
  private projeto: Projeto | null = null;
  private equipe: Equipe | null = null;
  private readonly papeisRequeridos: PapelRequerido[] = [];
  private readonly membros: MembroEquipe[] = [];

  constructor(private readonly parametros: ParametrosRecomendacao = PARAMETROS_PADRAO) {}

  visitarProjeto(projeto: Projeto): void {
    this.projeto = projeto;
  }

  visitarPapelRequerido(papelRequerido: PapelRequerido): void {
    this.papeisRequeridos.push(papelRequerido);
  }

  visitarEquipe(equipe: Equipe): void {
    this.equipe = equipe;
  }

  visitarMembroEquipe(membro: MembroEquipe): void {
    this.membros.push(membro);
  }

  concluir(): string[] {
    const violacoes: string[] = [];
    const projeto = this.projeto;
    const equipe = this.equipe;
    if (projeto === null) {
      violacoes.push('Nenhum projeto foi visitado.');
      return violacoes;
    }

    if (projeto.dataEntrega.getTime() < projeto.periodoFiltragens.fim.getTime()) {
      violacoes.push(
        `Cronograma inconsistente: entrega (${projeto.dataEntrega.toISOString().slice(0, 10)}) antes do fim das filmagens.`,
      );
    }

    if (equipe !== null) {
      for (const requerido of this.papeisRequeridos) {
        if (equipe.membroDo(requerido.papel) === undefined) {
          violacoes.push(`Papel ${requerido.papel} sem profissional designado.`);
        }
      }
      const tetoEquipe = projeto.orcamentoTotal * this.parametros.fracaoOrcamentoEquipe;
      if (equipe.custoTotal() > tetoEquipe) {
        violacoes.push(
          `Orçamento insuficiente: custo da equipe (R$ ${equipe.custoTotal()}) excede o teto de R$ ${tetoEquipe}.`,
        );
      }
    }

    return violacoes;
  }
}
