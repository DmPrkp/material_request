import { Body, Controller, Post } from '@nestjs/common';
import { CreateZayavkaDto } from './types';

@Controller('zayavka')
export class ZayavkaController {
  @Post()
  create(@Body() createZayavkaDto: CreateZayavkaDto) {
    console.log(createZayavkaDto);
    return { uuid: createZayavkaDto.uuid };
  }
}
