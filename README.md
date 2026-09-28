# CineBridge — Microsserviço de Recomendação e Orquestração de Equipes

Microsserviço da plataforma **CineBridge** para a indústria audiovisual independente. O sistema é responsável por interpretar especificações técnicas de um projeto audiovisual, analisar o perfil de profissionais cadastrados e compor automaticamente equipes técnicas equilibradas, enviando notificações assíncronas e permitindo substituições dinâmicas.

---

## 🏛️ Padrões de Projeto Aplicados

A arquitetura do microsserviço foi desenhada em camadas, com inversão de dependência e aplicação consciente de 4 padrões de projeto GoF:

1. **Strategy** (`src/application/recommendation/strategies/`):
   - Encapsula algoritmos de recomendação trocáveis em tempo de execução:
     - `SIMILARIDADE_COSSENO`: calcula produto escalar sobre o vetor de competências técnicas.
     - `FILTRAGEM_COLABORATIVA`: combina nota histórica (suavização bayesiana) e afinidade com a equipe parcial.
     - `ORCAMENTO_REDUZIDO`: prioriza adequação de custo financeiro para projetos de baixo orçamento.
   - A escolha da estratégia é resolvida dinamicamente pela `FabricaEstrategias`.

2. **Template Method** (`src/application/orchestration/`):
   - A classe abstrata `OrquestradorComposicaoEquipe` define o método-template invariável `comporEquipe()`.
   - Subclasses concretas adaptam passos específicos conforme o tipo de captação:
     - `OrquestradorEquipeFiccao`: bônus de score para competência narrativa.
     - `OrquestradorEquipeDocumentario`: estende período de captação e aplica reserva de emergência orçamentária.
     - `OrquestradorEquipeAnimacao`: força localização remota e exige especialista em VFX.

3. **Observer** (`src/infrastructure/events/` e `src/infrastructure/observers/`):
   - Barramento de eventos desacoplado (`BarramentoEventosLocal`) utilizando o `EventEmitter` do Node.js, estruturado para futura substituição por filas como RabbitMQ.
   - Observadores independentes:
     - `ObservadorEmail`: notificações de interesse e resposta aos convites.
     - `ObservadorMensageria`: publicação em tópicos para microsserviços parceiros (gestão de projetos, financeiro).
     - `ObservadorAuditoria`: logs estruturados em JSON para auditoria.
     - `ObservadorAtualizacaoEquipe`: atualiza o status da composição e dispara o evento final de equipe formada.

4. **Visitor** (`src/domain/visitors/` e `src/application/visitors/`):
   - Operações transversais executadas sobre a árvore de dados `Projeto` / `Equipe` sem modificar as entidades de domínio:
     - `ValidadorConsistenciaProjeto`: verifica orçamento, cronograma e preenchimento dos papéis.
     - `CalculadorCompatibilidadeEquipe`: calcula métricas agregadas de aderência e afinidade entre membros.
     - `GeradorRelatorioProdutor`: gera relatório gerencial formatado para o produtor.

---

## 💻 Requisitos do Sistema

- **Node.js**: `v20.x` LTS ou superior.
- **Sistema Operacional**: Compatível com Windows 10+, Linux Ubuntu 24.04.03 LTS e distribuições derivadas.
- **TypeScript**: Execução em modo estrito (`"strict": true`).

---

## 🚀 Como Executar o Projeto

### 1. Instalação das Dependências
```bash
npm install
```

### 2. Executar em Modo Desenvolvimento (Servidor HTTP na porta 3000)
```bash
npm run dev
```

### 3. Verificar Tipagem TypeScript (Strict Check)
```bash
npm run typecheck
```

### 4. Executar a Suíte de Testes
```bash
npm test
```

### 5. Gerar Relatório de Cobertura de Testes (> 90% de cobertura)
```bash
npm run coverage
```

---

## 📡 Endpoints da API REST (Fastify)

### 1. Teste de Saúde
- **GET** `/saude`
- **Resposta**: `{ "status": "ok" }`

### 2. Recomendação de Equipe
- **POST** `/recomendacoes/equipe`
- **Exemplo de Payload**:
```json
{
  "id": "proj-001",
  "genero": "Drama",
  "duracaoEstimadaMinutos": 120,
  "orcamentoTotal": 2000000,
  "dataEntrega": "2027-12-31",
  "tipoCaptacao": "FICCAO",
  "localizacao": {
    "cidade": "São Paulo",
    "uf": "SP"
  },
  "periodoFiltragens": {
    "inicio": "2027-01-10",
    "fim": "2027-03-30"
  },
  "papeis": [
    { "papel": "DIRETOR", "peso": 5 },
    { "papel": "DIRETOR_FOTOGRAFIA", "peso": 4 },
    { "papel": "SONOPLASTA", "peso": 3 },
    { "papel": "EDITOR", "peso": 3 },
    { "papel": "ROTEIRISTA", "peso": 4 },
    { "papel": "VFX", "peso": 2 }
  ]
}
```

### 3. Reavaliação Completa de Equipe
- **POST** `/recomendacoes/reavaliacao`
- Reavalia e re-seleciona a melhor estratégia com base em alterações de orçamento/cronograma.

### 4. Responder Convite
- **POST** `/convites/:conviteId/resposta`
- **Payload**:
```json
{
  "aceito": true
}
```

### 5. Substituição de Membro em Papel Específico
- **POST** `/equipes/:equipeId/substituicao`
- **Payload**:
```json
{
  "papel": "DIRETOR_FOTOGRAFIA"
}
```

---

## 🗄️ Persistência de Dados (Prisma / PostgreSQL)

Por padrão, o projeto roda com repositórios em memória otimizados para alto desempenho e testes. Caso deseje conectar a um banco de dados PostgreSQL real via Prisma:

1. Configure a variável de ambiente no arquivo `.env`:
```env
DATABASE_URL="postgresql://usuario:senha@localhost:5432/cinebridge?schema=public"
```
2. Gere o cliente Prisma e execute as migrações:
```bash
npm run prisma:generate
npm run prisma:migrate
```

---

## 📐 Diagrama de Classes UML

O diagrama de classes completo contemplando os 4 padrões de projeto está disponível em:
[`docs/diagrama-classes.puml`](file:///home/pinguim/Documents/AV1_TP2/docs/diagrama-classes.puml)
