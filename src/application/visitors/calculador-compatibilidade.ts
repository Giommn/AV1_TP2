import type { Projeto } from '../../domain/entities/projeto';
import type { PapelRequerido } from '../../domain/entities/papel-requerido';
import type { Equipe } from '../../domain/entities/equipe';
import type { MembroEquipe } from '../../domain/entities/membro-equipe';
import type { VisitanteProjeto } from '../../domain/visitors/visitante-projeto';
import type { VetorCompetencias } from '../../domain/value-objects/vetor-competencias';
import type { Papel } from '../../domain/enums/papel';
import { perfilPadrao } from '../../domain/perfis-padrao';
import { limitar01 } from '../recommendation/pontuacao';

export interface CompatibilidadeEquipe {
  compatibilidade: number;
  afinidadeMedia: number;
  aderenciaMedia: number;
  totalMembros: number;
}

export class CalculadorCompatibilidadeEquipe implements VisitanteProjeto {
  private readonly perfisPorPapel = new Map<Papel, VetorCompetencias>();
  private readonly membros: MembroEquipe[] = [];

  visitarProjeto(_projeto: Projeto): void {
  }

  visitarPapelRequerido(papelRequerido: PapelRequerido): void {
    this.perfisPorPapel.set(
      papelRequerido.papel,
      papelRequerido.perfilDesejado ?? perfilPadrao(papelRequerido.papel),
    );
  }

  visitarEquipe(_equipe: Equipe): void {
  }

  visitarMembroEquipe(membro: MembroEquipe): void {
    this.membros.push(membro);
  }

  concluir(): CompatibilidadeEquipe {
    const aderenciaMedia = this.aderenciaMedia();
    const afinidadeMedia = this.afinidadeMedia();
    return {
      compatibilidade: limitar01((aderenciaMedia + afinidadeMedia) / 2),
      afinidadeMedia,
      aderenciaMedia,
      totalMembros: this.membros.length,
    };
  }

  private aderenciaMedia(): number {
    if (this.membros.length === 0) {
      return 0;
    }
    const soma = this.membros.reduce((total, membro) => {
      const perfil = this.perfisPorPapel.get(membro.papel) ?? perfilPadrao(membro.papel);
      return total + membro.profissional.competencias.similaridadeCosseno(perfil);
    }, 0);
    return soma / this.membros.length;
  }

  private afinidadeMedia(): number {
    if (this.membros.length < 2) {
      return this.membros.length === 1 ? 0.5 : 0;
    }
    let soma = 0;
    let pares = 0;
    for (let i = 0; i < this.membros.length; i += 1) {
      for (let j = i + 1; j < this.membros.length; j += 1) {
        const a = this.membros[i]?.profissional;
        const b = this.membros[j]?.profissional;
        if (a !== undefined && b !== undefined) {
          const registros = [a.afinidadeCom(b.id), b.afinidadeCom(a.id)]
            .filter((valor): valor is number => valor !== undefined);
          soma += registros.length === 0
            ? 0.5
            : registros.reduce((acc, valor) => acc + valor, 0) / registros.length;
          pares += 1;
        }
      }
    }
    return pares === 0 ? 0.5 : soma / pares;
  }
}
