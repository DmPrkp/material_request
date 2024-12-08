import { Controller, Post, Param, Body } from '@nestjs/common';
import { CalcRequestDTO, CalcResponseDTO } from '../types';
import { SystemValidationPipe } from '~/validation/system.pipe';
import { CalcService } from '../services/calc.service';

@Controller('calc/:system')
export class CalcController {
  constructor(private readonly calcService: CalcService) {}

  @Post()
  async calc(
    @Param('system', SystemValidationPipe) system: string,
    @Body() reqData: CalcRequestDTO,
  ): Promise<CalcResponseDTO[]> {
    return this.calcService.calculateMatList(reqData);
  }
}
