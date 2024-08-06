import { Controller, Post, Param } from '@nestjs/common';
import { CalcRepositories } from '../repositories/calc.repository';
import { CalcDTO } from '../types';
import { SystemValidationPipe } from '~/validation/system.pipe';

@Controller('calc/:system')
export class CalcController {
  constructor(private readonly calcRepositories: CalcRepositories) {}

  @Post()
  async findAll(
    @Param('system', SystemValidationPipe) system: string,
  ): Promise<CalcDTO[]> {
    return this.calcRepositories.getComponents(system);
  }
}
