import { describe, expect, it } from 'vitest';

import { BadRequestException } from '@nestjs/common';
import type { User } from '~/db/schema';
import { parseIds, toUserName, USER_NAMES_LIMIT } from './user-name';

describe('имена пользователей', () => {
  it('разбирает ?ids= и схлопывает повторы', () => {
    expect(parseIds('3,1,3')).toEqual([3, 1]);
    expect(parseIds(' 2 , 5 ')).toEqual([2, 5]);
  });

  it('пусто, мусор, ноль и дроби — 400', () => {
    for (const raw of [undefined, '', '1,x', '0', '1.5', '-2']) {
      expect(() => parseIds(raw)).toThrow(BadRequestException);
    }
  });

  it('больше лимита за раз — 400', () => {
    const ids = Array.from({ length: USER_NAMES_LIMIT + 1 }, (_, i) => i + 1).join(',');
    expect(() => parseIds(ids)).toThrow(BadRequestException);
  });

  it('наружу — только id и имя, без логина и хеша', () => {
    const user: User = {
      id: 4,
      login: 'ivan',
      password: 'hash',
      firstName: 'Иван',
      lastName: null,
      role: 'USER',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    expect(toUserName(user)).toEqual({ id: 4, firstName: 'Иван', lastName: null });
  });
});
