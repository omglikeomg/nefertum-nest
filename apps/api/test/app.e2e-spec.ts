import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';

describe('AppModule (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('boots the AppModule without throwing', () => {
    expect(app).toBeDefined();
  });

  it('responds to a GraphQL introspection query', async () => {
    const response = await request(app.getHttpServer())
      .post('/graphql')
      .send({ query: '{ __typename }' })
      .expect(200);

    expect(response.body.data).toEqual({ __typename: 'Query' });
  });

  it('exposes the Query type with registered resolvers', async () => {
    const response = await request(app.getHttpServer())
      .post('/graphql')
      .send({
        query: `{
          __schema { queryType { name fields { name } } }
        }`,
      })
      .expect(200);

    const fieldNames = response.body.data.__schema.queryType.fields.map(
      (f: { name: string }) => f.name,
    );
    expect(fieldNames).toContain('perfume');
  });
});
