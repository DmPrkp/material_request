import { createZodDto } from 'nestjs-zod';

import { listQuerySchema } from './pagination';

export class ListQueryDto extends createZodDto(listQuerySchema) {}
