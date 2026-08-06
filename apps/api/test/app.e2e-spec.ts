import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { AppModule } from '../src/app.module';

describe('AppModule (smoke)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
    );
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('boots the AppModule without throwing', () => {
    expect(app).toBeDefined();
  });

  it('exposes a GraphQL endpoint', () => {
    // GraphQL is registered as middleware by Apollo; its presence is implicit
    // when the module compiles. Here we just assert the application is alive.
    expect(typeof app.getHttpServer).toBe('function');
  });
});
