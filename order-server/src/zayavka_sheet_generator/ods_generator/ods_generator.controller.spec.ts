import { beforeEach, describe, expect, it } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import * as XLSX from 'xlsx';
import { CreateZayavkaDto } from '~/types';
import { XlsxGeneratorController } from './ods_generator.controller';

const dto: CreateZayavkaDto = {
  system: 'EIFS',
  materials: [
    {
      id: 1,
      title: 'Слой теплоизоляции',
      materials: [{ id: 10, title: 'Клей', volume: 520, measure: 'кг', consumption: 5.2, params: [] }],
    },
  ],
  hand_tools: [
    {
      uniqKey: 'h1',
      id: 20,
      title: 'Шпатель',
      adjusted_consumption: 2,
      params: [{ id: 1, param: '300.0000', measure: 'мм' }],
    },
  ],
  power_tools: [
    { uniqKey: 'p1', id: 30, title: 'Миксер', adjusted_consumption: 1, corded: true, params: [] },
  ],
};

async function readAll(file: ReturnType<XlsxGeneratorController['create']>) {
  const chunks: Buffer[] = [];
  for await (const chunk of file.getStream()) chunks.push(Buffer.from(chunk));
  return Buffer.concat(chunks);
}

describe('XlsxGeneratorController', () => {
  let controller: XlsxGeneratorController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [XlsxGeneratorController],
    }).compile();

    controller = module.get<XlsxGeneratorController>(XlsxGeneratorController);
  });

  it('отдаёт ods из памяти с именем в кавычках', async () => {
    const file = controller.create(dto);
    const headers = file.getHeaders();

    expect(headers.type).toBe('application/vnd.oasis.opendocument.spreadsheet');
    // Клиент ищет filename="…" — без кавычек файл скачивался как downloaded_file.xlsx.
    expect(headers.disposition).toMatch(/^attachment; filename="zayavka_\d+\.ods"$/);

    const book = XLSX.read(await readAll(file));
    const rows = XLSX.utils.sheet_to_json<unknown[]>(book.Sheets[book.SheetNames[0]], {
      header: 1,
    });
    expect(rows).toContainEqual(['Материалы и расходники']);
    expect(rows).toContainEqual([1, 'Клей', 520, 'кг']);
    expect(rows).toContainEqual([1, 'Шпатель 300мм ', 2, 'шт']);
    expect(rows).toContainEqual([1, 'Миксер  сетевой', 1, 'шт']);
  });
});
