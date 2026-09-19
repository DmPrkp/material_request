import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

import { COMPANY_ROLES } from '~/db/schema';
import { normalizeRoles } from './roles';

// Участников, id и дат в теле нет: создатель — из заголовков nginx, остальное ведёт сервис.
// strict — чтобы попытка прислать лишнее поле падала 400, а не молча отбрасывалась.
const companyFields = z.strictObject({
  name: z.string().trim().min(1).max(200),
});

export const createCompanySchema = companyFields;
export const updateCompanySchema = companyFields.partial();

/**
 * Роли участника — набор целиком: PUT заменяет прежний. Пустой набор не принимается —
 * убрать участника можно только DELETE, чтобы «снять все роли» не значило «выгнать» молча.
 */
export const memberRolesSchema = z.strictObject({
  roles: z.array(z.enum(COMPANY_ROLES)).min(1).transform(normalizeRoles),
});

export class CreateCompanyDto extends createZodDto(createCompanySchema) {}
export class UpdateCompanyDto extends createZodDto(updateCompanySchema) {}
export class MemberRolesDto extends createZodDto(memberRolesSchema) {}
