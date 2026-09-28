import { describe, expect, it } from 'vitest';
import { Localizacao } from '../../src/domain/value-objects/localizacao';
import { IntervaloDatas } from '../../src/domain/value-objects/intervalo-datas';
import { MembroEquipe } from '../../src/domain/entities/membro-equipe';
import { Equipe } from '../../src/domain/entities/equipe';
import { Convite } from '../../src/domain/entities/convite';
import { Avaliacao } from '../../src/domain/entities/avaliacao';
import { Competencia } from '../../src/domain/entities/competencia';
import { PapelRequerido } from '../../src/domain/entities/papel-requerido';
import { Papel } from '../../src/domain/enums/papel';
import { StatusConvite } from '../../src/domain/enums/status-convite';
import { StatusEquipe } from '../../src/domain/enums/status-equipe';
import type { VisitanteProjeto } from '../../src/domain/visitors/visitante-projeto';
import { papelRequeridoFake, profissionalFake, projetoFake } from '../helpers/fabricas';

describe('Localizacao', () => {
  it('afinidade: mesma cidade 1, mesmo UF 0,6, mesmo país 0,3, senão 0', () => {
    const sp = new Localizacao('São Paulo', 'SP');
    expect(sp.afinidadeCom(new Localizacao('são paulo ', 'sp'))).toBe(1);
    expect(sp.afinidadeCom(new Localizacao('Campinas', 'SP'))).toBe(0.6);
    expect(sp.afinidadeCom(new Localizacao('Recife', 'PE'))).toBe(0.3);
    expect(sp.afinidadeCom(new Localizacao('Lisboa', 'LX', 'Portugal'))).toBe(0);
  });
});

describe('IntervaloDatas', () => {
  it('rejeita intervalo com fim anterior ao início', () => {
    expect(() => new IntervaloDatas(new Date('2026-02-01'), new Date('2026-01-01'))).toThrowError(/inválido/);
  });

  it('contem, contemIntervalo e sobrepoe', () => {
    const janela = new IntervaloDatas(new Date('2026-01-01'), new Date('2026-06-30'));
    expect(janela.contem(new Date('2026-03-15'))).toBe(true);
    expect(janela.contem(new Date('2026-08-01'))).toBe(false);
    expect(janela.contemIntervalo(new IntervaloDatas(new Date('2026-02-01'), new Date('2026-03-01')))).toBe(true);
    expect(janela.contemIntervalo(new IntervaloDatas(new Date('2026-06-01'), new Date('2026-07-01')))).toBe(false);
    expect(janela.sobrepoe(new IntervaloDatas(new Date('2026-06-30'), new Date('2026-12-31')))).toBe(true);
    expect(janela.sobrepoe(new IntervaloDatas(new Date('2026-07-01'), new Date('2026-12-31')))).toBe(false);
  });
});

describe('Profissional — invariantes', () => {
  it('rejeita faixa de preço e avaliações inválidas', () => {
    expect(() => profissionalFake({ precoMinimo: -1 })).toThrowError(/preço mínimo/);
    expect(() => profissionalFake({ precoMinimo: 100, precoMaximo: 50 })).toThrowError(/faixa de preço/);
    expect(() => profissionalFake({ mediaAvaliacoes: 6 })).toThrowError(/0\.\.5/);
    expect(() => profissionalFake({ totalAvaliacoes: -3 })).toThrowError(/avaliações/);
  });
});

describe('Projeto — invariantes', () => {
  it('rejeita orçamento não positivo e lista de papéis vazia', () => {
    expect(() => projetoFake({ orcamentoTotal: 0 })).toThrowError(/orçamento/);
    expect(() => projetoFake({ papeisObrigatorios: [] })).toThrowError(/papel obrigatório/);
  });
});

describe('PapelRequerido', () => {
  it('rejeita peso inválido', () => {
    expect(() => new PapelRequerido(Papel.EDITOR, 0)).toThrowError(/Peso/);
  });

  it('double dispatch: aceitarVisitante delega ao visitante', () => {
    const visitados: string[] = [];
    const visitante: VisitanteProjeto = {
      visitarProjeto: () => undefined,
      visitarPapelRequerido: (papel) => visitados.push(papel.papel),
      visitarEquipe: () => undefined,
      visitarMembroEquipe: () => undefined,
    };
    papelRequeridoFake(Papel.VFX).aceitarVisitante(visitante);
    expect(visitados).toEqual([Papel.VFX]);
  });
});

