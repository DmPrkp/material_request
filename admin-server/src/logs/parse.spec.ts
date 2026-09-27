import { describe, expect, it } from 'vitest';

import { newestFirst, parseLog, serviceOf } from './parse';

describe('parseLog', () => {
  it('сервис: заголовок, контекст запроса и стек с отступом', () => {
    const text = [
      '2026-09-26T10:00:00.000Z ERROR order-server GET /order/api/v1/zayavka/5 relation "zayavki" does not exist',
      '    at Parser.parseErrorMessage (/usr/order-server/node_modules/pg-protocol/dist/parser.js:285:98)',
      '    at process.processTicksAndRejections (node:internal/process/task_queues:95:5)',
      '2026-09-26T10:05:00.000Z ERROR order-server migrate миграция 0001 изменилась после применения',
      '',
    ].join('\n');

    const [first, second] = parseLog('order-server.log', text);

    expect(first).toMatchObject({
      id: 'order-server.log:1',
      service: 'order-server',
      level: 'error',
      at: '2026-09-26T10:00:00.000Z',
      context: 'GET /order/api/v1/zayavka/5',
      message: 'relation "zayavki" does not exist',
    });
    expect(first.stack.split('\n')).toHaveLength(2);
    expect(first.stack).toMatch(/^at Parser/);
    expect(second).toMatchObject({
      context: 'migrate',
      message: 'миграция 0001 изменилась после применения',
      stack: '',
    });
  });

  it('сервис: контекст с пробелом и многострочное сообщение без отступа', () => {
    const text = [
      '2026-09-26T10:00:00.000Z ERROR dictionary-server вне запроса что-то сломалось',
      'вторая строка сообщения',
      '    at x',
    ].join('\n');

    const [entry] = parseLog('dictionary-server.log', text);

    expect(entry).toMatchObject({
      context: 'вне запроса',
      message: 'что-то сломалось\nвторая строка сообщения',
      stack: 'at x',
    });
  });

  it('nginx: время в ISO, запрос — контекст, pid и номер соединения отрезаны', () => {
    const text =
      '2026/09/23 19:41:28 [error] 31#31: *951 connect() failed (111: Connection refused) while connecting to upstream, ' +
      'client: 192.168.65.1, server: , request: "POST /user/api/v1/auth/login HTTP/1.1", upstream: "http://172.18.0.9:4200"';

    const [entry] = parseLog('nginx.log', text);

    expect(entry).toMatchObject({
      service: 'nginx',
      at: '2026-09-23T19:41:28.000Z',
      level: 'error',
      context: 'POST /user/api/v1/auth/login',
    });
    expect(entry.message).toMatch(/^connect\(\) failed/);
  });

  it('обрывок стека в начале файла после ротации — пропускается', () => {
    expect(parseLog('order-server.log', '    at orphan\n')).toEqual([]);
  });

  it('новые сверху, при равном времени — ниже в файле новее', () => {
    const text = [
      '2026-09-26T10:00:00.000Z ERROR a-server bootstrap раз',
      '2026-09-26T12:00:00.000Z ERROR a-server bootstrap два',
      '2026-09-26T12:00:00.000Z ERROR a-server bootstrap три',
    ].join('\n');

    expect(
      parseLog('a-server.log', text)
        .sort(newestFirst)
        .map((e) => e.message),
    ).toEqual(['три', 'два', 'раз']);
  });

  it('сервис из имени файла, в том числе ротированного', () => {
    expect(serviceOf('order-server.log')).toBe('order-server');
    expect(serviceOf('order-server.log.1')).toBe('order-server');
  });
});
