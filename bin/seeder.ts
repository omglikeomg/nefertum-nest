import 'reflect-metadata';
import { CommandFactory } from 'nest-commander';
import { CliModule } from '../apps/api/src/infrastructure/cli/cli.module';

async function bootstrap(): Promise<void> {
  await CommandFactory.run(CliModule, ['warn', 'error']);
}

bootstrap().catch((err: unknown) => {
  // eslint-disable-next-line no-console
  console.error('Seeder CLI failed to start:', err);
  process.exit(2);
});
