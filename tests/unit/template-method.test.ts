import { describe, expect, it } from 'vitest';
import {
  OrquestradorComposicaoEquipe,
  type ResultadoComposicao,
} from '../../src/application/orchestration/orquestrador-composicao-equipe';
import { OrquestradorEquipeDocumentario } from '../../src/application/orchestration/orquestradores/documentario';
import { OrquestradorEquipeFiccao } from '../../src/application/orchestration/orquestradores/ficcao';
import { OrquestradorEquipeAnimacao } from '../../src/application/orchestration/orquestradores/animacao';
import { FabricaOrquestrador } from '../../src/application/orchestration/fabrica-orquestrador';
import { FabricaEstrategias } from '../../src/application/recommendation/strategies/fabrica-estrategias';
import { MotorRecomendacao } from '../../src/application/recommendation/motor-recomendacao';
import { EstrategiaSimilaridadeCosseno } from '../../src/application/recommendation/strategies/similaridade-cosseno';
import { ErroNegocio } from '../../src/application/erros';
import { BarramentoEventosLocal } from '../../src/infrastructure/events/barramento-eventos-local';
import {
  FonteFallbackProfissionaisMemoria,
  RepositorioProfissionaisMemoria,
} from '../../src/infrastructure/persistence/repositorios-memoria';
import type { RepositorioProfissionais } from '../../src/domain/ports/repositorios';
import { TipoCaptacao } from '../../src/domain/enums/tipo-captacao';
import { Papel } from '../../src/domain/enums/papel';
import { PapelRequerido } from '../../src/domain/entities/papel-requerido';
import { Equipe } from '../../src/domain/entities/equipe';
import type { Projeto } from '../../src/domain/entities/projeto';
import { VetorCompetencias } from '../../src/domain/value-objects/vetor-competencias';
import { Localizacao } from '../../src/domain/value-objects/localizacao';
import { IntervaloDatas } from '../../src/domain/value-objects/intervalo-datas';
import { PARAMETROS_PADRAO } from '../../src/application/recommendation/parametros-recomendacao';
import type { CandidatoRanqueado } from '../../src/application/recommendation/candidato-ranqueado';
import type { OrigemDados } from '../../src/domain/entities/recomendacao';
import type { Profissional } from '../../src/domain/entities/profissional';
import { profissionalFake, projetoFake } from '../helpers/fabricas';

function motorPadrao(): MotorRecomendacao {
  return new MotorRecomendacao(new EstrategiaSimilaridadeCosseno());
}

class OrquestradorEspiao extends OrquestradorComposicaoEquipe {
  readonly chamadas: string[] = [];

  protected normalizarEntrada(projeto: Projeto): Projeto {
    this.chamadas.push('normalizarEntrada');
    return projeto;
  }

  protected override async buscarCandidatos(
    papel: PapelRequerido,
    equipe: Equipe,
  ): Promise<{ candidatos: Profissional[]; origem: OrigemDados }> {
    this.chamadas.push(`buscarCandidatos:${papel.papel}`);
    return super.buscarCandidatos(papel, equipe);
  }

  protected posProcessar(
    ranqueados: CandidatoRanqueado[],
    _projeto: Projeto,
    papel: PapelRequerido,
  ): CandidatoRanqueado[] {
    this.chamadas.push(`posProcessar:${papel.papel}`);
    return ranqueados;
  }

  protected validarRestricoesOrcamentarias(): void {
    this.chamadas.push('validarRestricoes');
  }

  protected override async publicarEventosFinais(projeto: Projeto, equipe: Equipe): Promise<void> {
    this.chamadas.push('publicarEventos');
    return super.publicarEventosFinais(projeto, equipe);
  }
}

describe('Template Method — esqueleto invariável', () => {
  it('executa os passos sempre na mesma ordem, com papéis ordenados por peso', async () => {
    const repo = new RepositorioProfissionaisMemoria([
      profissionalFake({ papeis: [Papel.DIRETOR_FOTOGRAFIA] }),
      profissionalFake({ papeis: [Papel.EDITOR], competencias: VetorCompetencias.criar({ edicao: 1 }) }),
    ]);
    const espiao = new OrquestradorEspiao(motorPadrao(), repo, new BarramentoEventosLocal());
    const projeto = projetoFake({
      papeisObrigatorios: [
        new PapelRequerido(Papel.DIRETOR_FOTOGRAFIA, 3),
        new PapelRequerido(Papel.EDITOR, 1),
      ],
    });

    const resultado: ResultadoComposicao = await espiao.comporEquipe(projeto);

    expect(espiao.chamadas).toEqual([
      'normalizarEntrada',
      'buscarCandidatos:DIRETOR_FOTOGRAFIA', 
      'posProcessar:DIRETOR_FOTOGRAFIA',
      'buscarCandidatos:EDITOR', 
      'posProcessar:EDITOR',
      'validarRestricoes',
      'publicarEventos',
    ]);
    expect(resultado.equipe.membros).toHaveLength(2);
    expect(resultado.recomendacoes).toHaveLength(2);
  });
});

