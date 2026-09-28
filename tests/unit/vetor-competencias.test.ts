import { describe, expect, it } from 'vitest';
import { VetorCompetencias } from '../../src/domain/value-objects/vetor-competencias';

describe('VetorCompetencias', () => {
  it('retorna 1 para vetores idênticos', () => {
    const a = VetorCompetencias.criar({ fotografia: 1, iluminacao: 0.8 });
    const b = VetorCompetencias.criar({ fotografia: 1, iluminacao: 0.8 });
    expect(a.similaridadeCosseno(b)).toBeCloseTo(1, 10);
  });

  it('retorna 0 para vetores ortogonais (sem dimensões em comum)', () => {
    const a = VetorCompetencias.criar({ fotografia: 1 });
    const b = VetorCompetencias.criar({ som: 1 });
    expect(a.similaridadeCosseno(b)).toBe(0);
  });

  it('calcula valor intermediário para sobreposição parcial', () => {
    const a = VetorCompetencias.criar({ fotografia: 1 });
    const b = VetorCompetencias.criar({ fotografia: 1, iluminacao: 1 });
    expect(a.similaridadeCosseno(b)).toBeCloseTo(1 / Math.sqrt(2), 6);
  });

  it('retorna 0 quando um dos vetores é nulo', () => {
    const vazio = VetorCompetencias.vazio();
    const cheio = VetorCompetencias.criar({ fotografia: 1 });
    expect(vazio.similaridadeCosseno(cheio)).toBe(0);
    expect(cheio.similaridadeCosseno(vazio)).toBe(0);
  });

  it('rejeita níveis fora do intervalo [0, 1]', () => {
    expect(() => VetorCompetencias.criar({ fotografia: 1.5 })).toThrowError(/Nível inválido/);
    expect(() => VetorCompetencias.criar({ fotografia: -0.1 })).toThrowError(/Nível inválido/);
  });

  it('nivelDe retorna 0 para competência ausente', () => {
    const vetor = VetorCompetencias.criar({ fotografia: 0.5 });
    expect(vetor.nivelDe('som')).toBe(0);
    expect(vetor.nivelDe('fotografia')).toBe(0.5);
  });
});
