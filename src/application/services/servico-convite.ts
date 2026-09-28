import { ConviteAceitoEvento, ConviteRecusadoEvento } from '../../domain/events/eventos';
import type { BarramentoEventos } from '../../domain/ports/barramento-eventos';
import type { RepositorioConvites } from '../../domain/ports/repositorios';
import { ErroNaoEncontrado, ErroNegocio } from '../erros';
import { StatusConvite } from '../../domain/enums/status-convite';

export class ServicoConvite {
  constructor(
    private readonly repositorioConvites: RepositorioConvites,
    private readonly barramento: BarramentoEventos,
  ) {}

  async responder(conviteId: string, aceito: boolean): Promise<{ status: StatusConvite }> {
    const convite = await this.repositorioConvites.buscarPorId(conviteId);
    if (convite === null) {
      throw new ErroNaoEncontrado(`Convite ${conviteId} não encontrado.`);
    }
    if (convite.status !== StatusConvite.PENDENTE) {
      throw new ErroNegocio(`Convite ${conviteId} já foi respondido (${convite.status}).`);
    }

    if (aceito) {
      convite.aceitar();
    } else {
      convite.recusar();
    }
    await this.repositorioConvites.atualizar(convite);

    this.barramento.publicar(
      aceito
        ? new ConviteAceitoEvento(convite.id, convite.equipeId, convite.profissionalId, convite.papel)
        : new ConviteRecusadoEvento(convite.id, convite.equipeId, convite.profissionalId, convite.papel),
    );

    return { status: convite.status };
  }
}
