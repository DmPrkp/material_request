import { Body, Controller, Post, Res } from '@nestjs/common';
import { Response } from 'express';
import { CreateZayavkaDto, Param } from '~/types';
import * as XLSX from 'xlsx';
import * as path from 'path';
import * as fs from 'fs';

const TITLES = {
  MATERIALS: 'Материалы и расходники',
  HAND_TOOLS: 'Ручной инструмент',
  POWER_TOOLS: 'Электроинструмент',
};

@Controller('ods-generator')
export class XlsxGeneratorController {
  @Post()
  async create(
    @Body() createZayavkaDto: CreateZayavkaDto,
    @Res() res: Response,
  ) {
    const id = Date.now();
    const fileName = `zayavka_${id}.ods`;
    const filePath = path.resolve('./static', fileName);
    await createSheetFile(createZayavkaDto, filePath);
    console.log('Excel file created successfully!');

    if (!fs.existsSync(filePath)) {
      console.error('File not found:', filePath);
      return res.status(404).send('File not found');
    }

    // Set headers for file download
    res.setHeader('Content-Disposition', `attachment; filename=${fileName}`);
    res.setHeader(
      'Content-Type',
      'application/vnd.oasis.opendocument.spreadsheet',
    );

    return res.sendFile(filePath, (err) => {
      if (err) {
        console.error('Error sending the file:', err);
        res.status(500).send('Error sending the file');
      }
    });
  }
}

function addToolsToRows<
  T extends {
    ru_title: string;
    adjusted_consumption: number;
    corded?: boolean;
    params: Param[];
  }[],
>(tools: T, sectionTitle: string, rows: unknown[]) {
  rows.push([sectionTitle]);

  tools.forEach((tool, index) => {
    const params = tool.params.map((p) => p.param + p.measure).join(', ');
    let corded = '';

    if (typeof tool.corded === 'boolean') {
      corded = tool.corded ? 'сетевой' : 'аккумуляторный';
    }

    rows.push([
      index + 1,
      `${tool.ru_title} ${params} ${corded}`,
      tool.adjusted_consumption,
      'шт',
    ]);
  });
  rows.push([]);
  return rows;
}

async function createSheetFile(data: CreateZayavkaDto, outputPath: string) {
  let rows: any[] = [];

  // Add Materials section
  rows.push([TITLES.MATERIALS]);
  data.materials.forEach((materialDTO) => {
    rows.push([materialDTO.title]);
    materialDTO.materials.forEach((material, index) => {
      rows.push([
        index + 1,
        material.ru_title,
        material.volume,
        material.measure,
      ]);
    });
    rows.push([]);
  });

  // Add Hand Tools section
  rows = addToolsToRows<CreateZayavkaDto['hand_tools']>(
    data.hand_tools,
    TITLES.HAND_TOOLS,
    rows,
  );

  // Add Power Tools section
  rows = addToolsToRows<CreateZayavkaDto['power_tools']>(
    data.power_tools,
    TITLES.POWER_TOOLS,
    rows,
  );

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

  // Write the workbook to the desired output path with the ODS format
  XLSX.writeFile(workbook, outputPath, { bookType: 'ods' });
}
