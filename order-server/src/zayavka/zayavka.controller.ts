import { Controller, Post, Body, Get, Param, Put } from '@nestjs/common';
import { ZayavkaService } from './zayavka.service';
import { CreateZayavkaDto } from '../types/index';

@Controller('zayavka')
export class ZayavkaController {
  constructor(private readonly zayavkaService: ZayavkaService) {}

  @Post()
  create(@Body() createZayavkaDto: CreateZayavkaDto) {
    return this.zayavkaService.create(createZayavkaDto);
  }

  @Put(':id')
  put(@Param('id') id: string, @Body() createZayavkaDto: CreateZayavkaDto) {
    return this.zayavkaService.put(Number(id), createZayavkaDto);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.zayavkaService.get(Number(id));
  }

  @Get()
  findAll() {
    return this.zayavkaService.getAll();
  }
}
