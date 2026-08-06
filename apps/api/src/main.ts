import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  await app.listen(3000);
  // eslint-disable-next-line no-console
  console.log(`Nefertum API listening on http://localhost:3000`);
  // eslint-disable-next-line no-console
  console.log(`GraphQL endpoint: http://localhost:3000/graphql`);
}
bootstrap();
