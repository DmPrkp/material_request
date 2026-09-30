import sharp from 'sharp';

/**
 * Снимок технологии для карточки клиента (ImageText.vue): картинка рисуется в своих
 * пропорциях, без object-fit, так что у всех снимков они должны быть одинаковые, иначе
 * плитка пляшет по высоте. Отсюда обрезка под 800×390 — формат уже лежащих в
 * public/system. 800 — два плеча карточки в три колонки на ретине, больше не нужно.
 */
export const CARD = { width: 800, height: 390 } as const;

export type CompressOptions = {
  width: number;
  /** null — только уменьшить по ширине, пропорции как у исходника. */
  height: number | null;
  quality: number;
  /**
   * Что оставить при обрезке: attention — самое «заметное» (лица, контраст), centre — середину.
   * attention обычно угадывает предмет на строительном фото лучше середины.
   */
  position: 'attention' | 'centre';
};

export const DEFAULTS: CompressOptions = { ...CARD, quality: 75, position: 'attention' };

export type Compressed = { data: Buffer; width: number; height: number; size: number };

/**
 * В webp: при том же качестве на фото он в 2–4 раза легче jpeg и есть во всех браузерах,
 * где живёт клиент. rotate() без аргументов разворачивает по EXIF — снимок с телефона
 * иначе лёг бы набок; метаданные (EXIF с геометкой) sharp по умолчанию не переносит.
 * Меньше целевого размера не растягиваем: мыльный апскейл хуже честно маленькой картинки.
 */
export async function compress(input: Buffer, options: CompressOptions = DEFAULTS): Promise<Compressed> {
  const { data, info } = await sharp(input)
    .rotate()
    .resize({
      width: options.width,
      height: options.height ?? undefined,
      fit: options.height ? 'cover' : 'inside',
      position: options.position === 'attention' ? sharp.strategy.attention : 'centre',
      withoutEnlargement: true,
    })
    .webp({ quality: options.quality, effort: 6 })
    .toBuffer({ resolveWithObject: true });
  return { data, width: info.width, height: info.height, size: data.length };
}
