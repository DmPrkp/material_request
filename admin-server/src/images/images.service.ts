import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { existsSync } from 'node:fs';
import { readdir, readFile, stat, unlink, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import sharp from 'sharp';

import { compress, type CompressOptions, DEFAULTS } from './compress';

/**
 * Снимки технологий — часть сборки клиента: файлы в ionic-client/public/system, привязки
 * «технология → файл» в ionic-client/src/constants/systems/images.json. Загрузчик пишет
 * прямо в репозиторий, поэтому живёт только в dev (compose.dev.yaml монтирует оба каталога);
 * на прод снимки едут коммитом и деплоем, как любой код клиента. Без монтирования страница
 * честно говорит, что выключена, а не пишет в никуда внутри контейнера.
 */
const DIR = process.env.SYSTEM_IMAGES_DIR;
const MAP = process.env.SYSTEM_IMAGES_MAP;
/** Адрес файла на клиенте: /system/<имя> — public/ отдаётся от корня. */
const PUBLIC_PREFIX = '/system/';

/** Имя без расширения: латиница, цифры, дефис — как у уже лежащих (metal-tile-roof). */
const NAME = /^[a-z0-9][a-z0-9-]{0,80}$/;
const FILE = /^[a-z0-9][a-z0-9._-]{0,90}\.(webp|jpe?g|png|svg|avif|gif)$/i;

export type ImageRef = { src: string; alt?: string };
export type ImageMap = Record<string, ImageRef>;
export type ImageFile = {
  name: string;
  size: number;
  width?: number;
  height?: number;
  format?: string;
  /** Технологии, которым назначен файл; пусто — лежит зря и уезжает в сборку просто так. */
  usedBy: string[];
};

@Injectable()
export class ImagesService {
  get enabled(): boolean {
    return !!DIR && !!MAP && existsSync(DIR) && existsSync(MAP);
  }

  private assertEnabled(): { dir: string; map: string } {
    if (!this.enabled) {
      throw new ConflictException(
        'Загрузчик снимков работает только в dev: каталоги клиента не смонтированы',
      );
    }
    return { dir: DIR!, map: MAP! };
  }

  async state(): Promise<{ enabled: boolean; files: ImageFile[]; map: ImageMap; defaults: CompressOptions }> {
    if (!this.enabled) return { enabled: false, files: [], map: {}, defaults: DEFAULTS };
    const { dir } = this.assertEnabled();
    const map = await this.readMap();
    const names = (await readdir(dir)).filter((name) => FILE.test(name)).sort();
    const files = await Promise.all(
      names.map(async (name): Promise<ImageFile> => {
        const path = join(dir, name);
        const [{ size }, meta] = await Promise.all([
          stat(path),
          sharp(path)
            .metadata()
            .catch(() => undefined),
        ]);
        const usedBy = Object.entries(map)
          .filter(([, ref]) => ref.src === PUBLIC_PREFIX + name)
          .map(([title]) => title);
        return { name, size, width: meta?.width, height: meta?.height, format: meta?.format, usedBy };
      }),
    );
    return { enabled: true, files, map, defaults: DEFAULTS };
  }

  async file(name: string): Promise<Buffer> {
    const { dir } = this.assertEnabled();
    if (!FILE.test(name)) throw new NotFoundException();
    try {
      return await readFile(join(dir, name));
    } catch {
      throw new NotFoundException(`Нет файла ${name}`);
    }
  }

  /** Обжать без записи — «было / стало» до того, как класть в репозиторий. */
  async preview(input: Buffer, options: CompressOptions) {
    const original = await this.inspect(input);
    const result = await compress(input, options);
    return {
      original,
      result: { width: result.width, height: result.height, size: result.size },
      dataUrl: `data:image/webp;base64,${result.data.toString('base64')}`,
    };
  }

  /**
   * Обжать, положить <name>.webp и, если передана технология, назначить его ей. Тот же
   * name перезаписывает файл — так меняют снимок, не трогая привязки. Прежний файл
   * технологии (другое имя) не удаляем: вдруг он назначен ещё кому-то; ненужный видно
   * в списке без «используется» и его удаляют отдельно.
   */
  async save(input: Buffer, options: CompressOptions, name: string, title?: string, alt?: string) {
    const { dir } = this.assertEnabled();
    if (!NAME.test(name)) throw new BadRequestException('Имя файла — строчная латиница, цифры и дефис');
    await this.inspect(input);
    const result = await compress(input, options);
    const file = `${name}.webp`;
    await writeFile(join(dir, file), result.data);
    if (title) await this.assign(title, file, alt);
    return { file, size: result.size, width: result.width, height: result.height };
  }

  /** Назначить технологии лежащий файл; null — снять снимок (карточка вернётся к иконке). */
  async assign(title: string, file: string | null, alt?: string): Promise<ImageMap> {
    const { dir } = this.assertEnabled();
    if (!title.trim()) throw new BadRequestException('Нужен код технологии');
    const map = await this.readMap();
    if (file === null) {
      delete map[title];
    } else {
      if (!FILE.test(file) || !existsSync(join(dir, file))) throw new NotFoundException(`Нет файла ${file}`);
      map[title] = {
        src: PUBLIC_PREFIX + file,
        alt: alt?.trim() || map[title]?.alt || file.replace(/\.\w+$/, ''),
      };
    }
    await this.writeMap(map);
    return map;
  }

  /** Удалить можно только ничей файл: назначенный оставил бы карточку с битой картинкой. */
  async remove(name: string): Promise<void> {
    const { dir } = this.assertEnabled();
    if (!FILE.test(name)) throw new NotFoundException();
    const map = await this.readMap();
    const users = Object.entries(map).filter(([, ref]) => ref.src === PUBLIC_PREFIX + name);
    if (users.length) {
      throw new ConflictException(`Файл назначен технологиям: ${users.map(([title]) => title).join(', ')}`);
    }
    try {
      await unlink(join(dir, name));
    } catch {
      throw new NotFoundException(`Нет файла ${name}`);
    }
  }

  /** Не картинку (pdf, битый файл) sharp не прочтёт — 400 с понятным текстом, а не 500. */
  private async inspect(input: Buffer) {
    try {
      const meta = await sharp(input).metadata();
      return { width: meta.width, height: meta.height, format: meta.format, size: input.length };
    } catch {
      throw new BadRequestException('Это не картинка или формат не поддерживается');
    }
  }

  private async readMap(): Promise<ImageMap> {
    return JSON.parse(await readFile(MAP!, 'utf8')) as ImageMap;
  }

  /** Отступ и перевод строки в конце — как у файла, написанного руками: диф в git чистый. */
  private async writeMap(map: ImageMap): Promise<void> {
    const lines = Object.entries(map).map(([title, ref]) => {
      const fields = [`"src": ${JSON.stringify(ref.src)}`];
      if (ref.alt !== undefined) fields.push(`"alt": ${JSON.stringify(ref.alt)}`);
      return `  ${JSON.stringify(title)}: { ${fields.join(', ')} }`;
    });
    await writeFile(MAP!, `{\n${lines.join(',\n')}\n}\n`);
  }
}
