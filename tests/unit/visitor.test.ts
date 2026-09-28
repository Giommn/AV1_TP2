import { describe, expect, it } from 'vitest';
import { ValidadorConsistenciaProjeto } from '../../src/application/visitors/validador-consistencia';
import { CalculadorCompatibilidadeEquipe } from '../../src/application/visitors/calculador-compatibilidade';
import { GeradorRelatorioProdutor } from '../../src/application/visitors/gerador-relatorio';
import { Equipe } from '../../src/domain/entities/equipe';
import { MembroEquipe } from '../../src/domain/entities/membro-equipe';
import { PapelRequerido } from '../../src/domain/entities/papel-requerido';
import { Papel } from '../../src/domain/enums/papel';
import { VetorCompetencias } from '../../src/domain/value-objects/vetor-competencias';
import { profissionalFake, projetoFake } from '../helpers/fabricas';

function equipeExemplo() {
  const fotografo = profissionalFake({
    nome: 'Fotografa',
    competencias: VetorCompetencias.criar({ fotografia: 1, iluminacao: 0.9, camera: 0.9, cor: 0.6 }),
  });
  const editor = profissionalFake({
    nome: 'Editor',
    papeis: [Papel.EDITOR],
    competencias: VetorCompetencias.criar({ edicao: 1, montagem: 0.9 }),
    afinidades: {}, 
  });
  const equipe = new Equipe({ id: 'eq-1', projetoId: 'proj-1' });
  equipe.adicionarMembro(new MembroEquipe({
    papel: Papel.DIRETOR_FOTOGRAFIA, profissional: fotografo, custoAcordado: 40_000, scoreRecomendacao: 0.9,
  }));
  equipe.adicionarMembro(new MembroEquipe({
    papel: Papel.EDITOR, profissional: editor, custoAcordado: 30_000, scoreRecomendacao: 0.7,
  }));
  return equipe;
}

function projetoDoisPapeis() {
  return projetoFake({
    papeisObrigatorios: [
      new PapelRequerido(Papel.DIRETOR_FOTOGRAFIA, 3),
      new PapelRequerido(Papel.EDITOR, 2),
      new PapelRequerido(Papel.SONOPLASTA, 1), 
    ],
  });
}

describe('Visitor — três operações distintas sobre a MESMA árvore de domínio', () => {
  it('ValidadorConsistenciaProjeto aponta papel não preenchido', () => {
    const validador = new ValidadorConsistenciaProjeto();
    const projeto = projetoDoisPapeis();
    const equipe = equipeExemplo();

    projeto.aceitarVisitante(validador);
    equipe.aceitarVisitante(validador);
    const violacoes = validador.concluir();

    expect(violacoes).toContain('Papel SONOPLASTA sem profissional designado.');
    expect(violacoes.some((v) => v.includes('Orçamento insuficiente'))).toBe(false);
  });

  it('ValidadorConsistenciaProjeto aponta orçamento insuficiente e cronograma inconsistente', () => {
    const validador = new ValidadorConsistenciaProjeto();
    const projeto = projetoFake({
      orcamentoTotal: 100_000, 
      dataEntrega: new Date('2026-11-01'), 
      papeisObrigatorios: [
        new PapelRequerido(Papel.DIRETOR_FOTOGRAFIA, 3),
        new PapelRequerido(Papel.EDITOR, 2),
      ],
    });
    projeto.aceitarVisitante(validador);
    equipeExemplo().aceitarVisitante(validador);

    const violacoes = validador.concluir();
    expect(violacoes.some((v) => v.includes('Orçamento insuficiente'))).toBe(true);
    expect(violacoes.some((v) => v.includes('Cronograma inconsistente'))).toBe(true);
  });

  it('CalculadorCompatibilidadeEquipe agrega aderência e afinidade', () => {
    const calculador = new CalculadorCompatibilidadeEquipe();
    const projeto = projetoFake({
      papeisObrigatorios: [
        new PapelRequerido(Papel.DIRETOR_FOTOGRAFIA, 3),
        new PapelRequerido(Papel.EDITOR, 2),
      ],
    });
    projeto.aceitarVisitante(calculador);
    equipeExemplo().aceitarVisitante(calculador);

    const resultado = calculador.concluir();
    expect(resultado.totalMembros).toBe(2);
    expect(resultado.aderenciaMedia).toBeGreaterThan(0.9); 
    expect(resultado.afinidadeMedia).toBe(0.5); 
    expect(resultado.compatibilidade).toBeGreaterThanOrEqual(0);
    expect(resultado.compatibilidade).toBeLessThanOrEqual(1);
  });

  it('CalculadorCompatibilidadeEquipe usa afinidade real quando há histórico', () => {
    const calculador = new CalculadorCompatibilidadeEquipe();
    const a = profissionalFake({
      nome: 'A',
      competencias: VetorCompetencias.criar({ fotografia: 1 }),
      afinidades: {},
    });
    const b = profissionalFake({
      nome: 'B',
      papeis: [Papel.EDITOR],
      competencias: VetorCompetencias.criar({ edicao: 1 }),
      afinidades: { [a.id]: 1 }, 
    });
    const equipe = new Equipe({ id: 'eq-x', projetoId: 'proj-1' });
    equipe.adicionarMembro(new MembroEquipe({ papel: Papel.DIRETOR_FOTOGRAFIA, profissional: a, custoAcordado: 1, scoreRecomendacao: 1 }));
    equipe.adicionarMembro(new MembroEquipe({ papel: Papel.EDITOR, profissional: b, custoAcordado: 1, scoreRecomendacao: 1 }));

    equipe.aceitarVisitante(calculador);
    const resultado = calculador.concluir();
    expect(resultado.afinidadeMedia).toBe(1);
  });

  it('GeradorRelatorioProdutor gera relatório legível e estruturado', () => {
    const gerador = new GeradorRelatorioProdutor();
    const projeto = projetoDoisPapeis();
    const equipe = equipeExemplo();
    equipe.registrarObservacao('Observação de teste.');

    projeto.aceitarVisitante(gerador);
    equipe.aceitarVisitante(gerador);
    const relatorio = gerador.relatorio();

    expect(relatorio.texto).toContain('# Projeto proj-1');
    expect(relatorio.texto).toContain('Fotografa');
    expect(relatorio.texto).toContain('SONOPLASTA (peso 1)');
    expect(relatorio.texto).toContain('Observação de teste.');
    expect(relatorio.custoTotal).toBe(70_000);
    expect(relatorio.membros).toHaveLength(2);
    expect(relatorio.papeisRequeridos).toHaveLength(3);
  });

  it('os três visitantes funcionam em sequência sobre os mesmos objetos', () => {
    const projeto = projetoDoisPapeis();
    const equipe = equipeExemplo();
    const visitantes = [
      new ValidadorConsistenciaProjeto(),
      new CalculadorCompatibilidadeEquipe(),
      new GeradorRelatorioProdutor(),
    ] as const;

    for (const visitante of visitantes) {
      projeto.aceitarVisitante(visitante);
      equipe.aceitarVisitante(visitante);
    }

    expect(visitantes[0].concluir().length).toBeGreaterThan(0);
    expect(visitantes[1].concluir().totalMembros).toBe(2);
    expect(visitantes[2].relatorio().membros).toHaveLength(2);
  });
});
