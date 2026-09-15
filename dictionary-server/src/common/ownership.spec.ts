import { ForbiddenException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';

import type { AuthUser } from '~/auth/jwt-payload';
import { assertCanModify, authorshipFor, canModify, canSee, copyable, type Owned } from './ownership';

const admin: AuthUser = { id: 1, login: 'admin', role: 'ADMIN' };
const ivan: AuthUser = { id: 7, login: 'ivan', role: 'USER' };
const petr: AuthUser = { id: 8, login: 'petr', role: 'USER' };

const seed: Owned = { createdBy: null, isShared: true };
const byAdmin: Owned = { createdBy: 1, isShared: true };
const ivans: Owned = { createdBy: 7, isShared: false };

describe('canSee', () => {
  it('общее видят все, включая анонима', () => {
    for (const user of [undefined, ivan, admin]) {
      expect(canSee(seed, user)).toBe(true);
      expect(canSee(byAdmin, user)).toBe(true);
    }
  });

  it('личное видят только автор и админ', () => {
    expect(canSee(ivans, ivan)).toBe(true);
    expect(canSee(ivans, admin)).toBe(true);
    expect(canSee(ivans, petr)).toBe(false);
    expect(canSee(ivans, undefined)).toBe(false);
  });
});

describe('canModify', () => {
  it('админ правит и удаляет всё — и сиды, и чужое личное', () => {
    expect(canModify(seed, admin)).toBe(true);
    expect(canModify(ivans, admin)).toBe(true);
  });

  it('пользователь — только своё: общее у него уходит в копию, а не правится', () => {
    expect(canModify(ivans, ivan)).toBe(true);
    expect(canModify(seed, ivan)).toBe(false);
    expect(canModify(byAdmin, ivan)).toBe(false);
    expect(canModify(ivans, petr)).toBe(false);
  });

  it('аноним ничего', () => {
    expect(canModify(seed, undefined)).toBe(false);
  });

  it('удалить чужое — 403', () => {
    expect(() => assertCanModify(byAdmin, ivan)).toThrow(ForbiddenException);
    expect(() => assertCanModify(ivans, ivan)).not.toThrow();
  });
});

describe('authorshipFor', () => {
  it('у админа новое сразу общее, у пользователя — личное', () => {
    expect(authorshipFor(admin)).toEqual({ createdBy: 1, isShared: true });
    expect(authorshipFor(ivan)).toEqual({ createdBy: 7, isShared: false });
  });
});

describe('copyable', () => {
  it('копия не тащит id и даты оригинала', () => {
    const row = { id: 5, createdAt: new Date(), updatedAt: new Date(), nameRu: 'шпатель', isShared: true };
    expect(copyable(row)).toEqual({ nameRu: 'шпатель', isShared: true });
  });
});
