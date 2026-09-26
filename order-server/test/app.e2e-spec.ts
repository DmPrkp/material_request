import { type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { AppModule } from '~/app.module';
import { DB, PG_POOL } from '~/db/db.module';

/** Приложение целиком, но без базы: проверяются маршруты, пайпы и гварды, не SQL. */
describe('order-server (e2e)', () => {
  let app: INestApplication;
  const db = {
    select: vi.fn(() => ({ from: () => ({ where: () => ({ orderBy: () => Promise.resolve([]) }) }) })),
    delete: vi.fn(() => ({ where: () => ({ returning: () => Promise.resolve([]) }) })),
  };

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(PG_POOL)
      .useValue({ end: () => Promise.resolve() })
      .overrideProvider(DB)
      .useValue(db)
      .compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('order/api/v1');
    await app.init();
  });

  afterEach(() => app.close());

  it('GET /zayavka без входа — 401: список только свой', async () => {
    await request(app.getHttpServer()).get('/order/api/v1/zayavka').expect(401);
  });

  it('GET /zayavka со входом — свои', async () => {
    const res = await request(app.getHttpServer())
      .get('/order/api/v1/zayavka')
      .set('X-User-Id', '7')
      .set('X-User-Role', 'USER')
      .expect(200);
    expect(res.body).toEqual([]);
  });
});
