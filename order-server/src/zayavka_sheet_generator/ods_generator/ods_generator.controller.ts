import { Body, Controller, Post, StreamableFile } from '@nestjs/common';
import { CreateZayavkaDto, Param } from '~/types';
import * as XLSX from 'xlsx';

const TITLES = {
  MATERIALS: 'Материалы и расходники',
  HAND_TOOLS: 'Ручной инструмент',
  POWER_TOOLS: 'Электроинструмент',
};

@Controller('ods-generator')
export class XlsxGeneratorController {
  /**
   * Файл собирается в памяти и сразу уходит в ответ. Раньше он писался в ./static
   * (на проде — том с хоста), отправлялся и не удалялся: каждая выгрузка оседала на
   * диске навсегда, а сервис из-за записи в том работал под root.
   */
  @Post()
  create(@Body() createZayavkaDto: CreateZayavkaDto) {
    const fileName = `zayavka_${Date.now()}.ods`;
    return new StreamableFile(createSheet(createZayavkaDto), {
      type: 'application/vnd.oasis.opendocument.spreadsheet',
      // Имя в кавычках: клиент (BaseModel.downloadFile) ищет filename="…", и без них
      // файл скачивался как downloaded_file.xlsx.
      disposition: `attachment; filename="${fileName}"`,
    });
  }
}

function addToolsToRows<
  T extends {
    title: string;
    adjusted_consumption: number;
    corded?: boolean;
    params: Param[];
  }[],
>(tools: T, sectionTitle: string, rows: unknown[]) {
  rows.push([sectionTitle]);

  tools.forEach((tool, index) => {
    const params = tool.params.map((p) => formatParamValue(p.param) + p.measure).join(', ');
    let corded = '';

    if (typeof tool.corded === 'boolean') {
      corded = tool.corded ? 'сетевой' : 'аккумуляторный';
    }

    rows.push([index + 1, `${tool.title} ${params} ${corded}`, tool.adjusted_consumption, 'шт']);
  });
  rows.push([]);
  return rows;
}

function createSheet(data: CreateZayavkaDto): Buffer {
  let rows: any[] = [];

  // Add Materials section
  rows.push([TITLES.MATERIALS]);
  data.materials.forEach((materialDTO) => {
    rows.push([materialDTO.title]);
    materialDTO.materials.forEach((material, index) => {
      rows.push([index + 1, material.title, material.volume, material.measure]);
    });
    rows.push([]);
  });

  // Add Hand Tools section
  rows = addToolsToRows<CreateZayavkaDto['hand_tools']>(data.hand_tools, TITLES.HAND_TOOLS, rows);

  // Add Power Tools section
  rows = addToolsToRows<CreateZayavkaDto['power_tools']>(data.power_tools, TITLES.POWER_TOOLS, rows);

  // Convert the rows to a worksheet
  const worksheet = XLSX.utils.aoa_to_sheet(rows);

  worksheet['!cols'] = [
    { wch: 5 }, // Column 1: "Number"
    { wch: 100 }, // Column 2: "Title"
    { wch: 10 }, // Column 3: "Adjusted Consumption"
    { wch: 10 }, // Column 4: "Unit"
  ];

  // Create a new workbook
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Zayavka Sheet');

  return XLSX.write(workbook, { bookType: 'ods', type: 'buffer' });
}

/** Значения параметров приходят из базы строкой NUMERIC: '10.0000' -> '10'. */
function formatParamValue(raw: string): string {
  const value = Number(raw);
  return Number.isFinite(value) ? String(value) : raw;
}
