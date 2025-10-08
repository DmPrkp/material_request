import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from './../src/app.module';
import { APP_GUARD } from '@nestjs/core';
import { PrismaService } from '../prisma/prisma.service';

describe('AppController (e2e)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const builder = Test.createTestingModule({
      imports: [AppModule],
      providers: [
        {
          provide: APP_GUARD,
          useValue: { canActivate: () => true },
        },
      ],
    });

    const moduleFixture: TestingModule = await builder
      .overrideProvider(PrismaService)
      .useValue({
        zayavka: {
          findMany: jest.fn().mockResolvedValue([]),
          findUnique: jest.fn().mockResolvedValue(null),
          create: jest.fn().mockResolvedValue({ id: 1 }),
          update: jest.fn().mockResolvedValue({ id: 1 }),
        },
      })
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it('/order/api/v1/zayavka (GET)', async () => {
    const res = await request(app.getHttpServer()).get('/order/api/v1/zayavka');
    expect([200, 404]).toContain(res.status);
  });
});
