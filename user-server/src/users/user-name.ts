import { BadRequestException } from '@nestjs/common';
import type { User } from '~/db/schema';

/**
 * Имя пользователя для чужих глаз — кому выдан инструмент, кто участник компании.
 * Только имя: логин — половина входа, и незачем раздавать его всем, кто знает id.
 */
export type UserName = Pick<User, 'id' | 'firstName' | 'lastName'>;

export function toUserName(user: User): UserName {
  return { id: user.id, firstName: user.firstName, lastName: user.lastName };
}

/** Больше, чем людей в одной компании на экране, за раз не просят. */
export const USER_NAMES_LIMIT = 200;

/** `?ids=1,2,3` → [1, 2, 3]; повторы схлопываются, мусор — 400, а не молчаливый пропуск. */
export function parseIds(raw: string | undefined): number[] {
  const parts = (raw ?? '').split(',').filter((part) => part.trim() !== '');
  const ids = parts.map((part) => Number(part));
  if (!ids.length || ids.some((id) => !Number.isInteger(id) || id <= 0)) {
    throw new BadRequestException('ids — список положительных целых через запятую');
  }
  const unique = [...new Set(ids)];
  if (unique.length > USER_NAMES_LIMIT) {
    throw new BadRequestException(`Не больше ${USER_NAMES_LIMIT} id за раз`);
  }
  return unique;
}
