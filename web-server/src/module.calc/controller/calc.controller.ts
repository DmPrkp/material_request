import { Controller, Post, Param, Body } from '@nestjs/common';
import { CalcRepositories } from '../repositories/calc.repository';
import { CalcResponseDTO, CalcRequestDTO } from '../types';
import { SystemValidationPipe } from '~/validation/system.pipe';

@Controller('calc/:system')
export class CalcController {
  constructor(private readonly calcRepositories: CalcRepositories) {}

  @Post()
  async calc(
    @Param('system', SystemValidationPipe) system: string,
    @Body() reqData: CalcRequestDTO,
  ): Promise<CalcResponseDTO[]> {
    return this.calcRepositories.getComponents(system, reqData);
  }
}
