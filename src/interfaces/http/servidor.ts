import fastify, { type FastifyInstance, type FastifyReply } from 'fastify';
import type { ServicoRecomendacao } from '../../application/services/servico-recomendacao';
import type { ServicoConvite } from '../../application/services/servico-convite';
import { ErroNaoEncontrado, ErroNegocio } from '../../application/erros';
import { Papel } from '../../domain/enums/papel';
import { NOMES_ESTRATEGIAS } from '../../domain/enums/nome-estrategia';
import { TipoCaptacao } from '../../domain/enums/tipo-captacao';
import { paraDadosProjeto, serializarResultado, type ProjetoDto } from './mappers';

export interface DependenciasServidor {
  servicoRecomendacao: ServicoRecomendacao;
  servicoConvite: ServicoConvite;
}

const esquemaProjeto = {
  type: 'object',
  required: [
    'id', 'genero', 'duracaoEstimadaMinutos', 'orcamentoTotal',
    'dataEntrega', 'tipoCaptacao', 'localizacao', 'periodoFiltragens', 'papeis',
  ],
  additionalProperties: false,
  properties: {
    id: { type: 'string', minLength: 1 },
    titulo: { type: 'string' },
    genero: { type: 'string', minLength: 1 },
    duracaoEstimadaMinutos: { type: 'integer', minimum: 1 },
    orcamentoTotal: { type: 'number', exclusiveMinimum: 0 },
    dataEntrega: { type: 'string', format: 'date' },
    tipoCaptacao: { enum: Object.values(TipoCaptacao) },
    localizacao: {
      type: 'object',
      required: ['cidade', 'uf'],
      additionalProperties: false,
      properties: {
        cidade: { type: 'string', minLength: 1 },
        uf: { type: 'string', minLength: 1 },
        pais: { type: 'string' },
      },
    },
    periodoFiltragens: {
      type: 'object',
      required: ['inicio', 'fim'],
      additionalProperties: false,
      properties: {
        inicio: { type: 'string', format: 'date' },
        fim: { type: 'string', format: 'date' },
      },
    },
    papeis: {
      type: 'array',
      minItems: 1,
      items: {
        type: 'object',
        required: ['papel', 'peso'],
        additionalProperties: false,
        properties: {
          papel: { enum: Object.values(Papel) },
          peso: { type: 'number', exclusiveMinimum: 0 },
        },
      },
    },
    estrategiaPreferida: { enum: [...NOMES_ESTRATEGIAS] },
  },
} as const;

function tratarErro(reply: FastifyReply, erro: unknown): FastifyReply {
  if (erro instanceof ErroNaoEncontrado) {
    return reply.code(404).send({ erro: erro.message });
  }
  if (erro instanceof ErroNegocio) {
    return reply.code(422).send({ erro: erro.message });
  }
  if (erro instanceof Error) {
    return reply.code(400).send({ erro: erro.message });
  }
  return reply.code(500).send({ erro: 'Erro interno inesperado.' });
}

export function construirServidor(deps: DependenciasServidor): FastifyInstance {
  const app = fastify({ logger: false });

  app.get('/saude', () => Promise.resolve({ status: 'ok' }));

  app.post('/recomendacoes/equipe', { schema: { body: esquemaProjeto } }, async (req, reply) => {
    try {
      const resultado = await deps.servicoRecomendacao.recomendarEquipe(
        paraDadosProjeto(req.body as ProjetoDto),
      );
      return await reply.code(200).send(serializarResultado(resultado));
    } catch (erro) {
      return tratarErro(reply, erro);
    }
  });

  app.post('/recomendacoes/reavaliacao', { schema: { body: esquemaProjeto } }, async (req, reply) => {
    try {
      const resultado = await deps.servicoRecomendacao.reavaliar(
        paraDadosProjeto(req.body as ProjetoDto),
      );
      return await reply.code(200).send(serializarResultado(resultado));
    } catch (erro) {
      return tratarErro(reply, erro);
    }
  });

  const esquemaRespostaConvite = {
    type: 'object',
    required: ['aceito'],
    additionalProperties: false,
    properties: { aceito: { type: 'boolean' } },
  } as const;

  app.post(
    '/convites/:conviteId/resposta',
    { schema: { body: esquemaRespostaConvite } },
    async (req, reply) => {
      try {
        const { conviteId } = req.params as { conviteId: string };
        const { aceito } = req.body as { aceito: boolean };
        const resultado = await deps.servicoConvite.responder(conviteId, aceito);
        return await reply.code(200).send(resultado);
      } catch (erro) {
        return tratarErro(reply, erro);
      }
    },
  );

  const esquemaSubstituicao = {
    type: 'object',
    required: ['papel'],
    additionalProperties: false,
    properties: { papel: { enum: Object.values(Papel) } },
  } as const;

  app.post(
    '/equipes/:equipeId/substituicao',
    { schema: { body: esquemaSubstituicao } },
    async (req, reply) => {
      try {
        const { equipeId } = req.params as { equipeId: string };
        const { papel } = req.body as { papel: Papel };
        const resultado = await deps.servicoRecomendacao.substituirMembro(equipeId, papel);
        return await reply.code(200).send({
          equipeId: resultado.equipe.id,
          novoMembro: {
            papel: resultado.novoConvite.papel,
            profissionalId: resultado.novoConvite.profissionalId,
          },
          novoConviteId: resultado.novoConvite.id,
          recomendacao: {
            papel: resultado.recomendacao.papel,
            estrategiaUsada: resultado.recomendacao.estrategiaUsada,
            candidatos: resultado.recomendacao.candidatos,
          },
        });
      } catch (erro) {
        return tratarErro(reply, erro);
      }
    },
  );

  return app;
}
