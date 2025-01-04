import { Body, Controller, Post, Res } from '@nestjs/common';
import { Response } from 'express';
import { CreateZayavkaDto } from '~/types';
import * as XLSX from 'xlsx';
import * as path from 'path';
import * as fs from 'fs';

@Controller('xlsx-generator')
export class XlsxGeneratorController {
  @Post()
  async create(
    @Body() createZayavkaDto: CreateZayavkaDto,
    @Res() res: Response,
  ) {
    const id = Date.now();
    const fileName = `zayavka_${id}.xlsx`;
    const filePath = path.resolve('./static', fileName);
    await createExcelFile(createZayavkaDto, filePath);
    console.log('Excel file created successfully!');

    if (!fs.existsSync(filePath)) {
      console.error('File not found:', filePath);
      return res.status(404).send('File not found');
    }

    // Set headers for file download
    res.setHeader('Content-Disposition', `attachment; filename=${fileName}`);
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );

    return res.sendFile(filePath, (err) => {
      if (err) {
        console.error('Error sending the file:', err);
        res.status(500).send('Error sending the file');
      }
    });
  }
}

async function createExcelFile(data: CreateZayavkaDto, outputPath: string) {
  // Prepare rows for the Excel sheet
  const rows: any[][] = [];
  let number = 1; // Counter for the `number` column

  // Add Hand Tools section
  rows.push(['Hand Tools']); // Section header
  rows.push(['Number', 'Title', 'Adjusted Consumption']); // Column headers
  data.hand_tools.forEach((tool) => {
    rows.push([number++, tool.title, tool.adjusted_consumption]);
  });

  // Add Power Tools section
  rows.push([]); // Empty row for spacing
  rows.push(['Power Tools']); // Section header
  rows.push(['Number', 'Title', 'Adjusted Consumption']); // Column headers
  data.power_tools.forEach((tool) => {
    rows.push([number++, tool.title, tool.adjusted_consumption]);
  });

  // Add Materials section
  rows.push([]); // Empty row for spacing
  rows.push(['Materials']); // Section header
  data.materials.forEach((materialDTO) => {
    rows.push([`Category: ${materialDTO.title}`]); // Subsection header
    rows.push(['Number', 'Title', 'Adjusted Consumption']); // Column headers
    materialDTO.materials.forEach((material) => {
      rows.push([number++, material.title, material.consumption]);
    });
  });

  // Convert the rows into a sheet
  const sheet = XLSX.utils.aoa_to_sheet(rows);

  // Create a new workbook and append the sheet
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, 'Data');

  // Write the workbook to a file
  XLSX.writeFile(workbook, outputPath);
}
