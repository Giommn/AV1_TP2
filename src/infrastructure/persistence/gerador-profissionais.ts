import { Profissional } from '../../domain/entities/profissional';
import { Papel } from '../../domain/enums/papel';
import { VetorCompetencias } from '../../domain/value-objects/vetor-competencias';
import { Localizacao } from '../../domain/value-objects/localizacao';
import { IntervaloDatas } from '../../domain/value-objects/intervalo-datas';
import { perfilPadrao } from '../../domain/perfis-padrao';

const CIDADES: ReadonlyArray<[string, string]> = [
  ['São Paulo', 'SP'],
  ['Rio de Janeiro', 'RJ'],
  ['Belo Horizonte', 'MG'],
  ['Curitiba', 'PR'],
  ['Recife', 'PE'],
  ['Porto Alegre', 'RS'],
];

const PRENOMES = ['Ana', 'Bruno', 'Carla', 'Diego', 'Elena', 'Fabio', 'Gabi', 'Hugo', 'Ines', 'Joao'];
const SOBRENOMES = ['Alves', 'Braga', 'Costa', 'Duarte', 'Esteves', 'Freitas', 'Gomes', 'Harada'];

function mulberry32(semente: number): () => number {
  let estado = semente;
  return () => {
    estado += 0x6d2b79f5;
    let t = estado;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function vetorAoRedor(perfil: VetorCompetencias, aleatorio: () => number): VetorCompetencias {
  const niveis: Record<string, number> = {};
  for (const dimensao of perfil.dimensoes()) {
    const variacao = (aleatorio() - 0.5) * 0.6;
    niveis[dimensao] = Math.min(1, Math.max(0, perfil.nivelDe(dimensao) + variacao));
  }
  if (aleatorio() < 0.3) {
    niveis['narrativa'] = Math.round(aleatorio() * 100) / 100;
  }
  return VetorCompetencias.criar(niveis);
}

export function gerarProfissionais(quantidade = 200, semente = 42): Profissional[] {
  const aleatorio = mulberry32(semente);
  const papeis = Object.values(Papel);
  const profissionais: Profissional[] = [];

  for (let i = 0; i < quantidade; i += 1) {
    const papel = papeis[i % papeis.length] ?? Papel.EDITOR;
    const [cidade, uf] = CIDADES[Math.floor(aleatorio() * CIDADES.length)] ?? CIDADES[0]!;
    const precoMinimo = Math.floor(10_000 + aleatorio() * 190_000);
    const precoMaximo = precoMinimo + Math.floor(aleatorio() * 60_000);
    const fimJanela = aleatorio() < 0.85 ? '2026-12-31' : '2026-10-31';

    profissionais.push(
      new Profissional({
        id: `prof-${i + 1}`,
        nome: `${PRENOMES[i % PRENOMES.length]} ${SOBRENOMES[Math.floor(aleatorio() * SOBRENOMES.length)]}`,
        papeis: [papel],
        competencias: vetorAoRedor(perfilPadrao(papel), aleatorio),
        precoMinimo,
        precoMaximo,
        disponibilidade: [new IntervaloDatas(new Date('2026-01-01'), new Date(fimJanela))],
        localizacao: new Localizacao(cidade, uf, 'Brasil'),
        mediaAvaliacoes: Math.round((3 + aleatorio() * 2) * 10) / 10,
        totalAvaliacoes: Math.floor(aleatorio() * 200),
      }),
    );
  }
  return profissionais;
}
