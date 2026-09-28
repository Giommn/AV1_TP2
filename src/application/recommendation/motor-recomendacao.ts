import type { PapelRequerido } from '../../domain/entities/papel-requerido';
import type { Profissional } from '../../domain/entities/profissional';
import type { Projeto } from '../../domain/entities/projeto';
import type { NomeEstrategia } from '../../domain/enums/nome-estrategia';
import { perfilPadrao } from '../../domain/perfis-padrao';
import type { CandidatoRanqueado } from './candidato-ranqueado';
import type { ContextoRecomendacao } from './contexto-recomendacao';
import { PARAMETROS_PADRAO, type ParametrosRecomendacao } from './parametros-recomendacao';
import type { EstrategiaRecomendacao } from './strategies/estrategia-recomendacao';

export class MotorRecomendacao {
  private estrategia: EstrategiaRecomendacao;

  constructor(
    estrategiaInicial: EstrategiaRecomendacao,
    private readonly parametros: ParametrosRecomendacao = PARAMETROS_PADRAO,
  ) {
    this.estrategia = estrategiaInicial;
  }

  get nomeEstrategiaAtual(): NomeEstrategia {
    return this.estrategia.nome;
  }

  trocarEstrategia(novaEstrategia: EstrategiaRecomendacao): void {
    this.estrategia = novaEstrategia;
  }

  recomendar(
    papelRequerido: PapelRequerido,
    candidatos: readonly Profissional[],
    projeto: Projeto,
    equipeParcial: readonly Profissional[] = [],
  ): CandidatoRanqueado[] {
    const teto = this.tetoOrcamentalParaPapel(papelRequerido, projeto);

    const elegiveis = candidatos.filter(
      (profissional) =>
        profissional.cobraAte(teto)
        && profissional.atuaComo(papelRequerido.papel)
        && profissional.estaDisponivelEm(projeto.periodoFiltragens),
    );

    const contexto: ContextoRecomendacao = {
      projeto,
      perfilDesejado: papelRequerido.perfilDesejado ?? perfilPadrao(papelRequerido.papel),
      tetoOrcamentalPapel: teto,
      parametros: this.parametros,
      equipeParcial,
    };

    return this.estrategia.ranquear(elegiveis, contexto).slice(0, this.parametros.tamanhoTop);
  }

  tetoOrcamentalParaPapel(papelRequerido: PapelRequerido, projeto: Projeto): number {
    const somaPesos = projeto.somaPesosPapeis;
    if (somaPesos <= 0) {
      return 0;
    }
    const orcamentoEquipe = projeto.orcamentoTotal * this.parametros.fracaoOrcamentoEquipe;
    return orcamentoEquipe * (papelRequerido.peso / somaPesos);
  }
}
