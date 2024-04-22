import { Controller, Get, Param } from '@nestjs/common';

@Controller(':system/:components')
export class SystemComponentsController {
  @Get()
  findAll(
    @Param('system') system: string,
    @Param('components') components: string,
  ): Array<object> {
    return [{}];
  }
}
