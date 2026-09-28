import { describe, expect, it } from 'vitest';
import { performance } from 'node:perf_hooks';
import { montarContainer } from '../../src/composition/container';
import { gerarProfissionais } from '../../src/infrastructure/persistence/gerador-profissionais';

describe('NFR — desempenho do endpoint de recomendação', () => {
  it(
    '100 requisições concorrentes com 10.000 profissionais: todas < 2s',
    { timeout: 60_000 },
    async () => {
      const container = montarContainer({ profissionais: gerarProfissionais(10_000, 7) });
      const app = container.construirApp();

      const payload = {
        id: 'proj-perf',
        genero: 'documentario',
        duracaoEstimadaMinutos: 80,
        orcamentoTotal: 50_000_000,
        dataEntrega: '2027-06-30',
        tipoCaptacao: 'FICCAO',
        localizacao: { cidade: 'São Paulo', uf: 'SP' },
        periodoFiltragens: { inicio: '2026-05-01', fim: '2026-08-31' },
        papeis: [
          { papel: 'DIRETOR', peso: 5 },
          { papel: 'DIRETOR_FOTOGRAFIA', peso: 4 },
          { papel: 'SONOPLASTA', peso: 2 },
          { papel: 'EDITOR', peso: 3 },
          { papel: 'ROTEIRISTA', peso: 3 },
          { papel: 'VFX', peso: 2 },
        ],
      };

      const duracoes = await Promise.all(
        Array.from({ length: 100 }, async (_, indice) => {
          const inicio = performance.now();
          const resposta = await app.inject({
            method: 'POST',
            url: '/recomendacoes/equipe',
            payload: { ...payload, id: `proj-perf-${indice}` },
          });
          const duracao = performance.now() - inicio;
          expect(resposta.statusCode).toBe(200);
          return duracao;
        }),
      );

      const maxima = Math.max(...duracoes);
      const media = duracoes.reduce((a, b) => a + b, 0) / duracoes.length;
      console.log(
        `Desempenho (10k profissionais, 100 concorrentes): média ${media.toFixed(1)}ms, pior ${maxima.toFixed(1)}ms`,
      );
      const sobCoverage = process.argv.includes('--coverage') || process.env['npm_lifecycle_event'] === 'coverage';
      const limiteMaximoMs = sobCoverage ? 4_000 : 2_000;
      expect(maxima).toBeLessThan(limiteMaximoMs);
    },
  );
});
