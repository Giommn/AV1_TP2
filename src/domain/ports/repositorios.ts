import type { Papel } from '../enums/papel';
import type { Profissional } from '../entities/profissional';
import type { Projeto } from '../entities/projeto';
import type { Equipe } from '../entities/equipe';
import type { Convite } from '../entities/convite';

export interface RepositorioProfissionais {
  buscarPorPapel(papel: Papel): Promise<Profissional[]>;
  buscarPorId(id: string): Promise<Profissional | null>;
}

export interface RepositorioProjetos {
  salvar(projeto: Projeto): Promise<void>;
  buscarPorId(id: string): Promise<Projeto | null>;
}

export interface RepositorioEquipes {
  salvar(equipe: Equipe): Promise<void>;
  buscarPorId(id: string): Promise<Equipe | null>;
  atualizar(equipe: Equipe): Promise<void>;
}

export interface RepositorioConvites {
  salvar(convite: Convite): Promise<void>;
  buscarPorId(id: string): Promise<Convite | null>;
  atualizar(convite: Convite): Promise<void>;
}

export interface FonteFallbackProfissionais {
  candidatosPara(papel: Papel): Promise<Profissional[]>;
}
