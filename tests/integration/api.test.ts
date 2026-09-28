import { describe, expect, it } from 'vitest';
import { montarContainer } from '../../src/composition/container';
import { Papel } from '../../src/domain/enums/papel';
import { StatusConvite } from '../../src/domain/enums/status-convite';
import { VetorCompetencias } from '../../src/domain/value-objects/vetor-competencias';
import { FonteFallbackProfissionaisMemoria } from '../../src/infrastructure/persistence/repositorios-memoria';
import type { RepositorioProfissionais } from '../../src/domain/ports/repositorios';
import type { Profissional } from '../../src/domain/entities/profissional';
import { profissionalFake } from '../helpers/fabricas';

const PROJETO_DTO = {
  id: 'proj-api-1',
  titulo: 'Umbigo do Mundo',
  genero: 'drama',
  duracaoEstimadaMinutos: 95,
  orcamentoTotal: 1_000_000,
  dataEntrega: '2027-03-01',
  tipoCaptacao: 'FICCAO',
  localizacao: { cidade: 'São Paulo', uf: 'SP' },
  periodoFiltragens: { inicio: '2026-10-01', fim: '2026-11-15' },
  papeis: [
    { papel: 'DIRETOR_FOTOGRAFIA', peso: 3 },
    { papel: 'SONOPLASTA', peso: 2 },
  ],
} as const;

function profissionaisApi(): Profissional[] {
  return [
    profissionalFake({
      nome: 'Fotografa API',
      competencias: VetorCompetencias.criar({ fotografia: 0.95, iluminacao: 0.9, camera: 0.85 }),
    }),
    profissionalFake({
      nome: 'Sonoplasta API',
      papeis: [Papel.SONOPLASTA],
      competencias: VetorCompetencias.criar({ som: 1, captacao_audio: 0.95, mixagem: 0.8 }),
    }),
  ];
}

