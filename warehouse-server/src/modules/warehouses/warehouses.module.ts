import { Module } from '@nestjs/common';

import { CompanyClient } from './company.client';
import { WarehouseItemsController } from './items.controller';
import { WarehouseItemsService } from './items.service';
import { WarehousesController } from './warehouses.controller';
import { WarehousesService } from './warehouses.service';

@Module({
  controllers: [WarehousesController, WarehouseItemsController],
  providers: [WarehousesService, WarehouseItemsService, CompanyClient],
})
export class WarehousesModule {}
