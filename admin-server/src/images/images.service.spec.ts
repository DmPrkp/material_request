import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import sharp from 'sharp';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { compress } from './compress';

/** Фото 1600×1200 с деталью в углу — чтобы обрезке было что выбирать. */
const photo = () =>
  sharp({ create: { width: 1600, height: 1200, channels: 3, background: '#c8b89a' } })
    .jpeg({ quality: 95 })
    .toBuffer();

describe('compress', () => {
  it('режет под карточку 800×390 и отдаёт webp легче исходника', async () => {
    const input = await photo();
    const result = await compress(input);
    const meta = await sharp(result.data).metadata();
    expect(meta).toMatchObject({ format: 'webp', width: 800, height: 390 });
    expect(result.size).toBeLessThan(input.length);
  });

  it('без высоты — только уменьшает, пропорции исходника; маленькое не растягивает', async () => {
    const wide = await compress(await photo(), { width: 800, height: null, quality: 75, position: 'centre' });
    expect([wide.width, wide.height]).toEqual([800, 600]);
    const small = await compress(
      await sharp(await photo())
        .resize(300)
        .toBuffer(),
    );
    expect(small.width).toBeLessThanOrEqual(300);
  });
});

describe('ImagesService', () => {
  let dir: string;
  let map: string;

  // Каталоги читаются при загрузке модуля — как из env в контейнере, поэтому импорт после stubEnv.
  async function service() {
    vi.resetModules();
    vi.stubEnv('SYSTEM_IMAGES_DIR', dir);
    vi.stubEnv('SYSTEM_IMAGES_MAP', map);
    const { ImagesService } = await import('./images.service');
    return new ImagesService();
  }

  beforeEach(async () => {
    const root = await mkdtemp(join(tmpdir(), 'images-'));
    dir = join(root, 'system');
    map = join(root, 'images.json');
    await import('node:fs/promises').then((fs) => fs.mkdir(dir));
    await writeFile(map, '{\n  "EIFS": { "src": "/system/old.webp", "alt": "wet-facade" }\n}\n');
    await writeFile(
      join(dir, 'old.webp'),
      await sharp(await photo())
        .webp()
        .toBuffer(),
    );
  });

  it('сохраняет обжатый webp, назначает технологии и пишет images.json в том же виде', async () => {
    const images = await service();

    const saved = await images.save(
      await photo(),
      { width: 800, height: 390, quality: 75, position: 'attention' },
      'new-photo',
      'GKL_C112',
      'drywall',
    );

    expect(saved).toMatchObject({ file: 'new-photo.webp', width: 800, height: 390 });
    expect(await readFile(map, 'utf8')).toBe(
      '{\n' +
        '  "EIFS": { "src": "/system/old.webp", "alt": "wet-facade" },\n' +
        '  "GKL_C112": { "src": "/system/new-photo.webp", "alt": "drywall" }\n' +
        '}\n',
    );
    const state = await images.state();
    expect(state.files.find((f) => f.name === 'new-photo.webp')).toMatchObject({
      usedBy: ['GKL_C112'],
      format: 'webp',
    });
  });

  it('назначенный файл не удалить — 409; снятый с технологии — можно', async () => {
    const images = await service();
    await expect(images.remove('old.webp')).rejects.toMatchObject({ status: 409 });
    await images.assign('EIFS', null);
    await images.remove('old.webp');
    expect((await images.state()).files).toEqual([]);
  });

  it('кривое имя, чужой путь и не картинка — отказ', async () => {
    const images = await service();
    const options = { width: 800, height: 390, quality: 75, position: 'attention' as const };
    await expect(images.save(await photo(), options, '../evil')).rejects.toMatchObject({ status: 400 });
    await expect(images.save(Buffer.from('not an image'), options, 'ok')).rejects.toMatchObject({
      status: 400,
    });
    await expect(images.file('../images.json')).rejects.toMatchObject({ status: 404 });
    await expect(images.assign('EIFS', 'missing.webp')).rejects.toMatchObject({ status: 404 });
  });

  it('без смонтированных каталогов — выключен и честно об этом говорит', async () => {
    dir = '/nonexistent';
    const images = await service();
    expect(await images.state()).toMatchObject({ enabled: false, files: [] });
    await expect(images.assign('EIFS', null)).rejects.toMatchObject({ status: 409 });
  });
});
