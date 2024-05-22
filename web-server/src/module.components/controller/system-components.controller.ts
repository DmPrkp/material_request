import { Controller, Get, Param } from '@nestjs/common';
import { SystemComponentsRepositories } from '../repositories/system-components.repository';

@Controller(':workType/:system')
export class SystemComponentsController {
  constructor(
    private readonly systemComponentsRepositories: SystemComponentsRepositories,
  ) {}

  @Get()
  async findAll(
    @Param('workType') workType: string,
    @Param('system') system: string,
  ): Promise<any> {
    const test = await this.systemComponentsRepositories.getComponents(system);
    return [test];
  }
}
