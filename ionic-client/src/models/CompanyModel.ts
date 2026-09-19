import BaseModel from "./BaseModel";
import type { Company, CompanyPage } from "@/types/dto";

/** Больше, чем компаний у одного человека, быть не должно; страниц в настройках нет. */
const COMPANIES_LIMIT = 200;

export default class CompanyModel extends BaseModel {
  static apiVersion = "/company/api/v1";

  /** Компании, где пользователь участник. undefined — не достучались (get глотает ошибку). */
  static async listMine(): Promise<Company[] | undefined> {
    const page = await this.get<CompanyPage>(`/companies?limit=${COMPANIES_LIMIT}`);
    return page?.items;
  }

  /** Создатель сразу владелец (own) — это делает сервис. */
  static create(name: string) {
    return this.post<Company>({ params: "/companies", body: { name } });
  }
}
