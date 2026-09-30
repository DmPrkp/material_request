import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
  Put,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';

import { type CompressOptions, DEFAULTS } from './compress';
import { ImagesService } from './images.service';

/** Снимок с телефона — 5–15 МБ; больше — скорее не тот файл. */
const MAX_UPLOAD = 30 * 1024 * 1024;
const upload = FileInterceptor('file', { limits: { fileSize: MAX_UPLOAD } });

type OptionsBody = Partial<Record<'width' | 'height' | 'quality' | 'position', string>>;

/** Поля multipart приходят строками; всё вне разумного — к умолчаниям, а не в sharp. */
function parseOptions(body: OptionsBody): CompressOptions {
  const int = (raw: string | undefined, min: number, max: number) => {
    const value = Number(raw);
    return Number.isInteger(value) && value >= min && value <= max ? value : undefined;
  };
  return {
    width: int(body.width, 16, 4000) ?? DEFAULTS.width,
    // «0» — без обрезки: только уменьшить по ширине.
    height: body.height === '0' ? null : (int(body.height, 16, 4000) ?? DEFAULTS.height),
    quality: int(body.quality, 1, 100) ?? DEFAULTS.quality,
    position: body.position === 'centre' ? 'centre' : 'attention',
  };
}

function requireFile(file: Express.Multer.File | undefined): Buffer {
  if (!file?.buffer?.length) throw new BadRequestException('Нет файла');
  return file.buffer;
}

@Controller('images')
export class ImagesController {
  constructor(private readonly images: ImagesService) {}

  @Get()
  state() {
    return this.images.state();
  }

  /** Картинка как есть — для миниатюр в списке (img с токеном не ходит, клиент тянет fetch-ем). */
  @Get('files/:name')
  async file(@Param('name') name: string, @Res() response: Response) {
    const data = await this.images.file(name);
    response.type(name.split('.').pop() ?? 'bin').send(data);
  }

  @Post('preview')
  @HttpCode(200)
  @UseInterceptors(upload)
  preview(@UploadedFile() file: Express.Multer.File | undefined, @Body() body: OptionsBody) {
    return this.images.preview(requireFile(file), parseOptions(body));
  }

  @Post()
  @UseInterceptors(upload)
  save(
    @UploadedFile() file: Express.Multer.File | undefined,
    @Body() body: OptionsBody & { name?: string; title?: string; alt?: string },
  ) {
    return this.images.save(
      requireFile(file),
      parseOptions(body),
      body.name ?? '',
      body.title || undefined,
      body.alt,
    );
  }

  /** Назначить технологии лежащий файл или снять ({ file: null }). */
  @Put('map/:title')
  assign(@Param('title') title: string, @Body() body: { file?: string | null; alt?: string }) {
    return this.images.assign(title, body.file ?? null, body.alt);
  }

  @Delete('files/:name')
  @HttpCode(204)
  remove(@Param('name') name: string) {
    return this.images.remove(name);
  }
}
