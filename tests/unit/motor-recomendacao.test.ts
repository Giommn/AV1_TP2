import { describe, expect, it } from 'vitest';
import { MotorRecomendacao } from '../../src/application/recommendation/motor-recomendacao';
import { EstrategiaSimilaridadeCosseno } from '../../src/application/recommendation/strategies/similaridade-cosseno';
import { EstrategiaOrcamentoReduzido } from '../../src/application/recommendation/strategies/orcamento-reduzido';
import { FabricaEstrategias } from '../../src/application/recommendation/strategies/fabrica-estrategias';
import { Papel } from '../../src/domain/enums/papel';
import { PapelRequerido } from '../../src/domain/entities/papel-requerido';
import { VetorCompetencias } from '../../src/domain/value-objects/vetor-competencias';
import { IntervaloDatas } from '../../src/domain/value-objects/intervalo-datas';
import { PARAMETROS_PADRAO } from '../../src/application/recommendation/parametros-recomendacao';
import { papelRequeridoFake, profissionalFake, projetoFake } from '../helpers/fabricas';

function candidatosCaroEBarato() {
  const caro = profissionalFake({
    nome: 'Caro',
    competencias: VetorCompetencias.criar({ fotografia: 0.98, iluminacao: 0.9, camera: 0.9, cor: 0.85 }),
    mediaAvaliacoes: 4.6,
    precoMinimo: 500_000,
    precoMaximo: 580_000,
  });
  const barato = profissionalFake({
    nome: 'Barato',
    competencias: VetorCompetencias.criar({ fotografia: 0.5, camera: 0.4 }),
    mediaAvaliacoes: 3.6,
    precoMinimo: 50_000,
    precoMaximo: 80_000,
  });
  return { caro, barato };
}

describe('MotorRecomendacao (contexto do Strategy)', () => {
  it('aplica as restrições rígidas antes de delegar à estratégia', () => {
    const motor = new MotorRecomendacao(new EstrategiaSimilaridadeCosseno());
    const projeto = projetoFake();
    const papel = papelRequeridoFake();

    const semDisponibilidade = profissionalFake({
      nome: 'SemDisponibilidade',
      disponibilidade: [new IntervaloDatas(new Date('2027-01-01'), new Date('2027-06-30'))],
    });
    const acimaDoTeto = profissionalFake({
      nome: 'AcimaDoTeto',
      precoMinimo: 700_000,
      precoMaximo: 900_000, 
    });
    const papelErrado = profissionalFake({ nome: 'PapelErrado', papeis: [Papel.SONOPLASTA] });
    const elegivel = profissionalFake({ nome: 'Elegivel' });

    const resultado = motor.recomendar(
      papel,
      [semDisponibilidade, acimaDoTeto, papelErrado, elegivel],
      projeto,
    );

    expect(resultado.map((c) => c.profissional.nome)).toEqual(['Elegivel']);
  });

  it('troca de estratégia em runtime ALTERA o resultado da recomendação', () => {
    const { caro, barato } = candidatosCaroEBarato();
    const projeto = projetoFake();
    const papel = papelRequeridoFake();
    const fabrica = new FabricaEstrategias();
    const motor = new MotorRecomendacao(fabrica.criar('SIMILARIDADE_COSSENO'));

    expect(motor.nomeEstrategiaAtual).toBe('SIMILARIDADE_COSSENO');
    const comCosseno = motor.recomendar(papel, [barato, caro], projeto);
    expect(comCosseno[0]?.profissional.nome).toBe('Caro');

    motor.trocarEstrategia(fabrica.criar('ORCAMENTO_REDUZIDO'));
    expect(motor.nomeEstrategiaAtual).toBe('ORCAMENTO_REDUZIDO');
    const comOrcamentoReduzido = motor.recomendar(papel, [barato, caro], projeto);
    expect(comOrcamentoReduzido[0]?.profissional.nome).toBe('Barato');

    expect(comCosseno.length).toBe(2);
    expect(comOrcamentoReduzido.length).toBe(2);
  });

  it('rateia o orçamento da equipe pelo peso de importância do papel', () => {
    const motor = new MotorRecomendacao(new EstrategiaSimilaridadeCosseno());
    const projeto = projetoFake({
      orcamentoTotal: 2_000_000,
      papeisObrigatorios: [
        new PapelRequerido(Papel.DIRETOR, 4),
        new PapelRequerido(Papel.EDITOR, 1),
      ],
    });

    const tetoDiretor = motor.tetoOrcamentalParaPapel(new PapelRequerido(Papel.DIRETOR, 4), projeto);
    const tetoEditor = motor.tetoOrcamentalParaPapel(new PapelRequerido(Papel.EDITOR, 1), projeto);

    expect(tetoDiretor).toBeCloseTo(960_000, 6);
    expect(tetoEditor).toBeCloseTo(240_000, 6);
  });

  it('usa o perfil desejado explícito do papel quando informado', () => {
    const motor = new MotorRecomendacao(new EstrategiaSimilaridadeCosseno());
    const perfilVfx = VetorCompetencias.criar({ vfx: 1, composicao: 1 });
    const papel = papelRequeridoFake(Papel.DIRETOR_FOTOGRAFIA, 3, perfilVfx);
    const projeto = projetoFake();

    const generalista = profissionalFake({ nome: 'Generalista' });
    const especialistaVfx = profissionalFake({
      nome: 'EspecialistaVfx',
      competencias: VetorCompetencias.criar({ vfx: 1, composicao: 0.9 }),
    });

    const resultado = motor.recomendar(papel, [generalista, especialistaVfx], projeto);
    expect(resultado[0]?.profissional.nome).toBe('EspecialistaVfx');
  });

  it('respeita o tamanho do top-N configurado', () => {
    const parametros = { ...PARAMETROS_PADRAO, tamanhoTop: 2 };
    const motor = new MotorRecomendacao(new EstrategiaSimilaridadeCosseno(), parametros);
    const candidatos = Array.from({ length: 6 }, () => profissionalFake());

    const resultado = motor.recomendar(papelRequeridoFake(), candidatos, projetoFake());
    expect(resultado).toHaveLength(2);
    expect(resultado[0]!.score).toBeGreaterThanOrEqual(resultado[1]!.score);
  });
});
