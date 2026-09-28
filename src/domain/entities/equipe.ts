import type { Papel } from '../enums/papel';
import { StatusEquipe } from '../enums/status-equipe';
import { StatusConvite } from '../enums/status-convite';
import type { MembroEquipe } from './membro-equipe';
import type { Profissional } from './profissional';
import type { PapelRequerido } from './papel-requerido';
import type { VisitanteProjeto } from '../visitors/visitante-projeto';

export interface DadosEquipe {
  id: string;
  projetoId: string;
}

export class Equipe {
  private readonly membrosLista: MembroEquipe[] = [];
  private readonly observacoesLista: string[] = [];
  private statusAtual = StatusEquipe.EM_FORMACAO;

  constructor(private readonly dados: DadosEquipe) {}

  get id(): string {
    return this.dados.id;
  }

  get projetoId(): string {
    return this.dados.projetoId;
  }

  get membros(): readonly MembroEquipe[] {
    return [...this.membrosLista];
  }

  get observacoes(): readonly string[] {
    return [...this.observacoesLista];
  }

  get status(): StatusEquipe {
    return this.statusAtual;
  }

  adicionarMembro(membro: MembroEquipe): void {
    if (this.membroDo(membro.papel) !== undefined) {
      throw new Error(`Equipe ${this.dados.id}: papel ${membro.papel} já está ocupado.`);
    }
    this.membrosLista.push(membro);
  }

  removerMembro(papel: Papel): MembroEquipe | undefined {
    const indice = this.membrosLista.findIndex((membro) => membro.papel === papel);
    if (indice < 0) {
      return undefined;
    }
    const [removido] = this.membrosLista.splice(indice, 1);
    return removido;
  }

  membroDo(papel: Papel): MembroEquipe | undefined {
    return this.membrosLista.find((membro) => membro.papel === papel);
  }

  profissionaisConfirmados(): Profissional[] {
    return this.membrosLista
      .filter((membro) => membro.status === StatusConvite.ACEITO)
      .map((membro) => membro.profissional);
  }

  custoTotal(): number {
    return this.membrosLista.reduce((total, membro) => total + membro.custoAcordado, 0);
  }

  registrarObservacao(texto: string): void {
    this.observacoesLista.push(texto);
  }

  atualizarStatusPorCobertura(papeisObrigatorios: readonly PapelRequerido[]): void {
    const aceitos = papeisObrigatorios.filter(
      (requerido) => this.membroDo(requerido.papel)?.status === StatusConvite.ACEITO,
    ).length;
    if (aceitos === papeisObrigatorios.length && papeisObrigatorios.length > 0) {
      this.statusAtual = StatusEquipe.FORMADA;
    } else if (aceitos > 0) {
      this.statusAtual = StatusEquipe.FORMADA_PARCIAL;
    } else {
      this.statusAtual = StatusEquipe.EM_FORMACAO;
    }
  }

  aceitarVisitante(visitante: VisitanteProjeto): void {
    visitante.visitarEquipe(this);
    for (const membro of this.membrosLista) {
      membro.aceitarVisitante(visitante);
    }
  }
}
