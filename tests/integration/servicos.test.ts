import { describe, expect, it } from 'vitest';
import { montarContainer } from '../../src/composition/container';
import { ErroNaoEncontrado, ErroNegocio } from '../../src/application/erros';
import { Papel } from '../../src/domain/enums/papel';
import { StatusEquipe } from '../../src/domain/enums/status-equipe';
import { StatusConvite } from '../../src/domain/enums/status-convite';
import { VetorCompetencias } from '../../src/domain/value-objects/vetor-competencias';
import type { DadosProjeto } from '../../src/domain/entities/projeto';
import { TipoCaptacao } from '../../src/domain/enums/tipo-captacao';
import { dadosProjetoFake, papelRequeridoFake, profissionalFake } from '../helpers/fabricas';

function baseProfissionais() {
  const fotografo1 = profissionalFake({
    nome: 'Fotografo Um',
    competencias: VetorCompetencias.criar({ fotografia: 0.9, iluminacao: 0.8, camera: 0.8 }),
    precoMinimo: 40_000, precoMaximo: 60_000,
  });
  const fotografo2 = profissionalFake({
    nome: 'Fotografo Dois',
    competencias: VetorCompetencias.criar({ fotografia: 0.9, iluminacao: 0.8, camera: 0.8 }),
    precoMinimo: 45_000, precoMaximo: 65_000,
  });
  const sonoplasta = profissionalFake({
    nome: 'Sonoplasta',
    papeis: [Papel.SONOPLASTA],
    competencias: VetorCompetencias.criar({ som: 1, captacao_audio: 0.9, mixagem: 0.8 }),
  });
  return [fotografo1, fotografo2, sonoplasta];
}

function dadosProjeto(sobre: Partial<DadosProjeto> = {}): DadosProjeto {
  return dadosProjetoFake({
    id: 'proj-svc',
    papeisObrigatorios: [papelRequeridoFake(Papel.DIRETOR_FOTOGRAFIA, 3), papelRequeridoFake(Papel.SONOPLASTA, 2)],
    ...sobre,
  });
}

