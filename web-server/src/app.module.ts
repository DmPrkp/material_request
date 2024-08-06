import { Module } from '@nestjs/common';
import { MainMenuModule } from './module.main-menu/main-menu.module';
import { SystemComponentsModule } from './module.components/components.module';
import { CalcModule } from './module.calc/calc.module';
@Module({
  imports: [MainMenuModule, SystemComponentsModule, CalcModule],
})
export class AppModule {}
