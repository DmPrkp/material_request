import { defineStore } from "pinia";
import CompanyModel from "@/models/CompanyModel";
import type { Company } from "@/types/dto";

/**
 * Текущая компания — одна на всё приложение: склады, «на руках» и выбор склада
 * показывают только её. Личные склады компанией не считаются и выбрать их нельзя:
 * они идут на экране складов отдельным разделом под складами компании.
 *
 * Выбор помнится по пользователю: за одним браузером работают с разных аккаунтов,
 * и чужая компания после входа была бы просто недоступна (сервис ответит 404).
 */
const STORAGE_KEY = "mr-current-company";

/** id текущей компании; null — компаний нет вовсе, остаются только личные склады. */
export type CurrentCompanyId = number | null;

function read(): Record<string, number> {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function write(byUser: Record<string, number>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(byUser));
  } catch (error) {
    console.error("Не удалось запомнить текущую компанию", error);
  }
}

export const useCompanyStore = defineStore("currentCompany", {
  state: () => ({
    companies: [] as Company[],
    /** null — «Личное»; undefined — ещё не выбирали (решит load). */
    currentId: undefined as CurrentCompanyId | undefined,
    /** Чей выбор сейчас помним; сменился пользователь — перечитываем. */
    userId: undefined as number | undefined,
    loaded: false,
  }),

  getters: {
    current(): Company | undefined {
      return this.companies.find((company) => company.id === this.currentId);
    },
    /** В текущей компании можно заводить склады и выдавать. */
    canManageCurrent(): boolean {
      return !!this.current?.roles.some(
        (role) => role === "own" || role === "manage"
      );
    },
  },

  actions: {
    /**
     * Список компаний и текущая. Запомненной нет в списке (вышли из компании) —
     * берём первую: пустой экран без объяснения хуже, чем данные соседней компании.
     */
    async load(userId?: number) {
      const items = await CompanyModel.listMine();
      // Не достучались — оставляем что было: сеть отвалилась, выбор не меняем.
      if (!items) return;

      this.companies = items;
      this.userId = userId;
      this.loaded = true;

      const saved = userId === undefined ? undefined : read()[String(userId)];
      const known = items.some((company) => company.id === saved);
      this.currentId = known ? (saved as number) : (items[0]?.id ?? null);
    },

    /** Только своя компания: чужой или выдуманный id оставил бы экраны без данных. */
    setCurrent(id: CurrentCompanyId) {
      if (id !== null && !this.companies.some((company) => company.id === id)) {
        return;
      }
      this.currentId = id;
      if (this.userId === undefined) return;
      const byUser = read();
      if (id === null) delete byUser[String(this.userId)];
      else byUser[String(this.userId)] = id;
      write(byUser);
    },

    /** Новая компания сразу становится текущей: её и заводят, чтобы в ней работать. */
    add(company: Company) {
      this.companies = [...this.companies, company];
      this.setCurrent(company.id);
    },

    reset() {
      this.companies = [];
      this.currentId = undefined;
      this.userId = undefined;
      this.loaded = false;
    },
  },
});
