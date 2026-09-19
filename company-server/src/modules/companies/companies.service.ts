import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, asc, count, eq, ilike, sql, type SQL } from 'drizzle-orm';

import type { AuthUser } from '~/auth/auth-user';
import { type ListQuery, type Page, toPage } from '~/common/pagination';
import { DB, type Database } from '~/db/db.module';
import { type Company, type CompanyMember, type CompanyRole, companies, companyMembers } from '~/db/schema';
import type { CreateCompanyDto, UpdateCompanyDto } from './companies.dto';
import {
  type Actor,
  canChangeMember,
  canDeleteCompany,
  canEditCompany,
  canView,
  normalizeRoles,
} from './roles';

/** Компания глазами спрашивающего: roles — его роли в ней ([] у админа-неучастника). */
export type CompanyView = Company & { roles: CompanyRole[] };

export type MemberView = Omit<CompanyMember, 'companyId'>;

type Tx = Parameters<Parameters<Database['transaction']>[0]>[0];

/**
 * Список — только компании, где спрашивающий участник, и у админа тоже: иначе его
 * собственные тонули бы в чужих. По id админ достаёт и правит любую. Чужая компания
 * остальным — 404, а не 403: незачем подтверждать, что такая есть. Права — roles.ts.
 */
@Injectable()
export class CompaniesService {
  constructor(@Inject(DB) private readonly db: Database) {}

  async list(query: ListQuery, user: AuthUser): Promise<Page<CompanyView>> {
    const where = and(eq(companyMembers.userId, user.id), searchFilter(query.q));

    const [rows, [totals]] = await Promise.all([
      this.db
        .select({ company: companies, roles: companyMembers.roles })
        .from(companies)
        .innerJoin(companyMembers, eq(companyMembers.companyId, companies.id))
        .where(where)
        .orderBy(asc(companies.name), asc(companies.id))
        .limit(query.limit)
        .offset((query.page - 1) * query.limit),
      this.db
        .select({ value: count() })
        .from(companies)
        .innerJoin(companyMembers, eq(companyMembers.companyId, companies.id))
        .where(where),
    ]);

    const items = rows.map(({ company, roles }) => ({ ...company, roles: normalizeRoles(roles) }));
    return toPage(items, Number(totals?.value ?? 0), query);
  }

  async byId(id: number, user: AuthUser): Promise<CompanyView> {
    const { company, actor } = await this.visible(this.db, id, user);
    return { ...company, roles: [...actor.roles] };
  }

  /** Компания и владение её создателя — одной транзакцией: без владельца компании не бывает. */
  async create(dto: CreateCompanyDto, user: AuthUser): Promise<CompanyView> {
    return this.db.transaction(async (tx) => {
      const [company] = await tx.insert(companies).values(dto).returning();
      await tx.insert(companyMembers).values({ companyId: company.id, userId: user.id, roles: ['own'] });
      return { ...company, roles: ['own'] };
    });
  }

  async update(id: number, dto: UpdateCompanyDto, user: AuthUser): Promise<CompanyView> {
    const { company, actor } = await this.visible(this.db, id, user);
    if (!canEditCompany(actor))
      throw new ForbiddenException('Переименовать компанию может владелец или управляющий');
    // Пустое тело — не ошибка, но и UPDATE без SET Drizzle не соберёт.
    if (Object.keys(dto).length === 0) return { ...company, roles: [...actor.roles] };

    const [row] = await this.db.update(companies).set(dto).where(eq(companies.id, id)).returning();
    // Между проверкой и записью компанию могли удалить.
    if (!row) throw notFound(id);
    return { ...row, roles: [...actor.roles] };
  }

  /** Участники уходят вместе с компанией (ON DELETE CASCADE). */
  async remove(id: number, user: AuthUser): Promise<void> {
    const { actor } = await this.visible(this.db, id, user);
    if (!canDeleteCompany(actor)) throw new ForbiddenException('Удалить компанию может только владелец');
    await this.db.delete(companies).where(eq(companies.id, id));
  }

  async members(id: number, user: AuthUser): Promise<MemberView[]> {
    await this.visible(this.db, id, user);
    const rows = await this.db
      .select()
      .from(companyMembers)
      .where(eq(companyMembers.companyId, id))
      .orderBy(asc(companyMembers.createdAt), asc(companyMembers.userId));
    return rows.map(toMemberView);
  }

