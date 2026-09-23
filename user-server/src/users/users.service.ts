import { ConflictException, Inject, Injectable } from '@nestjs/common';
import { asc, eq, inArray } from 'drizzle-orm';

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
}
