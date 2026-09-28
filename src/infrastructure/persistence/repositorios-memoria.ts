import type { Papel } from '../../domain/enums/papel';
import type { Profissional } from '../../domain/entities/profissional';
import type { Projeto } from '../../domain/entities/projeto';
import type { Equipe } from '../../domain/entities/equipe';
import type { Convite } from '../../domain/entities/convite';
import type {
  FonteFallbackProfissionais,
  RepositorioConvites,
  RepositorioEquipes,
  RepositorioProfissionais,
  RepositorioProjetos,
} from '../../domain/ports/repositorios';

export class RepositorioProfissionaisMemoria implements RepositorioProfissionais {
  private indicePorPapel: Map<Papel, Profissional[]> | null = null;

  constructor(private readonly itens: Profissional[] = []) {}

  adicionarTodos(profissionais: readonly Profissional[]): void {
    this.itens.push(...profissionais);
    this.indicePorPapel = null; 
  }

  buscarPorPapel(papel: Papel): Promise<Profissional[]> {
    if (this.indicePorPapel === null) {
      this.indicePorPapel = new Map();
      for (const profissional of this.itens) {
        for (const papelDoProfissional of profissional.papeis) {
          const lista = this.indicePorPapel.get(papelDoProfissional) ?? [];
          lista.push(profissional);
          this.indicePorPapel.set(papelDoProfissional, lista);
        }
      }
    }
    return Promise.resolve(this.indicePorPapel.get(papel) ?? []);
  }

  buscarPorId(id: string): Promise<Profissional | null> {
    return Promise.resolve(this.itens.find((profissional) => profissional.id === id) ?? null);
  }

  get total(): number {
    return this.itens.length;
  }
}

export class RepositorioProjetosMemoria implements RepositorioProjetos {
  private readonly itens = new Map<string, Projeto>();

  salvar(projeto: Projeto): Promise<void> {
    this.itens.set(projeto.id, projeto);
    return Promise.resolve();
  }

  buscarPorId(id: string): Promise<Projeto | null> {
    return Promise.resolve(this.itens.get(id) ?? null);
  }
}

export class RepositorioEquipesMemoria implements RepositorioEquipes {
  private readonly itens = new Map<string, Equipe>();

  salvar(equipe: Equipe): Promise<void> {
    this.itens.set(equipe.id, equipe);
    return Promise.resolve();
  }

  buscarPorId(id: string): Promise<Equipe | null> {
    return Promise.resolve(this.itens.get(id) ?? null);
  }

  atualizar(equipe: Equipe): Promise<void> {
    this.itens.set(equipe.id, equipe);
    return Promise.resolve();
  }
}

export class RepositorioConvitesMemoria implements RepositorioConvites {
  private readonly itens = new Map<string, Convite>();

  salvar(convite: Convite): Promise<void> {
    this.itens.set(convite.id, convite);
    return Promise.resolve();
  }

  buscarPorId(id: string): Promise<Convite | null> {
    return Promise.resolve(this.itens.get(id) ?? null);
  }

  atualizar(convite: Convite): Promise<void> {
    this.itens.set(convite.id, convite);
    return Promise.resolve();
  }
}

export class FonteFallbackProfissionaisMemoria implements FonteFallbackProfissionais {
  constructor(private readonly catalogo: readonly Profissional[] = []) {}

  candidatosPara(papel: Papel): Promise<Profissional[]> {
    return Promise.resolve(this.catalogo.filter((profissional) => profissional.atuaComo(papel)));
  }
}
