import { afterEach, describe, expect, it, vi } from 'vitest';

import { aiConfigFromEnv } from './config';
import { ServiceClient } from './service-client';

describe('ServiceClient', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('идёт от имени пользователя и разбирает JSON', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('{"a":1}', { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    const client = new ServiceClient(aiConfigFromEnv({ ORDER_URL: 'http://o/order/api/v1/' }));
    const result = await client.request({ id: 3, role: 'ADMIN' }, 'order', 'PUT', '/zayavka/1', { x: 1 });

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('http://o/order/api/v1/zayavka/1');
    expect(init.headers).toMatchObject({ 'x-user-id': '3', 'x-user-role': 'ADMIN' });
    expect(result).toEqual({ ok: true, status: 200, body: { a: 1 } });
  });
});
