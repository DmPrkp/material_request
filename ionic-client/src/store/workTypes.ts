import { defineStore } from "pinia";
import DictionaryModel from "@/models/DictionaryModel";
import type { DictionaryWorkType } from "@/types/dto";

/**
 * Виды работ из словаря — одни на плитку /catalog/systems и на страницу технологий.
 *
 * Под /catalog/systems/facade монтируются обе страницы сразу (плитка — родитель,
 * технологии — ребёнок в её router-view), и каждая грузила список сама: на
 * обновление страницы уходило два одинаковых запроса. Здесь запрос один на язык —
 * имена приходят уже переведёнными, поэтому кэш привязан к языку, а одновременные
 * вызовы ждут один и тот же запрос.
 */
type Inflight = { locale: string; promise: Promise<void> };
let inflight: Inflight | null = null;

export const useWorkTypesStore = defineStore("work-types", {
  state: () => ({
    items: [] as DictionaryWorkType[],
    /** На каком языке лежит items; null — ещё не грузили или не смогли. */
    locale: null as string | null,
  }),
  actions: {
    /** force — для «потянуть, чтобы обновить»; иначе отдаём то, что уже есть. */
    async load(locale: string, force = false): Promise<DictionaryWorkType[]> {
      if (!force && this.locale === locale) return this.items;

      let current = inflight;
      if (force || !current || current.locale !== locale) {
        const request: Inflight = { locale, promise: Promise.resolve() };
        request.promise = DictionaryModel.workTypes()
          .then((page) => {
            // get() глотает сетевую ошибку — оставляем, что было. Ответ, который
            // обогнали (сменили язык, пока шёл), тоже не кладём.
            if (page && inflight === request) {
              this.items = page.items;
              this.locale = locale;
            }
          })
          .finally(() => {
            if (inflight === request) inflight = null;
          });
        inflight = request;
        current = request;
      }

      await current.promise;
      return this.items;
    },
  },
});
