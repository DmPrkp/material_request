import { describe, expect, it } from 'vitest';

import type { CompanyRole } from '~/db/schema';
import { createCompanySchema, memberRolesSchema, updateCompanySchema } from './companies.dto';
import {
  type Actor,
  canChangeMember,
  canDeleteCompany,
  canEditCompany,
  canView,
  grantableRoles,
} from './roles';

const actor = (roles: CompanyRole[], id = 7): Actor => ({ user: { id, role: 'USER' }, roles });
const owner = actor(['own']);
const manager = actor(['manage']);
const reviewer = actor(['review', 'store']);
const stranger = actor([]);
const admin: Actor = { user: { id: 1, role: 'ADMIN' }, roles: [] };

describe('права на компанию', () => {
  it('видят участники с любой ролью и админ, остальные — нет', () => {
    expect([owner, manager, reviewer, admin].every(canView)).toBe(true);
    expect(canView(stranger)).toBe(false);
  });

  it('переименовывают владелец и управляющий', () => {
    expect([owner, manager, admin].every(canEditCompany)).toBe(true);
    expect(canEditCompany(reviewer)).toBe(false);
  });

  it('удаляет только владелец (и админ)', () => {
    expect(canDeleteCompany(owner)).toBe(true);
    expect(canDeleteCompany(admin)).toBe(true);
    expect(canDeleteCompany(manager)).toBe(false);
  });

  it('управляющий раздаёт только review и store', () => {
    expect(grantableRoles(manager)).toEqual(['review', 'store']);
    expect(grantableRoles(owner)).toEqual(['own', 'manage', 'review', 'store']);
    expect(grantableRoles(reviewer)).toEqual([]);
  });
});

describe('canChangeMember', () => {
  it('владелец добавляет управляющего и передаёт владение', () => {
    expect(canChangeMember(owner, 9, [], ['manage'])).toBe(true);
    expect(canChangeMember(owner, 9, ['manage'], ['own'])).toBe(true);
  });

  it('управляющий добавляет кладовщика, но не второго управляющего', () => {
    expect(canChangeMember(manager, 9, [], ['store'])).toBe(true);
    expect(canChangeMember(manager, 9, [], ['manage'])).toBe(false);
    expect(canChangeMember(manager, 9, [], ['own'])).toBe(false);
  });

  it('управляющий правит хранение у владельца, не трогая его own', () => {
    expect(canChangeMember(manager, 9, ['own'], ['own', 'store'])).toBe(true);
    expect(canChangeMember(manager, 9, ['own', 'store'], ['store'])).toBe(false);
  });

  it('управляющий убирает проверяющего, но не другого управляющего', () => {
    expect(canChangeMember(manager, 9, ['review'], [])).toBe(true);
    expect(canChangeMember(manager, 9, ['manage'], [])).toBe(false);
  });

  it('управляющий не повышает себя до владельца', () => {
    expect(canChangeMember(manager, 7, ['manage'], ['manage', 'own'])).toBe(false);
  });

  it('выйти из компании может кто угодно из участников', () => {
    expect(canChangeMember(reviewer, 7, ['review', 'store'], [])).toBe(true);
    expect(canChangeMember(manager, 7, ['manage'], [])).toBe(true);
  });

  it('проверяющий чужие роли не трогает', () => {
    expect(canChangeMember(reviewer, 9, [], ['store'])).toBe(false);
    expect(canChangeMember(reviewer, 9, ['store'], [])).toBe(false);
  });

  it('админ может всё', () => {
    expect(canChangeMember(admin, 9, [], ['own'])).toBe(true);
    expect(canChangeMember(admin, 9, ['own'], [])).toBe(true);
  });
});

describe('схемы компании', () => {
  it('название обязательно и обрезается', () => {
    expect(createCompanySchema.safeParse({}).success).toBe(false);
    expect(createCompanySchema.safeParse({ name: '   ' }).success).toBe(false);
    expect(createCompanySchema.parse({ name: '  ООО Ромашка ' })).toEqual({ name: 'ООО Ромашка' });
  });

  it('владельца и даты из тела не принимает — 400, а не молчаливая подмена', () => {
    expect(createCompanySchema.safeParse({ name: 'Ромашка', ownerId: 8 }).success).toBe(false);
    expect(updateCompanySchema.safeParse({ createdAt: '2026-01-01' }).success).toBe(false);
  });

  it('правка может не трогать ничего', () => {
    expect(updateCompanySchema.parse({})).toEqual({});
  });
});

describe('схема ролей участника', () => {
  it('убирает повторы и упорядочивает', () => {
    expect(memberRolesSchema.parse({ roles: ['store', 'own', 'store'] })).toEqual({
      roles: ['own', 'store'],
    });
  });

  it('пустой набор и незнакомые роли — отказ', () => {
    expect(memberRolesSchema.safeParse({ roles: [] }).success).toBe(false);
    expect(memberRolesSchema.safeParse({ roles: ['boss'] }).success).toBe(false);
    expect(memberRolesSchema.safeParse({}).success).toBe(false);
  });
});
