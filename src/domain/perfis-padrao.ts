import { Papel } from './enums/papel';
import { VetorCompetencias } from './value-objects/vetor-competencias';

const PERFIS_PADRAO: Record<Papel, Record<string, number>> = {
  [Papel.DIRETOR]: {
    direcao: 1, narrativa: 0.9, lideranca: 0.8, roteiro: 0.6, edicao: 0.4, fotografia: 0.3, som: 0.2, vfx: 0.2,
  },
  [Papel.DIRETOR_FOTOGRAFIA]: {
    fotografia: 1, iluminacao: 0.9, camera: 0.9, cor: 0.6, direcao: 0.3,
  },
  [Papel.SONOPLASTA]: {
    som: 1, captacao_audio: 0.9, mixagem: 0.8, edicao_som: 0.7,
  },
  [Papel.EDITOR]: {
    edicao: 1, montagem: 0.9, ritmo: 0.8, cor: 0.5,
  },
  [Papel.ROTEIRISTA]: {
    roteiro: 1, dramaturgia: 0.9, narrativa: 0.9, dialogo: 0.8,
  },
  [Papel.VFX]: {
    vfx: 1, composicao: 0.9, modelagem_3d: 0.7, motion: 0.6,
  },
};

export function perfilPadrao(papel: Papel): VetorCompetencias {
  return VetorCompetencias.criar({ ...PERFIS_PADRAO[papel] });
}
