import { companyName } from '../lib/fixtures.mjs';

const COMPANIES = '/company/api/v1/companies';

// Наборы ролей рядовых участников: own раздаёт только владелец, и второй владелец демо ни к чему.
const MEMBER_ROLES = [['manage'], ['review'], ['store'], ['store'], ['review', 'store'], ['manage', 'store']];

/** В сколько первых компаний добавить аккаунты из --join. */
const JOINED_COMPANIES = 5;

/**
 * Компания i принадлежит ownerOf(i) (seed.mjs: по умолчанию всё — первому пользователю),
 * к ней — 2–5 других участников.
 * Уже заведённую находим по названию среди компаний владельца; роли участников PUT
 * заменяет целиком, так что повторный прогон их не дублирует.
 *
 * join — существующие аккаунты (например, админ): управляющими в первые компании,
 * чтобы демо-данные было видно из своего аккаунта. Одного членства мало — список
 * складов показывает свои и назначенные, назначает склад (warehouses.mjs).
 */
export async function ensureCompanies(api, random, { count, users, ownerOf, join }) {
  const companies = [];
  let created = 0;

  for (let i = 0; i < count; i++) {
    const owner = ownerOf(i);
    const name = companyName(i);
    const others = users.filter((u) => u.id !== owner.id);
    // Случайное тянем всегда, даже если компания уже есть, — иначе следующие разъедутся.
    const members = random.sample(others, random.int(2, 5)).map((user) => ({
      user,
      roles: random.pick(MEMBER_ROLES),
    }));

    const auth = { token: owner.token };
    const found = await api.get(`${COMPANIES}?q=${encodeURIComponent(name)}&limit=200`, auth);
    let company = found.items.find((c) => c.name === name && c.roles.includes('own'));
    if (!company) {
      company = await api.post(COMPANIES, { name }, auth);
      created++;
    }

    for (const { user, roles } of members) {
      await api.put(`${COMPANIES}/${company.id}/members/${user.id}`, { roles }, auth);
    }
    const joined = i < JOINED_COMPANIES ? join : [];
    for (const user of joined) {
      await api.put(`${COMPANIES}/${company.id}/members/${user.id}`, { roles: ['manage'] }, auth);
    }

    companies.push({ id: company.id, name, owner, members, joined });
  }

  return { companies, created };
}
