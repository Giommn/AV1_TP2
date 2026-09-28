import { montarContainer } from './composition/container';

async function main(): Promise<void> {
  const container = montarContainer();
  const app = container.construirApp();

  const porta = Number(process.env['PORT'] ?? 3000);
  await app.listen({ port: porta, host: '0.0.0.0' });
  console.log(`CineBridge — recomendação de equipes ouvindo na porta ${porta}`);

  const encerrar = async (): Promise<void> => {
    await container.barramento.aguardarProcessamento();
    await app.close();
    process.exit(0);
  };
  process.on('SIGINT', () => void encerrar());
  process.on('SIGTERM', () => void encerrar());
}

void main();
