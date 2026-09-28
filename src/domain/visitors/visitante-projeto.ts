import type { Projeto } from '../entities/projeto';
import type { PapelRequerido } from '../entities/papel-requerido';
import type { Equipe } from '../entities/equipe';
import type { MembroEquipe } from '../entities/membro-equipe';

export interface VisitanteProjeto {
  visitarProjeto(projeto: Projeto): void;
  visitarPapelRequerido(papelRequerido: PapelRequerido): void;
  visitarEquipe(equipe: Equipe): void;
  visitarMembroEquipe(membro: MembroEquipe): void;
}
