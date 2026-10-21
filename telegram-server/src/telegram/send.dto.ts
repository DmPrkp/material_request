import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const SendSchema = z.object({
  chatId: z.union([z.number().int(), z.string().min(1)]),
  text: z.string().min(1).max(4096),
});

export class SendDto extends createZodDto(SendSchema) {}
