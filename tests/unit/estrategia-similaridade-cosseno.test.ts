import { describe, expect, it } from 'vitest';
import { EstrategiaSimilaridadeCosseno } from '../../src/application/recommendation/strategies/similaridade-cosseno';
import { VetorCompetencias } from '../../src/domain/value-objects/vetor-competencias';
import { PARAMETROS_PADRAO } from '../../src/application/recommendation/parametros-recomendacao';
import { contextoFake, profissionalFake } from '../helpers/fabricas';

describe('EstrategiaSimilaridadeCosseno', () => {
  it('ranqueia acima quem tem vetor de competências mais próximo do perfil desejado', () => {
    const alinhado = profissionalFake({
      nome: 'Alinhado',
      competencias: VetorCompetencias.criar({ fotografia: 1, iluminacao: 0.9, camera: 0.9, cor: 0.6 }),
      mediaAvaliacoes: 3.0,
    });
    const desalinhado = profissionalFake({
      nome: 'Desalinhado',
      competencias: VetorCompetencias.criar({ som: 1, mixagem: 1 }),
      mediaAvaliacoes: 5.0,
    });

    const resultado = new EstrategiaSimilaridadeCosseno().ranquear(
      [desalinhado, alinhado],
      contextoFake(),
    );

    expect(resultado[0]?.profissional.nome).toBe('Alinhado');
    expect(resultado[0]?.score).toBeGreaterThan(resultado[1]?.score ?? 0);
  });

  it('é parametrizável: pesos diferentes mudam o resultado do ranking', () => {
    const forteEmCompetencia = profissionalFake({
      nome: 'ForteEmCompetencia',
      competencias: VetorCompetencias.criar({ fotografia: 1, iluminacao: 1, camera: 1, cor: 1, direcao: 1 }),
      mediaAvaliacoes: 3.0,
    });
    const forteEmAvaliacao = profissionalFake({
      nome: 'ForteEmAvaliacao',
      competencias: VetorCompetencias.criar({ som: 1 }),
      mediaAvaliacoes: 5.0,
    });
    const estrategia = new EstrategiaSimilaridadeCosseno();

    const padrao = estrategia.ranquear([forteEmAvaliacao, forteEmCompetencia], contextoFake());
    expect(padrao[0]?.profissional.nome).toBe('ForteEmCompetencia');

    const pesandoAvaliacao = estrategia.ranquear(
      [forteEmCompetencia, forteEmAvaliacao],
      contextoFake({
        parametros: { ...PARAMETROS_PADRAO, pesoSimilaridade: 0.05, pesoAvaliacao: 0.9 },
      }),
    );
    expect(pesandoAvaliacao[0]?.profissional.nome).toBe('ForteEmAvaliacao');
  });

  it('detalha os componentes do score para explicabilidade/auditoria', () => {
    const resultado = new EstrategiaSimilaridadeCosseno().ranquear(
      [profissionalFake()],
      contextoFake(),
    );
    expect(resultado[0]?.detalhamento).toHaveProperty('similaridade');
    expect(resultado[0]?.detalhamento).toHaveProperty('avaliacao');
    expect(resultado[0]?.detalhamento).toHaveProperty('custo');
    expect(resultado[0]?.detalhamento).toHaveProperty('localizacao');
    expect(resultado[0]?.score).toBeGreaterThanOrEqual(0);
    expect(resultado[0]?.score).toBeLessThanOrEqual(1);
  });
});
