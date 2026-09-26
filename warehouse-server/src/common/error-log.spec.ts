import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

/**
 * Писатель кэширует каталог на первом обращении (`LOG_DIR` читается один раз), поэтому
 * каждому тесту нужен свежий модуль — иначе второй тест писал бы в каталог первого.
 */
async function freshLogger(dir?: string) {
  vi.resetModules();
  if (dir) process.env.LOG_DIR = dir;
  else delete process.env.LOG_DIR;
  return import('./error-log');
}

describe('error-log', () => {
  let dir: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'error-log-'));
    // Запись дублируется в stderr — в выводе тестов она только мешает.
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
    delete process.env.LOG_DIR;
    vi.restoreAllMocks();
  });

  it('без LOG_DIR не пишет файлов и не падает', async () => {
    const { logError } = await freshLogger();

    expect(() => logError('GET /warehouse/api/v1/warehouses', new Error('лопнуло'))).not.toThrow();
    expect(readdirSync(dir)).toEqual([]);
  });

  it('пишет заголовок одной строкой, а стек с отступом', async () => {
    const { logError } = await freshLogger(dir);

    logError('GET /warehouse/api/v1/warehouses', new Error('relation "warehouses" does not exist'));

    const lines = readFileSync(join(dir, 'warehouse-server.log'), 'utf8').split('\n').slice(0, -1);
    expect(lines[0]).toMatch(
      /^\d{4}-\d{2}-\d{2}T[\d:.]+Z ERROR warehouse-server GET \/warehouse\/api\/v1\/warehouses relation "warehouses" does not exist$/,
    );
    // Остальное — стек: по отступу его отличает и grep, и человек.
    expect(lines.length).toBeGreaterThan(1);
    expect(lines.slice(1).every((line) => line.startsWith('    '))).toBe(true);
  });

  it('дописывает вторую ошибку, а не перезаписывает файл', async () => {
    const { logError } = await freshLogger(dir);

    logError('GET /a', new Error('первая'));
    logError('GET /b', new Error('вторая'));

    const written = readFileSync(join(dir, 'warehouse-server.log'), 'utf8');
    expect(written).toContain('первая');
    expect(written).toContain('вторая');
  });

  it('переросший файл уводит в .1 и начинает заново', async () => {
    const { logError } = await freshLogger(dir);
    const file = join(dir, 'warehouse-server.log');
    writeFileSync(file, 'x'.repeat(5 * 1024 * 1024));

    logError('GET /c', new Error('после ротации'));

    expect(readFileSync(file, 'utf8')).toContain('после ротации');
    expect(readFileSync(`${file}.1`, 'utf8').startsWith('xxx')).toBe(true);
  });

  it('второй оборот ротации затирает прежний .1, старых файлов не копит', async () => {
    const { logError } = await freshLogger(dir);
    const file = join(dir, 'warehouse-server.log');

    writeFileSync(file, 'x'.repeat(5 * 1024 * 1024));
    logError('GET /d', new Error('первый оборот'));
    writeFileSync(file, 'y'.repeat(5 * 1024 * 1024));
    logError('GET /e', new Error('второй оборот'));

    expect(readFileSync(`${file}.1`, 'utf8').startsWith('yyy')).toBe(true);
    expect(existsSync(`${file}.2`)).toBe(false);
    expect(readdirSync(dir).sort()).toEqual(['warehouse-server.log', 'warehouse-server.log.1']);
  });

  it('недоступный каталог не роняет вызывающий код', async () => {
    // Файл вместо каталога: mkdirSync на нём падает — так же ведёт себя каталог без прав.
    const busy = join(dir, 'занято');
    writeFileSync(busy, '');
    const { logError } = await freshLogger(busy);

    expect(() => logError('GET /f', new Error('лопнуло'))).not.toThrow();
  });
});
