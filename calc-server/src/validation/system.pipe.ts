import { PipeTransform, Injectable, BadRequestException } from '@nestjs/common';
import { SYSTEMS } from '~/constants/systems';

@Injectable()
export class SystemValidationPipe implements PipeTransform {
  transform(value: unknown) {
    const system = SYSTEMS.find((s) => s.title === value);
    if (system) return value;
    else throw new BadRequestException('Система не найдена!');
  }
}