describe('Template Method — variações das subclasses (ficção × documentário × animação)', () => {
  const janelaCurta = [new IntervaloDatas(new Date('2026-01-01'), new Date('2026-11-30'))];

  it('documentário estende o período de filmagens: candidato com janela curta é excluído', async () => {
    const janelaLonga = [new IntervaloDatas(new Date('2026-01-01'), new Date('2027-06-30'))];
    const repo = new RepositorioProfissionaisMemoria([
      profissionalFake({ nome: 'JanelaCurta', disponibilidade: janelaCurta }),
      profissionalFake({ nome: 'JanelaLonga', disponibilidade: janelaLonga }),
    ]);

    const ficcao = new OrquestradorEquipeFiccao(motorPadrao(), repo, new BarramentoEventosLocal());
    const documentario = new OrquestradorEquipeDocumentario(
      motorPadrao(), repo, new BarramentoEventosLocal(),
    );

    const resultadoFiccao = await ficcao.comporEquipe(projetoFake());
    const resultadoDocumentario = await documentario.comporEquipe(projetoFake());

    expect(
      resultadoFiccao.recomendacoes.flatMap((r) => r.candidatos.map((c) => c.nome)),
    ).toContain('JanelaCurta');
    expect(
      resultadoDocumentario.recomendacoes.flatMap((r) => r.candidatos.map((c) => c.nome)),
    ).not.toContain('JanelaCurta');
    expect(
      resultadoDocumentario.recomendacoes.flatMap((r) => r.candidatos.map((c) => c.nome)),
    ).toContain('JanelaLonga');
  });

  it('animação: localização deixa de influenciar (produção remota)', async () => {
    const localSemFotografia = profissionalFake({
      nome: 'Local',
      localizacao: new Localizacao('São Paulo', 'SP', 'Brasil'),
      competencias: VetorCompetencias.criar({ som: 1, captacao_audio: 0.9 }), 
    });
    const remotoComFotografia = profissionalFake({
      nome: 'Remoto',
      localizacao: new Localizacao('Buenos Aires', 'BA', 'Argentina'),
      competencias: VetorCompetencias.criar({ fotografia: 0.2, som: 0.9 }), 
    });
    const repo = new RepositorioProfissionaisMemoria([localSemFotografia, remotoComFotografia]);

    const projeto = projetoFake({ tipoCaptacao: TipoCaptacao.ANIMACAO });
    const ficcao = new OrquestradorEquipeFiccao(motorPadrao(), repo, new BarramentoEventosLocal());
    const animacao = new OrquestradorEquipeAnimacao(motorPadrao(), repo, new BarramentoEventosLocal());

    const escolhaFiccao = (await ficcao.comporEquipe(projeto)).equipe.membros[0]?.profissional.nome;
    const escolhaAnimacao = (await animacao.comporEquipe(projeto)).equipe.membros[0]?.profissional.nome;

    expect(escolhaFiccao).toBe('Local'); 
    expect(escolhaAnimacao).toBe('Remoto'); 
  });

  it('ficção aplica bônus de narrativa no pós-processamento', async () => {
    const semNarrativa = profissionalFake({
      nome: 'SemNarrativa',
      precoMinimo: 100_000,
      precoMaximo: 120_000,
      competencias: VetorCompetencias.criar({ fotografia: 1, iluminacao: 1, camera: 1, cor: 1 }),
    });
    const comNarrativa = profissionalFake({
      nome: 'ComNarrativa',
      precoMinimo: 200_000,
      precoMaximo: 250_000,
      competencias: VetorCompetencias.criar({ fotografia: 1, iluminacao: 1, camera: 1, cor: 1, narrativa: 0.8 }),
    });
    const repo = new RepositorioProfissionaisMemoria([semNarrativa, comNarrativa]);

    const documentario = new OrquestradorEquipeDocumentario(
      motorPadrao(), repo, new BarramentoEventosLocal(), new FonteFallbackProfissionaisMemoria(),
      { ...PARAMETROS_PADRAO, fracaoOrcamentoEquipe: 1 },
    );
    const ficcao = new OrquestradorEquipeFiccao(
      motorPadrao(), repo, new BarramentoEventosLocal(), new FonteFallbackProfissionaisMemoria(),
      { ...PARAMETROS_PADRAO, fracaoOrcamentoEquipe: 1 },
    );

    const escolhaDocumentario = (await documentario.comporEquipe(projetoFake())).equipe.membros[0]?.profissional.nome;
    const escolhaFiccao = (await ficcao.comporEquipe(projetoFake())).equipe.membros[0]?.profissional.nome;

    expect(escolhaDocumentario).toBe('SemNarrativa'); 
    expect(escolhaFiccao).toBe('ComNarrativa'); 
  });

  it('documentário valida teto com reserva de 50% e lança ErroNegocio', async () => {
    const repo = new RepositorioProfissionaisMemoria([
      profissionalFake({ precoMinimo: 400_000, precoMaximo: 450_000 }),
    ]);
    const documentario = new OrquestradorEquipeDocumentario(
      motorPadrao(), repo, new BarramentoEventosLocal(),
    );
    await expect(documentario.comporEquipe(projetoFake())).rejects.toThrowError(ErroNegocio);
  });

  it('animação exige o papel VFX preenchido quando obrigatório', async () => {
    const repo = new RepositorioProfissionaisMemoria([
      profissionalFake({ papeis: [Papel.EDITOR], competencias: VetorCompetencias.criar({ edicao: 1 }) }),
    ]);
    const animacao = new OrquestradorEquipeAnimacao(motorPadrao(), repo, new BarramentoEventosLocal());
    const projeto = projetoFake({
      tipoCaptacao: TipoCaptacao.ANIMACAO,
      papeisObrigatorios: [
        new PapelRequerido(Papel.EDITOR, 2),
        new PapelRequerido(Papel.VFX, 4),
      ],
    });

    await expect(animacao.comporEquipe(projeto)).rejects.toThrowError(/VFX/);
  });

  it('tolerância a falhas: repositório indisponível → fonte de fallback (recomendação parcial)', async () => {
    const repositorioQuebrado: RepositorioProfissionais = {
      buscarPorPapel: () => Promise.reject(new Error('ECONNREFUSED: PostgreSQL indisponível')),
      buscarPorId: () => Promise.reject(new Error('ECONNREFUSED')),
    };
    const fallback = new FonteFallbackProfissionaisMemoria([profissionalFake({ nome: 'DoFallback' })]);
    const ficcao = new OrquestradorEquipeFiccao(
      motorPadrao(), repositorioQuebrado, new BarramentoEventosLocal(), fallback,
    );

    const resultado = await ficcao.comporEquipe(projetoFake());

    expect(resultado.equipe.membros[0]?.profissional.nome).toBe('DoFallback');
    expect(resultado.recomendacoes[0]?.origemDados).toBe('FALLBACK');
    expect(
      resultado.equipe.observacoes.some((texto) => texto.includes('fallback')),
    ).toBe(true);
  });
});

describe('FabricaOrquestrador', () => {
  function depsBase() {
    return {
      repositorioProfissionais: new RepositorioProfissionaisMemoria(),
      barramento: new BarramentoEventosLocal(),
      fonteFallback: new FonteFallbackProfissionaisMemoria(),
      fabricaEstrategias: new FabricaEstrategias(),
      parametros: PARAMETROS_PADRAO,
    };
  }

  it('resolve a subclasse correta por tipo de captação', () => {
    const fabrica = new FabricaOrquestrador(depsBase());
    expect(
      fabrica.resolverParaProjeto(projetoFake({ tipoCaptacao: TipoCaptacao.DOCUMENTARIO })),
    ).toBeInstanceOf(OrquestradorEquipeDocumentario);
    expect(
      fabrica.resolverParaProjeto(projetoFake({ tipoCaptacao: TipoCaptacao.FICCAO })),
    ).toBeInstanceOf(OrquestradorEquipeFiccao);
    expect(
      fabrica.resolverParaProjeto(projetoFake({ tipoCaptacao: TipoCaptacao.ANIMACAO })),
    ).toBeInstanceOf(OrquestradorEquipeAnimacao);
  });
});
