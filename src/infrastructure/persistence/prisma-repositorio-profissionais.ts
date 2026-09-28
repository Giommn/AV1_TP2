import type { PrismaClient, Profissional as ProfissionalLinha } from '@prisma/client';
import { Profissional } from '../../domain/entities/profissional';
import type { Papel } from '../../domain/enums/papel';
import { Papel as PapelEnum } from '../../domain/enums/papel';
import { VetorCompetencias } from '../../domain/value-objects/vetor-competencias';
import { Localizacao } from '../../domain/value-objects/localizacao';
import { IntervaloDatas } from '../../domain/value-objects/intervalo-datas';
import type { RepositorioProfissionais } from '../../domain/ports/repositorios';

interface JanelaDisponibilidade {
  inicio: string;
  fim: string;
}

export class PrismaRepositorioProfissionais implements RepositorioProfissionais {
  constructor(private readonly prisma: PrismaClient) {}

  async buscarPorPapel(papel: Papel): Promise<Profissional[]> {
    const linhas = await this.prisma.profissional.findMany({
      where: { papeis: { has: papel } },
    });
    return linhas.map((linha) => this.paraDominio(linha));
  }

  async buscarPorId(id: string): Promise<Profissional | null> {
    const linha = await this.prisma.profissional.findUnique({ where: { id } });
    return linha === null ? null : this.paraDominio(linha);
  }

  private paraDominio(linha: ProfissionalLinha): Profissional {
    const janelas = (linha.disponibilidade as unknown as JanelaDisponibilidade[]).map(
      (janela) => new IntervaloDatas(new Date(janela.inicio), new Date(janela.fim)),
    );
    const afinidades = linha.afinidades as unknown as Record<string, number> | null;
    return new Profissional({
      id: linha.id,
      nome: linha.nome,
      papeis: linha.papeis as PapelEnum[],
      competencias: VetorCompetencias.criar(linha.competencias as unknown as Record<string, number>),
      precoMinimo: linha.precoMinimo,
      precoMaximo: linha.precoMaximo,
      disponibilidade: janelas,
      localizacao: new Localizacao(linha.cidade, linha.uf, linha.pais),
      mediaAvaliacoes: linha.mediaAvaliacoes,
      totalAvaliacoes: linha.totalAvaliacoes,
      ...(afinidades !== null ? { afinidades } : {}),
    });
  }
}
