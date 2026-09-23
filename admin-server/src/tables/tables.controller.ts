import { Controller, Get, Param } from '@nestjs/common';

import { TablesService } from './tables.service';

@Controller('tables')
export class TablesController {
  constructor(private readonly tables: TablesService) {}

  @Get()
  list() {
    return this.tables.list();
  }

  @Get(':key')
  rows(@Param('key') key: string) {
    return this.tables.rows(key);
  }
}
