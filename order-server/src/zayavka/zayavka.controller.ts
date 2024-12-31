import { Controller, Post, Body, Get, Param } from '@nestjs/common';
import { ZayavkaService } from './zayavka.service';
import { CreateZayavkaDto } from './dto/create-zayavka.dto';

@Controller('zayavka')
export class ZayavkaController {
  constructor(private readonly zayavkaService: ZayavkaService) {}

  @Post()
  create(@Body() createZayavkaDto: CreateZayavkaDto) {
    return this.zayavkaService.create(createZayavkaDto);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.zayavkaService.findOne(Number(id));
  }

  @Get()
  findAll() {
    return this.zayavkaService.findAll();
  }
}
