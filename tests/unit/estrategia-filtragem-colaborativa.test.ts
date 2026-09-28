import { describe, expect, it } from 'vitest';
import { EstrategiaFiltragemColaborativa } from '../../src/application/recommendation/strategies/filtragem-colaborativa';
import { contextoFake, profissionalFake } from '../helpers/fabricas';

describe('EstrategiaFiltragemColaborativa', () => {
  it('média bayesiana: veterano bem avaliado vence novato com única nota máxima', () => {
    const veterano = profissionalFake({ nome: 'Veterano', mediaAvaliacoes: 4.4, totalAvaliacoes: 120 });
    const novato = profissionalFake({ nome: 'Novato', mediaAvaliacoes: 5.0, totalAvaliacoes: 2 });

    const resultado = new EstrategiaFiltragemColaborativa().ranquear(
      [novato, veterano],
      contextoFake(),
    );

    expect(resultado[0]?.profissional.nome).toBe('Veterano');
  });

  it('afinidade histórica com a equipe parcial eleva o candidato no ranking', () => {
    const membroConfirmado = profissionalFake({ id: 'membro-1' });
    const semAfinidade = profissionalFake({ nome: 'SemAfinidade', mediaAvaliacoes: 4.5, totalAvaliacoes: 50 });
    const comAfinidade = profissionalFake({
      nome: 'ComAfinidade',
      mediaAvaliacoes: 4.3,
      totalAvaliacoes: 50,
      afinidades: { 'membro-1': 1 },
    });

    const resultado = new EstrategiaFiltragemColaborativa().ranquear(
      [semAfinidade, comAfinidade],
      contextoFake({ equipeParcial: [membroConfirmado] }),
    );

    expect(resultado[0]?.profissional.nome).toBe('ComAfinidade');
    expect(resultado[0]?.detalhamento['afinidade']).toBe(1);
    expect(resultado[1]?.detalhamento['afinidade']).toBe(0.5);
  });

  it('usa afinidade neutra (0,5) quando a equipe parcial está vazia', () => {
    const resultado = new EstrategiaFiltragemColaborativa().ranquear(
      [profissionalFake()],
      contextoFake({ equipeParcial: [] }),
    );
    expect(resultado[0]?.detalhamento['afinidade']).toBe(0.5);
  });
});
