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

async function createSheetFile(data: CreateZayavkaDto, outputPath: string) {
  // Initialize an array to hold the rows
  let rows: any[] = [];

  // Helper function to add rows for hand tools or power tools
  function addToolsToRows(tools: any[], sectionTitle: string) {
    rows.push([sectionTitle]); // Section title as a row
    tools.forEach((tool, index) => {
      rows.push([
        index + 1, // Incremented number
        tool.title,
        tool.adjusted_consumption,
      ]);
    });
    rows.push([]); // Empty row for separation
  }

  // Add Hand Tools section
  addToolsToRows(data.hand_tools, 'Hand Tools');

  // Add Power Tools section
  addToolsToRows(data.power_tools, 'Power Tools');

  // Add Materials section
  rows.push(['Materials']); // Section title for Materials
  data.materials.forEach((materialDTO) => {
    rows.push([materialDTO.title]); // Material title as section title
    materialDTO.materials.forEach((material, index) => {
      rows.push([
        index + 1, // Incremented number
        material.title,
        material.volume,
      ]);
    });
    rows.push([]); // Empty row for separation
  });

  // Convert the rows to a worksheet
  const worksheet = XLSX.utils.aoa_to_sheet(rows);

  // Create a new workbook
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Zayavka Data');

  // Write the workbook to the desired output path with the ODS format
  XLSX.writeFile(workbook, outputPath, { bookType: 'ods' });
}
