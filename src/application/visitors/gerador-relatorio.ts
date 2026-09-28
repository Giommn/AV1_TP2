import type { Projeto } from '../../domain/entities/projeto';
import type { PapelRequerido } from '../../domain/entities/papel-requerido';
import type { Equipe } from '../../domain/entities/equipe';
import type { MembroEquipe } from '../../domain/entities/membro-equipe';
import type { VisitanteProjeto } from '../../domain/visitors/visitante-projeto';

export interface RelatorioProdutor {
  texto: string;
  projetoId: string;
  statusEquipe: string;
  custoTotal: number;
  membros: Array<{
    papel: string;
    profissional: string;
    custo: number;
    score: number;
    status: string;
  }>;
  papeisRequeridos: Array<{ papel: string; peso: number }>;
  observacoes: string[];
}

export class GeradorRelatorioProdutor implements VisitanteProjeto {
  private projeto: Projeto | null = null;
  private equipe: Equipe | null = null;
  private readonly papeisRequeridos: PapelRequerido[] = [];
  private readonly membros: MembroEquipe[] = [];

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

  relatorio(): RelatorioProdutor {
    const projeto = this.projeto;
    const equipe = this.equipe;
    if (projeto === null) {
      throw new Error('GeradorRelatorioProdutor: visite um projeto antes de gerar o relatório.');
    }

    const linhas: string[] = [];
    linhas.push(`# Projeto ${projeto.id}`);
    linhas.push(`Gênero: ${projeto.genero} | Captação: ${projeto.tipoCaptacao}`);
    linhas.push(`Orçamento total: R$ ${projeto.orcamentoTotal.toFixed(2)}`);
    linhas.push(`Entrega: ${projeto.dataEntrega.toISOString().slice(0, 10)}`);
    linhas.push('');
    linhas.push('## Papéis obrigatórios');
    for (const requerido of this.papeisRequeridos) {
      linhas.push(`- ${requerido.papel} (peso ${requerido.peso})`);
    }

    const observacoes = equipe !== null ? [...equipe.observacoes] : [];
    const membrosRelatorio = this.membros.map((membro) => ({
      papel: membro.papel,
      profissional: membro.profissional.nome,
      custo: membro.custoAcordado,
      score: membro.scoreRecomendacao,
      status: membro.status,
    }));

    if (equipe !== null) {
      linhas.push('');
      linhas.push(`## Equipe ${equipe.id} — ${equipe.status}`);
      for (const membro of this.membros) {
        linhas.push(
          `- ${membro.papel}: ${membro.profissional.nome} `
            + `(R$ ${membro.custoAcordado.toFixed(2)}, score ${membro.scoreRecomendacao.toFixed(3)}, ${membro.status})`,
        );
      }
      linhas.push(`Custo total da equipe: R$ ${equipe.custoTotal().toFixed(2)}`);
      for (const observacao of equipe.observacoes) {
        linhas.push(`> ${observacao}`);
      }
    }

    return {
      texto: linhas.join('\n'),
      projetoId: projeto.id,
      statusEquipe: equipe?.status ?? 'SEM_EQUIPE',
      custoTotal: equipe?.custoTotal() ?? 0,
      membros: membrosRelatorio,
      papeisRequeridos: this.papeisRequeridos.map((requerido) => ({
        papel: requerido.papel,
        peso: requerido.peso,
      })),
      observacoes,
    };
  }
}
