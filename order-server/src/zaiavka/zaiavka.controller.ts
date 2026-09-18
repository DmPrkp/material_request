import { Controller, Post, Body, Get, Param, Put } from '@nestjs/common';
import { ZaiavkaService } from './zaiavka.service';
import { CreateZaiavkaDto } from '../types/index';

@Controller('zaiavka')
export class ZaiavkaController {
  constructor(private readonly zaiavkaService: ZaiavkaService) {}

  @Post()
  create(@Body() createZaiavkaDto: CreateZaiavkaDto) {
    return this.zaiavkaService.create(createZaiavkaDto);
  }

  @Put(':id')
  put(@Param('id') id: string, @Body() createZaiavkaDto: CreateZaiavkaDto) {
    return this.zaiavkaService.put(Number(id), createZaiavkaDto);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.zaiavkaService.get(Number(id));
  }

  @Get()
  findAll() {
    return this.zaiavkaService.getAll();
  }
}
