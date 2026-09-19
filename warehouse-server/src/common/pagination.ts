import { z } from 'zod';

export const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(200).default(50),
  /** Подстрока для поиска по названиям. */
  q: z.string().trim().min(1).max(100).optional(),
  /** По умолчанию скрываем мягко удалённые позиции. */
  state: z.enum(['active', 'archived', 'all']).default('active'),
});

export type ListQuery = z.infer<typeof listQuerySchema>;

export type Page<T> = {
  items: T[];
  total: number;
  page: number;
  limit: number;
  pages: number;
};

export function toPage<T>(items: T[], total: number, query: ListQuery): Page<T> {
  return {
    items,
    total,
    page: query.page,
    limit: query.limit,
    pages: Math.max(1, Math.ceil(total / query.limit)),
  };
}