  /**
   * Добавить участника или заменить ему набор ролей. Пользователя в user-server не
   * проверяем — межсервисных ссылок нет, как и у created_by в словаре: чужой id даст
   * участника, который просто никогда не придёт.
   */
  async setMember(id: number, userId: number, roles: CompanyRole[], user: AuthUser): Promise<MemberView> {
    // id пользователя из user-server — identity с единицы.
    if (userId <= 0) throw new BadRequestException('userId — положительное целое');
    return this.db.transaction(async (tx) => {
      const { actor } = await this.visible(tx, id, user, { lock: true });
      const before = await this.memberRoles(tx, id, userId);
      if (!canChangeMember(actor, userId, before, roles)) throw forbiddenRoles();

      const [row] = await tx
        .insert(companyMembers)
        .values({ companyId: id, userId, roles })
        .onConflictDoUpdate({
          target: [companyMembers.companyId, companyMembers.userId],
          set: { roles, updatedAt: new Date() },
        })
        .returning();

      await this.assertHasOwner(tx, id);
      return toMemberView(row);
    });
  }

  /** Убрать участника; себя — «выйти из компании». */
  async removeMember(id: number, userId: number, user: AuthUser): Promise<void> {
    await this.db.transaction(async (tx) => {
      const { actor } = await this.visible(tx, id, user, { lock: true });
      const before = await this.memberRoles(tx, id, userId);
      if (before.length === 0)
        throw new NotFoundException(`Пользователь ${userId} не участник компании ${id}`);
      if (!canChangeMember(actor, userId, before, [])) throw forbiddenRoles();

      await tx
        .delete(companyMembers)
        .where(and(eq(companyMembers.companyId, id), eq(companyMembers.userId, userId)));
      await this.assertHasOwner(tx, id);
    });
  }

  /**
   * Компания и роли спрашивающего в ней; невидимая — 404.
   *
   * lock — строка компании под FOR UPDATE: правки состава одной компании идут по одной.
   * Иначе два владельца, одновременно снимающие друг с друга own, оба увидели бы
   * «второй владелец есть» — и компания осталась бы без владельца.
   */
  private async visible(
    db: Database | Tx,
    id: number,
    user: AuthUser,
    { lock = false } = {},
  ): Promise<{ company: Company; actor: Actor }> {
    const query = db.select().from(companies).where(eq(companies.id, id)).limit(1);
    const [company] = lock ? await query.for('update') : await query;
    if (!company) throw notFound(id);

    const actor: Actor = { user, roles: await this.memberRoles(db, id, user.id) };
    if (!canView(actor)) throw notFound(id);
    return { company, actor };
  }

  private async memberRoles(db: Database | Tx, companyId: number, userId: number): Promise<CompanyRole[]> {
    const [row] = await db
      .select({ roles: companyMembers.roles })
      .from(companyMembers)
      .where(and(eq(companyMembers.companyId, companyId), eq(companyMembers.userId, userId)))
      .limit(1);
    return row ? normalizeRoles(row.roles) : [];
  }

  /** После правки состава владелец должен остаться — иначе откат всей транзакции. */
  private async assertHasOwner(tx: Tx, companyId: number): Promise<void> {
    const [owners] = await tx
      .select({ value: count() })
      .from(companyMembers)
      .where(
        and(
          eq(companyMembers.companyId, companyId),
          sql`${companyMembers.roles} @> ARRAY['own']::company_role[]`,
        ),
      );
    if (!owners?.value) {
      throw new ConflictException({
        error: 'last_owner',
        message: 'У компании должен остаться владелец: сначала передайте own другому участнику',
      });
    }
  }
}

function toMemberView(member: CompanyMember): MemberView {
  return {
    userId: member.userId,
    roles: normalizeRoles(member.roles),
    createdAt: member.createdAt,
    updatedAt: member.updatedAt,
  };
}

function notFound(id: number): NotFoundException {
  return new NotFoundException(`Компания ${id} не найдена`);
}

function forbiddenRoles(): ForbiddenException {
  return new ForbiddenException(
    'Недостаточно прав: роли review и store раздаёт владелец или управляющий, own и manage — только владелец',
  );
}

function searchFilter(q: string | undefined): SQL | undefined {
  return q ? ilike(companies.name, `%${q}%`) : undefined;
}
