import { describe, expect, it } from 'vitest';
import { BarramentoEventosLocal } from '../../src/infrastructure/events/barramento-eventos-local';
import { ObservadorEmail } from '../../src/infrastructure/observers/observador-email';
import { ObservadorMensageria } from '../../src/infrastructure/observers/observador-mensageria';
import { ObservadorAuditoria } from '../../src/infrastructure/observers/observador-auditoria';
import type { ObservadorEvento } from '../../src/domain/ports/barramento-eventos';
import type { EventoDominio } from '../../src/domain/events/eventos';
import {
  ConviteCriadoEvento,
  EquipeCompostaEvento,
} from '../../src/domain/events/eventos';
import { Papel } from '../../src/domain/enums/papel';

class ObservadorExplosivo implements ObservadorEvento {
  readonly nome = 'observador-explosivo';
  interessa(): boolean {
    return true;
  }
  reagir(): void {
    throw new Error('falha síncrona proposital');
  }
}

class ObservadorRejeitado implements ObservadorEvento {
  readonly nome = 'observador-rejeitado';
  interessa(): boolean {
    return true;
  }
  reagir(): Promise<void> {
    return Promise.reject(new Error('falha assíncrona proposital'));
  }
}

describe('Observer — barramento de eventos', () => {
  it('observadores reagem INDEPENDENTEMENTE: falha de um não afeta os demais', async () => {
    const barramento = new BarramentoEventosLocal();
    const auditoria = new ObservadorAuditoria();
    barramento.assinar(new ObservadorExplosivo());
    barramento.assinar(new ObservadorRejeitado());
    barramento.assinar(auditoria);

    barramento.publicar(new EquipeCompostaEvento('eq-1', 'proj-1', 3, 150_000));
    await barramento.aguardarProcessamento();

    expect(auditoria.registrosAuditados).toHaveLength(1);
    expect(auditoria.registrosAuditados[0]?.evento).toBe('EQUIPE_COMPOSTA');
    expect(barramento.erros).toHaveLength(2); 
  });

  it('cada observador filtra os eventos do seu interesse', async () => {
    const barramento = new BarramentoEventosLocal();
    const email = new ObservadorEmail();
    const mensageria = new ObservadorMensageria();
    barramento.assinar(email);
    barramento.assinar(mensageria);

    barramento.publicar(new ConviteCriadoEvento('conv-1', 'eq-1', 'proj-1', 'pro-1', Papel.EDITOR));
    barramento.publicar(new EquipeCompostaEvento('eq-1', 'proj-1', 2, 90_000));
    await barramento.aguardarProcessamento();

    expect(email.notificacoesEnviadas).toHaveLength(1);
    expect(email.notificacoesEnviadas[0]?.destinatario).toBe('profissional:pro-1');
    expect(mensageria.mensagensPublicadas).toHaveLength(1);
    expect(mensageria.mensagensPublicadas[0]?.topico).toBe('cinebridge.equipe_composta');
  });

  it('auditoria registra TODOS os eventos com log estruturado', async () => {
    const barramento = new BarramentoEventosLocal();
    const auditoria = new ObservadorAuditoria();
    barramento.assinar(auditoria);

    barramento.publicar(new ConviteCriadoEvento('conv-9', 'eq-9', 'proj-9', 'pro-9', Papel.VFX));
    barramento.publicar(new EquipeCompostaEvento('eq-9', 'proj-9', 1, 50_000));
    await barramento.aguardarProcessamento();

    expect(auditoria.registrosAuditados).toHaveLength(2);
    for (const registro of auditoria.registrosAuditados) {
      expect(registro).toHaveProperty('timestamp');
      expect(registro).toHaveProperty('evento');
      expect(registro).toHaveProperty('carga');
    }
  });

  it('transportes externos são injetáveis (e-mail real, broker real)', async () => {
    const despachos: string[] = [];
    const publicacoes: string[] = [];
    const emailComTransporte = new ObservadorEmail(async (n) => {
      despachos.push(n.assunto);
    });
    const mensageriaComBroker = new ObservadorMensageria(async (p) => {
      publicacoes.push(p.topico);
    });
    const barramento = new BarramentoEventosLocal();
    barramento.assinar(emailComTransporte);
    barramento.assinar(mensageriaComBroker);

    barramento.publicar(new ConviteCriadoEvento('c', 'e', 'p', 'pro', Papel.SONOPLASTA));
    barramento.publicar(new EquipeCompostaEvento('e', 'p', 1, 10));
    await barramento.aguardarProcessamento();

    expect(despachos).toEqual(['Novo interesse em seu perfil — CineBridge']);
    expect(publicacoes).toEqual(['cinebridge.equipe_composta']);
  });
});

describe('Observer — eventos carregam a carga correta', () => {
  it('ConviteCriadoEvento expõe tipo e timestamp', () => {
    const evento: EventoDominio = new ConviteCriadoEvento('c1', 'e1', 'p1', 'pro1', Papel.DIRETOR);
    expect(evento.tipo).toBe('CONVITE_CRIADO');
    expect(evento.ocorridoEm).toBeInstanceOf(Date);
  });
});