describe('API REST — POST /recomendacoes/equipe', () => {
  it('recebe um projeto, aplica a estratégia e retorna equipe recomendada', async () => {
    const container = montarContainer({ profissionais: profissionaisApi() });
    const app = container.construirApp();

    const resposta = await app.inject({ method: 'POST', url: '/recomendacoes/equipe', payload: PROJETO_DTO });
    expect(resposta.statusCode).toBe(200);

    const corpo = resposta.json() as {
      projeto: { estrategiaResolvida: string };
      equipe: { membros: Array<{ papel: string; profissional: string }>; custoTotal: number };
      recomendacoes: Array<{ papel: string; origemDados: string }>;
      convites: Array<{ id: string; status: string }>;
      analise: { violacoes: string[]; relatorio: string };
    };
    expect(corpo.projeto.estrategiaResolvida).toBe('SIMILARIDADE_COSSENO');
    expect(corpo.equipe.membros).toHaveLength(2);
    expect(corpo.equipe.membros.map((m) => m.profissional).sort()).toEqual(['Fotografa API', 'Sonoplasta API']);
    expect(corpo.convites).toHaveLength(2);
    expect(corpo.convites.every((c) => c.status === 'PENDENTE')).toBe(true);
    expect(corpo.analise.violacoes).toEqual([]);
    expect(corpo.analise.relatorio).toContain('Fotografa API');

    expect(container.observadorEmail.notificacoesEnviadas).toHaveLength(2);
    expect(container.observadorAuditoria.registrosDoTipo('RECOMENDACAO_GERADA')).toHaveLength(2);
    expect(container.observadorAuditoria.registrosDoTipo('EQUIPE_COMPOSTA')).toHaveLength(1);
  });

  it('rejeita carga inválida com 400 (validação de schema do Fastify)', async () => {
    const container = montarContainer({ profissionais: profissionaisApi() });
    const app = container.construirApp();

    const semPapeis = { ...PROJETO_DTO, papeis: [] };
    const resposta = await app.inject({ method: 'POST', url: '/recomendacoes/equipe', payload: semPapeis });
    expect(resposta.statusCode).toBe(400);

    const papelInvalido = { ...PROJETO_DTO, papeis: [{ papel: 'ATOR', peso: 1 }] };
    const resposta2 = await app.inject({ method: 'POST', url: '/recomendacoes/equipe', payload: papelInvalido });
    expect(resposta2.statusCode).toBe(400);
  });

  it('estrategiaPreferida do produtor troca o algoritmo na hora', async () => {
    const container = montarContainer({ profissionais: profissionaisApi() });
    const app = container.construirApp();

    const resposta = await app.inject({
      method: 'POST',
      url: '/recomendacoes/equipe',
      payload: { ...PROJETO_DTO, id: 'proj-api-2', estrategiaPreferida: 'ORCAMENTO_REDUZIDO' },
    });
    expect(resposta.statusCode).toBe(200);
    const corpo = resposta.json() as { projeto: { estrategiaResolvida: string } };
    expect(corpo.projeto.estrategiaResolvida).toBe('ORCAMENTO_REDUZIDO');
  });

  it('reavaliação com novo orçamento re-resolve a estratégia', async () => {
    const container = montarContainer({ profissionais: profissionaisApi() });
    const app = container.construirApp();

    const resposta = await app.inject({
      method: 'POST',
      url: '/recomendacoes/reavaliacao',
      payload: { ...PROJETO_DTO, id: 'proj-api-3', orcamentoTotal: 120_000 },
    });
    expect(resposta.statusCode).toBe(200);
    const corpo = resposta.json() as { projeto: { estrategiaResolvida: string } };
    expect(corpo.projeto.estrategiaResolvida).toBe('ORCAMENTO_REDUZIDO');
  });

  it('fluxo ponta a ponta: recomendar → aceitar convites → equipe FORMADA', async () => {
    const container = montarContainer({ profissionais: profissionaisApi() });
    const app = container.construirApp();

    const recomendacao = await app.inject({ method: 'POST', url: '/recomendacoes/equipe', payload: PROJETO_DTO });
    const corpo = recomendacao.json() as {
      equipe: { id: string; status: string };
      convites: Array<{ id: string }>;
    };

    for (const convite of corpo.convites) {
      const resposta = await app.inject({
        method: 'POST',
        url: `/convites/${convite.id}/resposta`,
        payload: { aceito: true },
      });
      expect(resposta.statusCode).toBe(200);
      expect(resposta.json()).toEqual({ status: StatusConvite.ACEITO });
    }
    await container.barramento.aguardarProcessamento();

    const equipe = await container.repositorioEquipes.buscarPorId(corpo.equipe.id);
    expect(equipe?.status).toBe('FORMADA');
    expect(container.observadorAuditoria.registrosDoTipo('EQUIPE_FORMADA')).toHaveLength(1);
  });

  it('substituição via API: nova recomendação apenas do papel', async () => {
    const extra = profissionalFake({
      nome: 'Fotografo Reserva',
      competencias: VetorCompetencias.criar({ fotografia: 0.7, iluminacao: 0.6 }),
      precoMinimo: 35_000,
      precoMaximo: 50_000,
    });
    const container = montarContainer({ profissionais: [...profissionaisApi(), extra] });
    const app = container.construirApp();

    const recomendacao = await app.inject({ method: 'POST', url: '/recomendacoes/equipe', payload: PROJETO_DTO });
    const corpo = recomendacao.json() as { equipe: { id: string } };

    const resposta = await app.inject({
      method: 'POST',
      url: `/equipes/${corpo.equipe.id}/substituicao`,
      payload: { papel: 'DIRETOR_FOTOGRAFIA' },
    });
    expect(resposta.statusCode).toBe(200);
    const troca = resposta.json() as {
      novoMembro: { papel: string; profissionalId: string };
      recomendacao: { papel: string; candidatos: Array<{ nome: string }> };
    };
    expect(troca.recomendacao.papel).toBe('DIRETOR_FOTOGRAFIA');
    expect(
      troca.recomendacao.candidatos.some((c) => c.nome === 'Fotografa API'),
    ).toBe(false); 
    expect(container.observadorAuditoria.registrosDoTipo('SUBSTITUICAO_REALIZADA')).toHaveLength(1);
  });

  it('convite inexistente → 404; regra de negócio → 422', async () => {
    const container = montarContainer({ profissionais: profissionaisApi() });
    const app = container.construirApp();

    const naoAchou = await app.inject({
      method: 'POST', url: '/convites/inexistente/resposta', payload: { aceito: true },
    });
    expect(naoAchou.statusCode).toBe(404);

    const recomendacao = await app.inject({ method: 'POST', url: '/recomendacoes/equipe', payload: PROJETO_DTO });
    const { convites } = recomendacao.json() as { convites: Array<{ id: string }> };
    await app.inject({ method: 'POST', url: `/convites/${convites[0]!.id}/resposta`, payload: { aceito: true } });
    const duplicada = await app.inject({
      method: 'POST', url: `/convites/${convites[0]!.id}/resposta`, payload: { aceito: false },
    });
    expect(duplicada.statusCode).toBe(422);
  });

  it('fallback: sem repositório, responde 200 com recomendação parcial sinalizada', async () => {
    const repositorioQuebrado: RepositorioProfissionais = {
      buscarPorPapel: () => Promise.reject(new Error('PostgreSQL indisponível')),
      buscarPorId: () => Promise.reject(new Error('PostgreSQL indisponível')),
    };
    const fallback = new FonteFallbackProfissionaisMemoria([
      profissionalFake({ nome: 'Fallback Foto' }),
      profissionalFake({ nome: 'Fallback Som', papeis: [Papel.SONOPLASTA] }),
    ]);
    const container = montarContainer({ repositorioProfissionais: repositorioQuebrado, fonteFallback: fallback });
    const app = container.construirApp();

    const resposta = await app.inject({ method: 'POST', url: '/recomendacoes/equipe', payload: PROJETO_DTO });
    expect(resposta.statusCode).toBe(200);
    const corpo = resposta.json() as {
      equipe: { membros: Array<{ profissional: string }>; observacoes: string[] };
      recomendacoes: Array<{ origemDados: string }>;
    };
    expect(corpo.equipe.membros).toHaveLength(2);
    expect(corpo.recomendacoes.every((r) => r.origemDados === 'FALLBACK')).toBe(true);
    expect(corpo.equipe.observacoes.some((o) => o.includes('fallback'))).toBe(true);
  });

  it('GET /saude responde ok', async () => {
    const app = montarContainer().construirApp();
    const resposta = await app.inject({ method: 'GET', url: '/saude' });
    expect(resposta.statusCode).toBe(200);
    expect(resposta.json()).toEqual({ status: 'ok' });
  });
});
