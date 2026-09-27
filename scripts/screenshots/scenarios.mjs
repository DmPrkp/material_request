/**
 * Сценарии главной: id — папка в public/landing, шаги — по скриншоту на каждый.
 * Порядок шагов и их число должны совпадать с LANDING_SCENARIOS в клиенте
 * (ionic-client/src/constants/landing.ts): карточка берёт n-й файл по номеру шага.
 *
 * Шаг получает { page, go, t, locale, api, state }: go — переход с префиксом локали
 * (открытые модалки закрывает), t — строка из словарей клиента (кнопки ищем по тексту,
 * у них нет устойчивых классов), api — GET с токеном, state — общее между сценариями
 * одного прогона.
 */

// Технология из сидов словаря — у неё есть нормы. id в сидах явные (на них
// ссылаются другие базы), поэтому по ним можно ходить прямо адресом.
const WORK_TYPE = 'interior';
const SYSTEM = 'GKL_C112';
const TECHNOLOGY_ID = 3;
const FRAME_STAGE_ID = 11;
// Бур по бетону: у него видно несколько типоразмеров с кодами сборок.
const DRILL_MATERIAL_ID = 13;

/**
 * Значение в ion-input — событием, а не fill(): фокус на «телефоне» включает
 * scroll assist Ionic, страница уезжает к полю, и заголовок не попадает в кадр.
 */
async function setIonInput(page, selector, value) {
  await page.locator(selector).evaluate((el, v) => {
    el.value = v;
    el.dispatchEvent(new CustomEvent('ionInput', { detail: { value: v } }));
  }, value);
}

/**
 * Открытая модалка. last(): закрытые модалки остаются в DOM, а открытая —
 * последняя. Ждём её содержимое и конец анимации выезда, иначе кадр ловит полпути.
 */
async function openedModal(page, content) {
  const modal = page.locator('ion-modal.show-modal').last();
  await modal.locator(content).first().waitFor();
  await page.waitForTimeout(600);
  return modal;
}

/** Прокрутить видимую страницу Ionic: прокручивает ion-content, а не window. */
async function scrollToBottom(page) {
  await page.locator('ion-content:visible').last().evaluate((el) => el.scrollToBottom(0));
}

export const SCENARIOS = [
  {
    id: 'zayavka',
    steps: [
      // Плитка видов работ, а не группа: в группе пока одна технология, и экран пустой.
      async ({ go }) => {
        await go('/zayavka/calculator');
      },
      async ({ page, go }) => {
        await go(`/zayavka/calculator/${WORK_TYPE}/${SYSTEM}`);
        // Круглые 100 м² по умолчанию выглядят заглушкой — ставим правдоподобный объём.
        await setIonInput(page, 'ion-input.full-volume-block_input', '36');
        await setIonInput(page, '.crew-item ion-input', '2');
      },
      async ({ page, go, t, state }) => {
        // Расчёт сам сохраняется заявкой. Первый раз за прогон жмём «Рассчитать» и
        // запоминаем адрес с id заявки, дальше открываем его: иначе каждая
        // локаль и тема заводили бы у демо-пользователя ещё одну заявку.
        if (state.materialList) {
          await go(state.materialList);
        } else {
          await page.getByText(t('pages.components.send'), { exact: true }).click();
          await page.waitForURL(/\/materialList\?.*zayavka=\d+/);
          const url = new URL(page.url());
          state.zayavkaId = url.searchParams.get('zayavka');
          state.materialList = url.pathname.replace(/^\/[^/]+/, '') + url.search;
        }
      },
    ],
  },
  {
    id: 'transfer',
    steps: [
      async ({ go }) => {
        await go('/zayavka');
      },
      // Внизу заявки — ссылка в мессенджеры и выгрузка .ods, над меню — «на склад».
      async ({ page, go, state }) => {
        if (!state.zayavkaId) throw new Error('transfer показывает заявку из zayavka — запускайте вместе');
        await go(`/zayavka/${state.zayavkaId}`);
        await page.waitForLoadState('networkidle');
        await scrollToBottom(page);
      },
      // Только выбор склада, не добавление: иначе каждый прогон удваивал бы остатки.
      async ({ page, t }) => {
        await page.getByText(t('pages.warehouses.add_items'), { exact: true }).click();
        await openedModal(page, 'ion-item');
      },
    ],
  },
  {
    id: 'warehouse',
    steps: [
      async ({ go }) => {
        await go('/warehouses');
      },
      async ({ page, go, api, state }) => {
        // Склад компании, не личный: выдавать на руки можно только участникам компании.
        if (!state.warehouseId) {
          const { items } = await api('/warehouse/api/v1/warehouses');
          const warehouse = items.find((w) => w.companyId && !w.holderUserId && w.counts.material > 1);
          if (!warehouse) throw new Error('Нет склада компании с материалами — засейте демо-данные');
          state.warehouseId = warehouse.id;
        }
        await go(`/warehouses/${state.warehouseId}`);
        await page.waitForLoadState('networkidle');
        const rows = page.locator('ion-content:visible ion-item[role="checkbox"]');
        await rows.nth(0).click();
        await rows.nth(1).click();
      },
      // Модалку выдачи не подтверждаем: выданное ушло бы со склада насовсем.
      async ({ page, t }) => {
        await page.getByText(t('pages.warehouses.issue_items'), { exact: true }).click();
        // Список получателей приходит от company-server уже после открытия. Проп button
        // у ion-item атрибутом не становится — кликабельные строки видно по классу.
        const modal = await openedModal(page, 'ion-list ion-item.ion-activatable');
        await modal.locator('ion-list ion-item.ion-activatable').first().click();
      },
    ],
  },
  {
    id: 'catalog',
    steps: [
      async ({ go }) => {
        await go('/catalog/materials');
      },
      async ({ page }) => {
        await page.waitForLoadState('networkidle');
        // value у ion-accordion — проп, а не атрибут: селектором [value] не найти.
        await page.evaluate((id) => {
          const accordion = [...document.querySelectorAll('ion-accordion')].find((a) => a.value === id);
          accordion?.querySelector('ion-item[slot="header"]')?.click();
        }, String(DRILL_MATERIAL_ID));
        await page.waitForLoadState('networkidle');
      },
      // Форму не сохраняем: позиция завелась бы в словаре на каждый прогон.
      async ({ page, t, locale }) => {
        await page.getByText(t('pages.catalog.add_material'), { exact: true }).click();
        const modal = await openedModal(page, 'ion-input input');
        await modal.locator('ion-input input').first().fill(locale === 'ru' ? 'Анкер-клин' : 'Wedge anchor');
        await page.evaluate(() => document.activeElement?.blur());
      },
    ],
  },
  {
    id: 'technology',
    steps: [
      async ({ go }) => {
        await go(`/catalog/systems/${WORK_TYPE}/${TECHNOLOGY_ID}`);
      },
      async ({ go }) => {
        await go(`/catalog/systems/${WORK_TYPE}/${TECHNOLOGY_ID}/stages/${FRAME_STAGE_ID}`);
      },
      // Примечание к норме — откуда она взята; у стоечного профиля — шаг стоек.
      async ({ page, t }) => {
        await page.waitForLoadState('networkidle');
        await page.getByLabel(t('pages.catalog.norms.note')).nth(1).click();
      },
    ],
  },
];
