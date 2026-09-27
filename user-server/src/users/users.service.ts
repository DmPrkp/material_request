import { ConflictException, Inject, Injectable } from '@nestjs/common';
import { and, asc, eq, inArray, isNotNull } from 'drizzle-orm';

import { type Database, DB } from '~/db/db.module';
import { type NewUser, type User, users } from '~/db/schema';

/** Drizzle заворачивает ошибку pg в свою — настоящая с кодом лежит в cause. */
function isUniqueViolation(error: unknown): boolean {
  for (let e = error, depth = 0; e && typeof e === 'object' && depth < 4; depth++) {
    if ((e as { code?: unknown }).code === '23505') return true;
    e = (e as { cause?: unknown }).cause;
  }
  return false;
}

@Injectable()
export class UsersService {
  constructor(@Inject(DB) private readonly db: Database) {}

  // Занятый логин ловим на самой вставке, а не проверкой перед ней: между SELECT
  // и INSERT успевал проскочить параллельный запрос с тем же логином и падал в 500.
  // Свой 409, а не общий PgConstraintFilter: клиенту нужен понятный текст про логин.
  async create(data: NewUser): Promise<User> {
    try {
      const [user] = await this.db.insert(users).values(data).returning();
      return user;
    } catch (error) {
      if (isUniqueViolation(error)) throw new ConflictException('User with this login already exists');
      throw error;
    }
  }

  async findByLogin(login: string): Promise<User | null> {
    const [user] = await this.db.select().from(users).where(eq(users.login, login));
    return user ?? null;
  }

  /**
   * Только подтверждённый адрес: по неподтверждённому восстановление не работает,
   * иначе опечатка в чужой почте отдавала бы аккаунт её владельцу. Частичный уникальный
   * индекс гарантирует, что подтверждённый адрес принадлежит ровно одному.
   */
  async findByVerifiedEmail(email: string): Promise<User | null> {
    const [user] = await this.db
      .select()
      .from(users)
      .where(and(eq(users.email, email), isNotNull(users.emailVerifiedAt)));
    return user ?? null;
  }

  async findById(id: number): Promise<User | null> {
    const [user] = await this.db.select().from(users).where(eq(users.id, id));
    return user ?? null;
  }

  findByIds(ids: number[]): Promise<User[]> {
    return this.db.select().from(users).where(inArray(users.id, ids)).orderBy(asc(users.id));
  }

  findAll(): Promise<User[]> {
    return this.db.select().from(users).orderBy(asc(users.id));
  }

  async updatePassword(id: number, passwordHash: string): Promise<void> {
    await this.db.update(users).set({ password: passwordHash }).where(eq(users.id, id));
  }

  /**
   * Смена адреса всегда сбрасывает подтверждение: новый адрес надо подтвердить заново,
   * иначе им можно было бы забрать чужой аккаунт, вписав чужую почту.
   */
  async updateEmail(id: number, email: string | null): Promise<User> {
    const [user] = await this.db
      .update(users)
      .set({ email, emailVerifiedAt: null })
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  /** Отметка подтверждения. Уникальность среди подтверждённых проверяет база — 409. */
  async markEmailVerified(id: number): Promise<User> {
    const [user] = await this.db
      .update(users)
      .set({ emailVerifiedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  async updateProfile(id: number, data: Pick<NewUser, 'firstName' | 'lastName'>): Promise<User> {
    const [user] = await this.db.update(users).set(data).where(eq(users.id, id)).returning();
    return user;
  }
}