describe('Integração — fluxo completo de recomendação e convites', () => {
  it('compõe equipe, cria convites, notifica e forma equipe ao aceitar tudo', async () => {
    const container = montarContainer({ profissionais: baseProfissionais() });
    const resultado = await container.servicoRecomendacao.recomendarEquipe(dadosProjeto());

    expect(resultado.equipe.membros).toHaveLength(2);
    expect(resultado.convites).toHaveLength(2);
    expect(resultado.convites.every((c) => c.status === StatusConvite.PENDENTE)).toBe(true);

    expect(container.observadorEmail.notificacoesEnviadas).toHaveLength(2);
    expect(container.observadorAuditoria.registrosDoTipo('RECOMENDACAO_GERADA')).toHaveLength(2);
    expect(container.observadorAuditoria.registrosDoTipo('EQUIPE_COMPOSTA')).toHaveLength(1);
    expect(container.observadorAuditoria.registrosDoTipo('CONVITE_CRIADO')).toHaveLength(2);

    expect(resultado.relatorio.texto).toContain('Fotografo Um');
    expect(resultado.compatibilidade.totalMembros).toBe(2);
    expect(resultado.violacoes).toEqual([]);

    for (const convite of resultado.convites) {
      await container.servicoConvite.responder(convite.id, true);
    }
    await container.barramento.aguardarProcessamento();

    expect(resultado.equipe.status).toBe(StatusEquipe.FORMADA);
    expect(container.observadorAuditoria.registrosDoTipo('EQUIPE_FORMADA')).toHaveLength(1);
    expect(
      container.observadorMensageria.mensagensPublicadas
        .map((p) => p.topico),
    ).toContain('cinebridge.equipe_formada');
    expect(container.observadorEmail.notificacoesEnviadas).toHaveLength(2 + 3);
  });

  it('recusa deixa equipe parcial e produtor é avisado', async () => {
    const container = montarContainer({ profissionais: baseProfissionais() });
    const resultado = await container.servicoRecomendacao.recomendarEquipe(dadosProjeto());

    await container.servicoConvite.responder(resultado.convites[0]!.id, true);
    await container.servicoConvite.responder(resultado.convites[1]!.id, false);
    await container.barramento.aguardarProcessamento();

    expect(resultado.equipe.status).toBe(StatusEquipe.FORMADA_PARCIAL);
    const avisosRecusa = container.observadorEmail.notificacoesEnviadas
      .filter((n) => n.assunto.includes('recusado'));
    expect(avisosRecusa).toHaveLength(1);
    expect(container.observadorAuditoria.registrosDoTipo('CONVITE_RECUSADO')).toHaveLength(1);
    expect(container.observadorAuditoria.registrosDoTipo('EQUIPE_FORMADA')).toHaveLength(0);
  });

  it('substituição dispara nova rodada de recomendação SÓ para o papel afetado', async () => {
    const container = montarContainer({ profissionais: baseProfissionais() });
    const resultado = await container.servicoRecomendacao.recomendarEquipe(dadosProjeto());
    const membroAntes = resultado.equipe.membroDo(Papel.DIRETOR_FOTOGRAFIA)!;
    expect(membroAntes.profissional.nome).toBe('Fotografo Um'); 

    const troca = await container.servicoRecomendacao.substituirMembro(
      resultado.equipe.id, Papel.DIRETOR_FOTOGRAFIA,
    );
    await container.barramento.aguardarProcessamento();

    const membroDepois = troca.equipe.membroDo(Papel.DIRETOR_FOTOGRAFIA)!;
    expect(membroDepois.profissional.nome).toBe('Fotografo Dois');
    expect(membroDepois.status).toBe(StatusConvite.PENDENTE);
    expect(troca.recomendacao.papel).toBe(Papel.DIRETOR_FOTOGRAFIA);
    expect(
      troca.recomendacao.candidatos.some((c) => c.profissionalId === membroAntes.profissional.id),
    ).toBe(false);
    expect(container.observadorAuditoria.registrosDoTipo('SUBSTITUICAO_REALIZADA')).toHaveLength(1);
    expect(container.observadorAuditoria.registrosDoTipo('CONVITE_CRIADO')).toHaveLength(3);
  });

  it('reavaliação com orçamento estourado troca a estratégia automaticamente', async () => {
    const container = montarContainer({ profissionais: baseProfissionais() });

    const antes = await container.servicoRecomendacao.recomendarEquipe(dadosProjeto());
    expect(antes.recomendacoes[0]?.estrategiaUsada).toBe('SIMILARIDADE_COSSENO');

    const depois = await container.servicoRecomendacao.reavaliar(
      dadosProjeto({ id: 'proj-svc-2', orcamentoTotal: 100_000 }), 
    );
    expect(depois.recomendacoes[0]?.estrategiaUsada).toBe('ORCAMENTO_REDUZIDO');
  });

  it('validação do Template Method difere por captação: documentário rejeita, ficção aceita', async () => {
    const profissionais = [
      profissionalFake({ nome: 'Foto Caro', precoMinimo: 33_000, precoMaximo: 40_000 }),
      profissionalFake({
        nome: 'Som Caro',
        papeis: [Papel.SONOPLASTA],
        precoMinimo: 20_000,
        precoMaximo: 26_000,
        competencias: VetorCompetencias.criar({ som: 1, captacao_audio: 0.9 }),
      }),
    ];
    const container = montarContainer({ profissionais });

    const ficcao = await container.servicoRecomendacao.recomendarEquipe(
      dadosProjeto({ id: 'proj-val-1', orcamentoTotal: 100_000, tipoCaptacao: TipoCaptacao.FICCAO }),
    );
    expect(ficcao.equipe.membros).toHaveLength(2);

    await expect(
      container.servicoRecomendacao.recomendarEquipe(
        dadosProjeto({ id: 'proj-val-2', orcamentoTotal: 100_000, tipoCaptacao: TipoCaptacao.DOCUMENTARIO }),
      ),
    ).rejects.toThrowError(ErroNegocio);
  });

  it('erros de negócio: convite/equipe inexistente, resposta duplicada, papel não requerido', async () => {
    const container = montarContainer({ profissionais: baseProfissionais() });
    await expect(container.servicoConvite.responder('inexistente', true))
      .rejects.toThrowError(ErroNaoEncontrado);
    await expect(container.servicoRecomendacao.substituirMembro('inexistente', Papel.EDITOR))
      .rejects.toThrowError(ErroNaoEncontrado);

    const resultado = await container.servicoRecomendacao.recomendarEquipe(dadosProjeto());
    const convite = resultado.convites[0]!;
    await container.servicoConvite.responder(convite.id, true);
    await expect(container.servicoConvite.responder(convite.id, true))
      .rejects.toThrowError(ErroNegocio);
    await expect(container.servicoRecomendacao.substituirMembro(resultado.equipe.id, Papel.VFX))
      .rejects.toThrowError(/não requer o papel/);
  });
});
