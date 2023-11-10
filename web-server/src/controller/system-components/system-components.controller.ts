import {
  Controller,
  Get,
  HttpException,
  HttpStatus,
  Param,
} from '@nestjs/common';
import SystemComponentsRepositories from '../../repositories/system-components';

@Controller(':system/:components')
export class SystemComponentsController {
  @Get()
  findAll(
    @Param('system') system: string,
    @Param('components') components: string,
  ): Array<object> {
    const systemRepositories = SystemComponentsRepositories.factory();
    const component = systemRepositories.getComponents(system, components);
    if (component instanceof Error) {
      console.error('BadRequestException', component);
      throw new HttpException('BadRequestException', HttpStatus.BAD_REQUEST);
    }
    return component;
  }
}
