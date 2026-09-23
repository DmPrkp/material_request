/** Роли участника компании — зеркало company-server/src/db/schema.ts (COMPANY_ROLES). */
export type CompanyRole = "own" | "manage" | "review" | "store";

/** Компания глазами спрашивающего: roles — его роли в ней. */
export type Company = {
  id: number;
  name: string;
  roles: CompanyRole[];
  createdAt: string;
  updatedAt: string;
};

/** Участник компании: имени здесь нет — оно у user-server (UserModel.names). */
export type CompanyMember = {
  userId: number;
  roles: CompanyRole[];
  createdAt: string;
};

export type CompanyPage = {
  items: Company[];
  total: number;
  page: number;
  limit: number;
  pages: number;
};
