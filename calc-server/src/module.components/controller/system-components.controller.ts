import { Controller, Get, Param } from '@nestjs/common';
import { SystemComponentsRepositories } from '../repositories/system-components.repository';
import { ComponentDTO } from '../types/main-menu';
import { SystemValidationPipe } from '~/validation/system.pipe';

@Controller(':workType/:system')
export class SystemComponentsController {
  constructor(
    private readonly systemComponentsRepositories: SystemComponentsRepositories,
  ) {}

  @Get()
  async findAll(
    @Param('system', SystemValidationPipe) system: string,
  ): Promise<ComponentDTO[]> {
    return this.systemComponentsRepositories.getComponents(system);
  }
}
