import { describe, expect, it } from 'vitest';
import { EstrategiaOrcamentoReduzido } from '../../src/application/recommendation/strategies/orcamento-reduzido';
import { VetorCompetencias } from '../../src/domain/value-objects/vetor-competencias';
import { contextoFake, profissionalFake } from '../helpers/fabricas';

describe('EstrategiaOrcamentoReduzido', () => {
  it('prioriza o candidato mais barato mesmo com similaridade um pouco menor', () => {
    const barato = profissionalFake({
      nome: 'Barato',
      precoMinimo: 20_000,
      precoMaximo: 30_000,
      competencias: VetorCompetencias.criar({ fotografia: 0.7, iluminacao: 0.6 }),
    });
    const caro = profissionalFake({
      nome: 'Caro',
      precoMinimo: 500_000,
      precoMaximo: 600_000,
      competencias: VetorCompetencias.criar({ fotografia: 1, iluminacao: 0.95, camera: 0.9, cor: 0.8 }),
    });

    const resultado = new EstrategiaOrcamentoReduzido().ranquear(
      [caro, barato],
      contextoFake({ tetoOrcamentalPapel: 600_000 }),
    );

    expect(resultado[0]?.profissional.nome).toBe('Barato');
    expect(resultado[1]?.profissional.nome).toBe('Caro');
  });

  it('aplica teto rígido: descarta quem não cabe no orçamento do papel', () => {
    const foraDoTeto = profissionalFake({ nome: 'ForaDoTeto', precoMinimo: 700_000, precoMaximo: 900_000 });
    const dentroDoTeto = profissionalFake({ nome: 'DentroDoTeto', precoMinimo: 100_000, precoMaximo: 150_000 });

    const resultado = new EstrategiaOrcamentoReduzido().ranquear(
      [foraDoTeto, dentroDoTeto],
      contextoFake({ tetoOrcamentalPapel: 200_000 }),
    );

    expect(resultado).toHaveLength(1);
    expect(resultado[0]?.profissional.nome).toBe('DentroDoTeto');
  });

  it('pesos são parametrizáveis via construtor', () => {
    const estrategia = new EstrategiaOrcamentoReduzido({ custo: 0.05, similaridade: 0.9, avaliacao: 0.05 });
    const barato = profissionalFake({
      nome: 'Barato',
      precoMinimo: 10_000,
      precoMaximo: 15_000,
      competencias: VetorCompetencias.criar({ som: 1 }),
    });
    const alinhado = profissionalFake({
      nome: 'Alinhado',
      precoMinimo: 400_000,
      precoMaximo: 450_000,
      competencias: VetorCompetencias.criar({ fotografia: 1, iluminacao: 1, camera: 1, cor: 1, direcao: 1 }),
    });

    const resultado = estrategia.ranquear([barato, alinhado], contextoFake());
    expect(resultado[0]?.profissional.nome).toBe('Alinhado');
  });
});