describe('MembroEquipe — máquina de estados', () => {
  it('confirma e recusa apenas quando pendente', () => {
    const membro = new MembroEquipe({
      papel: Papel.EDITOR, profissional: profissionalFake(), custoAcordado: 10_000, scoreRecomendacao: 0.8,
    });
    expect(membro.status).toBe(StatusConvite.PENDENTE);
    membro.confirmarInteresse();
    expect(membro.status).toBe(StatusConvite.ACEITO);
    expect(() => membro.confirmarInteresse()).toThrowError(/respondido/);
    expect(() => membro.recusarInteresse()).toThrowError(/respondido/);
  });
});

describe('Convite — máquina de estados', () => {
  it('transiciona uma única vez e registra a data', () => {
    const convite = new Convite({
      id: 'c1', equipeId: 'e1', projetoId: 'p1', profissionalId: 'pro1', papel: Papel.DIRETOR,
    });
    expect(convite.dataResposta).toBeNull();
    convite.aceitar();
    expect(convite.status).toBe(StatusConvite.ACEITO);
    expect(convite.dataResposta).toBeInstanceOf(Date);
    expect(() => convite.recusar()).toThrowError(/respondido/);
  });
});

describe('Equipe', () => {
  it('impede dois membros no mesmo papel e calcula custo total', () => {
    const equipe = new Equipe({ id: 'e1', projetoId: 'p1' });
    equipe.adicionarMembro(new MembroEquipe({
      papel: Papel.EDITOR, profissional: profissionalFake(), custoAcordado: 10_000, scoreRecomendacao: 0.5,
    }));
    expect(() => equipe.adicionarMembro(new MembroEquipe({
      papel: Papel.EDITOR, profissional: profissionalFake(), custoAcordado: 10_000, scoreRecomendacao: 0.5,
    }))).toThrowError(/já está ocupado/);
    expect(equipe.custoTotal()).toBe(10_000);
  });

  it('removerMembro remove e devolve o membro; remoção inexistente devolve undefined', () => {
    const equipe = new Equipe({ id: 'e2', projetoId: 'p1' });
    const membro = new MembroEquipe({
      papel: Papel.VFX, profissional: profissionalFake(), custoAcordado: 1, scoreRecomendacao: 1,
    });
    equipe.adicionarMembro(membro);
    expect(equipe.removerMembro(Papel.VFX)).toBe(membro);
    expect(equipe.removerMembro(Papel.VFX)).toBeUndefined();
  });

  it('atualizarStatusPorCobertura: EM_FORMACAO → FORMADA_PARCIAL → FORMADA', () => {
    const equipe = new Equipe({ id: 'e3', projetoId: 'p1' });
    const m1 = new MembroEquipe({ papel: Papel.DIRETOR, profissional: profissionalFake(), custoAcordado: 1, scoreRecomendacao: 1 });
    const m2 = new MembroEquipe({ papel: Papel.EDITOR, profissional: profissionalFake(), custoAcordado: 1, scoreRecomendacao: 1 });
    equipe.adicionarMembro(m1);
    equipe.adicionarMembro(m2);
    const papeis = [papelRequeridoFake(Papel.DIRETOR), papelRequeridoFake(Papel.EDITOR)];

    equipe.atualizarStatusPorCobertura(papeis);
    expect(equipe.status).toBe(StatusEquipe.EM_FORMACAO);

    m1.confirmarInteresse();
    equipe.atualizarStatusPorCobertura(papeis);
    expect(equipe.status).toBe(StatusEquipe.FORMADA_PARCIAL);

    m2.confirmarInteresse();
    equipe.atualizarStatusPorCobertura(papeis);
    expect(equipe.status).toBe(StatusEquipe.FORMADA);
  });
});

describe('Avaliacao e Competencia', () => {
  it('Avaliacao valida nota e expõe dados', () => {
    expect(() => new Avaliacao({
      id: 'a1', profissionalId: 'p', projetoId: 'j', avaliadorId: 'x', nota: 7, data: new Date(),
    })).toThrowError(/0\.\.5/);
    const avaliacao = new Avaliacao({
      id: 'a2', profissionalId: 'p', projetoId: 'j', avaliadorId: 'x', nota: 4.5, comentario: 'ótimo', data: new Date('2026-05-01'),
    });
    expect(avaliacao.comentario).toBe('ótimo');
    expect(avaliacao.nota).toBe(4.5);
  });

  it('Competencia expõe dados básicos', () => {
    const competencia = new Competencia({ id: 'c1', nome: 'Fotografia', categoria: 'Imagem' });
    expect(competencia.nome).toBe('Fotografia');
    expect(competencia.categoria).toBe('Imagem');
  });
});
