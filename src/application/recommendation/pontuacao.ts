import type { CandidatoRanqueado } from './candidato-ranqueado';

export function limitar01(valor: number): number {
  return Math.min(1, Math.max(0, valor));
}

export function adequacaoCusto(precoMinimo: number, teto: number): number {
  if (teto <= 0) {
    return 0;
  }
  return limitar01(1 - precoMinimo / teto);
}

export function ordenarPorScore(ranqueados: readonly CandidatoRanqueado[]): CandidatoRanqueado[] {
  return [...ranqueados].sort(
    (a, b) =>
      b.score - a.score
      || a.profissional.precoMinimo - b.profissional.precoMinimo
      || a.profissional.id.localeCompare(b.profissional.id),
  );
}
